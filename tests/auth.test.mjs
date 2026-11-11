import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthService } from "../src/services/api/createAuthService.js";
import { ApiError } from "../src/api/apiClient.js";

const account = (role = "MEMBER") => ({ id: "user", email: "member@test.invalid", role, status: "ACTIVE" });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function setup(request, { members = [{ id: "member", userId: "user", fullName: "Member" }], coaches = [] } = {}) {
  let token = null;
  const listeners = new Set();
  const tokenStore = {
    getToken: () => token,
    setToken(value) { token = value; },
    clear() { token = null; for (const listener of listeners) listener(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  const auth = createAuthService({ request, tokenStore, listMembers: async () => members, listCoaches: async () => coaches, invalidate() {} });
  return { auth, tokenStore };
}

test("login uses the BE role and profile, never the UI-supplied role", async () => {
  let sent;
  const { auth, tokenStore } = setup(async (path, options) => { sent = { path, ...options }; return { token: "jwt", user: account() }; });
  const { user } = await auth.login({ email: " member@test.invalid ", password: "password", role: "CENTER_MANAGER" });
  assert.equal(user.role, "MEMBER");
  assert.equal(user.memberId, "member");
  assert.equal(tokenStore.getToken(), "jwt");
  assert.deepEqual(sent, { path: "/api/auth/login", method: "POST", authenticated: false, body: { email: "member@test.invalid", password: "password" } });
});

test("register forces MEMBER, returns the account ID and does not log in or create a profile", async () => {
  const calls = [];
  const { auth, tokenStore } = setup(async (path, options) => { calls.push({ path, ...options }); return account(); });
  const user = await auth.registerMember({ email: " member@test.invalid ", password: "password", role: "COACH" });
  assert.equal(user.id, "user");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/auth/register");
  assert.deepEqual(calls[0].body, { email: "member@test.invalid", password: "password", role: "MEMBER" });
  assert.equal(tokenStore.getToken(), null);
  assert.equal(auth.getCurrentUser(), null);
});

test("Google uses only the verified idToken contract; missing profile remains missing", async () => {
  let sent;
  const { auth } = setup(async (path, options) => { sent = { path, ...options }; return { token: "jwt", user: account() }; }, { members: [] });
  const { user } = await auth.loginWithGoogle({ idToken: "google-id-token", role: "COACH" });
  assert.equal(user.memberId, undefined);
  assert.equal(user.name, user.email);
  assert.equal(sent.path, "/api/auth/google");
  assert.deepEqual(sent.body, { idToken: "google-id-token" });
});

test("all roles map correctly; inactive and malformed auth cannot establish a session", async () => {
  for (const role of ["CENTER_MANAGER", "COACH", "MEMBER", "RECEPTIONIST"]) {
    const { auth } = setup(async () => ({ token: "jwt", user: account(role) }), { coaches: [{ _id: "coach", userId: { _id: "user" }, fullName: "Coach" }] });
    const { user } = await auth.login({ email: "x", password: "password" });
    assert.equal(user.role, role);
    assert.equal(user.coachId, role === "COACH" ? "coach" : undefined);
  }
  for (const data of [{}, { token: "jwt", user: null }, { token: "jwt", user: { ...account(), status: "INACTIVE" } }, { token: "jwt", user: account("toString") }]) {
    const { auth, tokenStore } = setup(async () => data);
    await assert.rejects(auth.login({ email: "x", password: "password" }), ApiError);
    assert.equal(auth.getCurrentUser(), null);
    assert.equal(tokenStore.getToken(), null);
  }
});

test("login 500/401/403 and registration 409 remain server errors without mock fallback", async () => {
  for (const status of [401, 403, 409, 500]) {
    const { auth, tokenStore } = setup(async () => { throw new ApiError("Backend error", { status }); });
    await assert.rejects(auth.login({ email: "x", password: "password" }), e => e.status === status);
    assert.equal(tokenStore.getToken(), null);
    await assert.rejects(auth.registerMember({ email: "x", password: "password" }), e => e.status === status);
  }
});

test("restore shares pending requests, retries failures and clears inactive/deleted accounts", async () => {
  const pending = deferred();
  let calls = 0;
  const { auth, tokenStore } = setup(async () => { calls++; return pending.promise; });
  tokenStore.setToken("jwt");
  const first = auth.restore();
  assert.equal(auth.restore(), first);
  pending.resolve(account());
  assert.equal((await first).memberId, "member");
  assert.equal(calls, 1);
  for (const status of [401, 403, 404, 500]) {
    const fixture = setup(async () => { throw new ApiError("Backend error", { status }); });
    fixture.tokenStore.setToken("jwt");
    if (status === 500) {
      await assert.rejects(fixture.auth.restore(), e => e.status === 500);
      assert.equal(fixture.tokenStore.getToken(), "jwt");
      await assert.rejects(fixture.auth.restore(), e => e.status === 500);
    } else {
      assert.equal(await fixture.auth.restore(), null);
      assert.equal(fixture.tokenStore.getToken(), null);
    }
  }
  const inactive = setup(async () => ({ ...account(), status: "INACTIVE" }));
  inactive.tokenStore.setToken("jwt");
  assert.equal(await inactive.auth.restore(), null);
  assert.equal(inactive.tokenStore.getToken(), null);
});

test("logout during login prevents a late response from signing in", async () => {
  const pending = deferred();
  const { auth, tokenStore } = setup(() => pending.promise);
  const login = auth.login({ email: "x", password: "password" });
  auth.logout();
  pending.resolve({ token: "old-jwt", user: account() });
  await assert.rejects(login, e => e.code === "SESSION_CHANGED");
  assert.equal(tokenStore.getToken(), null);
  assert.equal(auth.getCurrentUser(), null);
});

test("stale restore errors cannot clear a newer login", async () => {
  const pending = deferred();
  const { auth, tokenStore } = setup(path => path === "/api/auth/me" ? pending.promise : Promise.resolve({ token: "new-jwt", user: account("CENTER_MANAGER") }));
  tokenStore.setToken("old-jwt");
  const restore = auth.restore();
  await auth.login({ email: "x", password: "password" });
  pending.reject(new ApiError("Old account missing", { status: 404 }));
  assert.equal(await restore, null);
  assert.equal(tokenStore.getToken(), "new-jwt");
  assert.equal(auth.getCurrentUser().role, "CENTER_MANAGER");
});
