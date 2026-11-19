import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { roleHome } from '../../utils/staff-navigation';

// Google Identity Services button. Needs VITE_GOOGLE_CLIENT_ID in .env;
// without it a disabled placeholder is shown.

let scriptPromise = null;
function loadGoogle() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google?.accounts?.id) resolve(window.google);
      else { scriptPromise = null; reject(new Error('Không tải được Google Sign-In.')); }
    };
    script.onerror = () => {
      script.remove();
      scriptPromise = null;
      reject(new Error('Không tải được Google Sign-In. Kiểm tra mạng rồi tải lại trang.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function GoogleLogin({ disabled = false, onBusyChange = () => {} }) {
  const { loginGoogle } = useAuth();
  const navigate = useNavigate();
  const host = useRef(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Google keeps the first callback it was given, so route it through a ref.
  const handler = useRef(() => {});
  useEffect(() => {
    handler.current = async result => {
      if (disabled || pending.current) return;
      if (!result?.credential) { setError('Google chưa trả về ID token.'); return; }
      pending.current = true; setBusy(true); onBusyChange(true); setError('');
      try {
        const next = await loginGoogle(result.credential);
        navigate(next.status === 'otp' ? '/verify-otp' : roleHome(next.user.role), { replace: true });
      } catch (e) {
        setError(e.message);
      } finally {
        pending.current = false; setBusy(false); onBusyChange(false);
      }
    };
  }, [disabled, loginGoogle, navigate, onBusyChange]);

  useEffect(() => {
    if (!clientId) return undefined;
    let active = true;
    loadGoogle()
      .then(google => {
        if (!active || !host.current) return;
        google.accounts.id.initialize({ client_id: clientId, callback: result => handler.current(result) });
        google.accounts.id.renderButton(host.current, {
          theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill',
          width: Math.min(400, host.current.clientWidth || 320), locale: 'vi',
        });
      })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [clientId]);

  return (
    <div className="stack-sm">
      {clientId ? (
        <div ref={host} aria-disabled={disabled || busy} className={`google-host${disabled || busy ? ' is-disabled' : ''}`} />
      ) : (
        <>
          <button type="button" className="btn btn-secondary" disabled>G · Tiếp tục với Google</button>
          <p className="body small">Đăng nhập Google đang chờ cấu hình (VITE_GOOGLE_CLIENT_ID).</p>
        </>
      )}
      {busy && <p className="body">Đang kết nối Google…</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
