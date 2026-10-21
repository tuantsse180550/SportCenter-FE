import { ApiError } from "../../api/apiClient.js";
import { entity, idOf } from "./normalize.js";
import { roleHomePath } from "../../types/roles.js";

export function createAuthService({ request, tokenStore, listMembers, getMyProfile, listCoaches, invalidate }) {
  let currentUser = null;
  let restorePromise = null;
  let generation = 0;
  tokenStore.subscribe(() => {
    generation += 1;
    currentUser = null;
    restorePromise = null;
    invalidate();
  });

  async function resolveUser(raw) {
    const user = entity(raw);
    if (!user?.id || typeof user.email !== "string" || !Object.hasOwn(roleHomePath, user.role)) {
      throw new ApiError("The server returned invalid account information.", { code: "INVALID_RESPONSE" });
    }
    if (user.status !== "ACTIVE") {
      throw new ApiError("Account is inactive.", { status: 403, code: "INACTIVE_ACCOUNT" });
    }
    let profile;
    if (user.role === "MEMBER" && getMyProfile) {
      try { profile = await getMyProfile(); }
      catch (error) {
        // A missing member profile does not mean the authenticated User is missing.
        if (error.status !== 404 || error.code === "INVALID_RESPONSE") throw error;
      }
      if (profile && idOf(profile.userId) !== user.id) {
        throw new ApiError("The server returned a profile for another account.", { code: "INVALID_RESPONSE" });
      }
    } else {
      const profiles = user.role === "MEMBER" ? await listMembers() : user.role === "COACH" ? await listCoaches() : [];
      profile = profiles.find((item) => idOf(item.userId) === user.id);
    }
    return { ...user, name: profile?.fullName || user.email,
      memberId: user.role === "MEMBER" ? idOf(profile) || undefined : undefined,
      coachId: user.role === "COACH" ? idOf(profile) || undefined : undefined };
  }

  async function signIn(path, body) {
    tokenStore.clear();
    const attempt = generation;
    try {
      const data = await request(path, { method: "POST", authenticated: false, body });
      if (attempt !== generation) throw new ApiError("Sign-in was cancelled.", { code: "SESSION_CHANGED" });
      if (typeof data?.token !== "string" || !data.token.trim()) {
        throw new ApiError("The server did not return a token.", { code: "INVALID_RESPONSE" });
      }
      tokenStore.setToken(data.token);
      const user = await resolveUser(data.user);
      if (attempt !== generation || tokenStore.getToken() !== data.token) {
        throw new ApiError("Sign-in was cancelled.", { code: "SESSION_CHANGED" });
      }
      currentUser = user;
      invalidate();
      return { user };
    } catch (error) {
      if (attempt === generation) tokenStore.clear();
      throw error;
    }
  }

  return {
    getCurrentUser: () => currentUser,
    hasToken: () => Boolean(tokenStore.getToken()),
    login({ email, password }) {
      if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
        return Promise.reject(new ApiError("Email and password are required.", { status: 400 }));
      }
      return signIn("/api/auth/login", { email: email.trim(), password });
    },
    loginWithGoogle({ idToken }) {
      if (typeof idToken !== "string" || !idToken.trim()) {
        return Promise.reject(new ApiError("Google ID token is required.", { status: 400 }));
      }
      return signIn("/api/auth/google", { idToken });
    },
    restore() {
      const token = tokenStore.getToken();
      if (!token) return Promise.resolve(null);
      if (restorePromise) return restorePromise;
      const attempt = generation;
      const pending = (async () => {
        try {
          let raw;
          try { raw = await request("/api/auth/me"); }
          catch (error) {
            // A missing account is different from a failed profile-list request.
            if (attempt === generation && tokenStore.getToken() === token && [401, 403, 404].includes(error.status)) {
              tokenStore.clear();
              return null;
            }
            throw error;
          }
          if (attempt !== generation || tokenStore.getToken() !== token) return null;
          const user = await resolveUser(raw);
          if (attempt !== generation || tokenStore.getToken() !== token) return null;
          currentUser = user;
          return user;
        } catch (error) {
          if (attempt !== generation || tokenStore.getToken() !== token) return null;
          if (error.code === "INACTIVE_ACCOUNT") { tokenStore.clear(); return null; }
          // Network/500/profile errors stay visible and can be retried.
          throw error;
        } finally {
          if (attempt === generation) restorePromise = null;
        }
      })();
      restorePromise = pending;
      return pending;
    },
    logout() { tokenStore.clear(); },
    async registerMember({ email, password }) {
      if (typeof email !== "string" || !email.trim() || typeof password !== "string" || password.length < 6) {
        throw new ApiError("Email and a password of at least 6 characters are required.", { status: 400 });
      }
      const raw = await request("/api/auth/register", {
        method: "POST", authenticated: false, body: { email: email.trim(), password, role: "MEMBER" },
      });
      const user = entity(raw);
      if (!user?.id || user.role !== "MEMBER" || typeof user.email !== "string") {
        throw new ApiError("The server returned invalid account information.", { code: "INVALID_RESPONSE" });
      }
      return user;
    },
  };
}
