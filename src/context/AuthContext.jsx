import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ApiError, authApi, onUnauthorized } from '../api';

// Port of mobile context/auth.tsx.
// Web difference: the token is kept in sessionStorage so a page reload keeps the
// user signed in (closing the tab ends the session). It is re-checked with
// /api/auth/me on startup.

const STORAGE_KEY = 'sportcenter.token';
const OTP_TTL_MS = 5 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;

const storage = {
  get() { try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; } },
  set(token) { try { sessionStorage.setItem(STORAGE_KEY, token); } catch { /* storage blocked */ } },
  clear() { try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ } },
};

const toUser = profile => ({ ...profile, name: profile.email.split('@')[0] });

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { token, user }
  const [ready, setReady] = useState(() => !storage.get()); // false while restoring a saved token
  const [sessionMessage, setSessionMessage] = useState('');
  const [pendingOtp, setPendingOtp] = useState(null); // { email, expiresAt, resendAt }
  const challenge = useRef(null); // pendingOtp + { challengeToken, idToken } — never rendered
  const currentToken = useRef(null);
  const generation = useRef(0); // bumps on every login/logout so stale responses are ignored
  const otpBusy = useRef(false);

  function clearChallenge() { challenge.current = null; setPendingOtp(null); }

  function endSession(message = '') {
    generation.current++;
    currentToken.current = null;
    storage.clear();
    setSession(null);
    setSessionMessage(message);
  }

  // Restore a saved token once on startup.
  useEffect(() => {
    const saved = storage.get();
    if (!saved) return;
    const version = generation.current;
    authApi.me(saved)
      .then(profile => {
        if (version !== generation.current) return;
        if (profile?.status !== 'ACTIVE') { endSession(); return; }
        currentToken.current = saved;
        setSession({ token: saved, user: toUser(profile) });
      })
      .catch(() => { if (version === generation.current) endSession(); })
      .finally(() => setReady(true));
  }, []);

  // Any 401 on the current token ends the session.
  useEffect(() => onUnauthorized(token => {
    if (currentToken.current === token) endSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }), []);

  function startAuthentication() {
    endSession();
    clearChallenge();
    return generation.current;
  }

  async function finishAuthentication(result, version) {
    if (!result?.token) throw new Error('Máy chủ chưa trả về token đăng nhập.');
    const profile = await authApi.me(result.token);
    if (version !== generation.current) throw new Error('Yêu cầu đăng nhập đã bị hủy.');
    if (!profile?.id || !profile.email) throw new Error('Thông tin tài khoản từ máy chủ không hợp lệ.');
    if (profile.status !== 'ACTIVE') throw new Error('Tài khoản chưa hoạt động.');
    currentToken.current = result.token;
    storage.set(result.token);
    setSession({ token: result.token, user: toUser(profile) });
    setSessionMessage('');
    clearChallenge();
    return toUser(profile);
  }

  async function acceptGoogleResult(result, idToken, version, startedAt) {
    if (version !== generation.current) throw new Error('Yêu cầu đăng nhập đã bị hủy.');
    if (!result.requiresOTP) return { status: 'authenticated', user: await finishAuthentication(result, version) };
    const pending = { email: result.email, expiresAt: startedAt + OTP_TTL_MS, resendAt: Date.now() + RESEND_COOLDOWN_MS };
    challenge.current = { ...pending, idToken, challengeToken: result.challengeToken };
    setPendingOtp(pending);
    return { status: 'otp' };
  }

  /** Email + password. Resolves with the signed-in user. */
  async function login(email, password) {
    const version = startAuthentication();
    return finishAuthentication(await authApi.login(email, password), version);
  }

  /** Creates a MEMBER account (does not sign in). */
  async function register(email, password) {
    await authApi.register(email, password);
  }

  /** Resolves { status: 'authenticated', user } or { status: 'otp' } (go to /verify-otp). */
  async function loginGoogle(idToken) {
    const version = startAuthentication();
    const startedAt = Date.now();
    return acceptGoogleResult(await authApi.google(idToken), idToken, version, startedAt);
  }

  async function verifyGoogleOtp(otp) {
    if (otpBusy.current) throw new Error('Yêu cầu đang được xử lý.');
    if (!/^\d{6}$/.test(otp)) throw new Error('Nhập đủ 6 chữ số trong email.');
    const pending = challenge.current;
    if (!pending) throw new Error('Phiên xác minh không còn. Vui lòng đăng nhập Google lại.');
    if (Date.now() >= pending.expiresAt) throw new Error('Mã đã hết hạn. Vui lòng gửi lại mã.');
    const version = generation.current;
    otpBusy.current = true;
    try { return await finishAuthentication(await authApi.verifyGoogleOtp(pending.challengeToken, otp), version); }
    finally { otpBusy.current = false; }
  }

  async function resendGoogleOtp() {
    if (otpBusy.current) throw new Error('Yêu cầu đang được xử lý.');
    const pending = challenge.current;
    if (!pending) throw new Error('Vui lòng đăng nhập Google lại.');
    if (Date.now() < pending.resendAt) throw new Error('Vui lòng đợi trước khi gửi lại mã.');
    const version = generation.current;
    const startedAt = Date.now();
    otpBusy.current = true;
    try {
      return await acceptGoogleResult(await authApi.google(pending.idToken), pending.idToken, version, startedAt);
    } catch (error) {
      // BE rate-limited the resend: restart the cooldown.
      if (error instanceof ApiError && error.status === 429 && challenge.current === pending && version === generation.current) {
        const next = { ...pending, resendAt: Date.now() + RESEND_COOLDOWN_MS };
        challenge.current = next;
        setPendingOtp({ email: next.email, expiresAt: next.expiresAt, resendAt: next.resendAt });
      }
      throw error;
    } finally {
      otpBusy.current = false;
    }
  }

  function cancelGoogleOtp() { generation.current++; clearChallenge(); }

  async function refreshUser() {
    const token = currentToken.current;
    if (!token) return;
    const profile = await authApi.me(token);
    if (currentToken.current !== token) return;
    if (profile.status !== 'ACTIVE') { logout(); throw new Error('Tài khoản chưa hoạt động.'); }
    setSession({ token, user: toUser(profile) });
  }

  function logout() {
    endSession();
    clearChallenge();
  }

  const value = {
    ready,
    token: session?.token ?? null,
    user: session?.user ?? null,
    sessionMessage,
    pendingOtp,
    login, register, loginGoogle, verifyGoogleOtp, resendGoogleOtp, cancelGoogleOtp, refreshUser, logout,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider is required');
  return auth;
}
