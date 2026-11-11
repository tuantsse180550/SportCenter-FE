import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";

// Isolated test of actual BE middleware, not a live HTTP/JWT/database test.
const require = createRequire(import.meta.url);
const roleMiddleware = require("../../SportCenter-BE/src/middlewares/roleMiddleware.js");
const roles = ["MEMBER", "COACH", "RECEPTIONIST", "CENTER_MANAGER"];
function invoke(allowed, user) {
  let status, body, continued = false;
  const response = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
  roleMiddleware(...allowed)({ user }, response, () => { continued = true; });
  return { status, body, continued };
}

test("actual BE role middleware allows each supported role when listed", () => {
  for (const role of roles) assert.equal(invoke(roles, { role }).continued, true);
});

test("actual BE MEMBER-only permission rejects the other roles with 403", () => {
  assert.equal(invoke(["MEMBER"], { role: "MEMBER" }).continued, true);
  for (const role of roles.filter(role => role !== "MEMBER")) {
    const result = invoke(["MEMBER"], { role });
    assert.equal(result.status, 403);
    assert.deepEqual(result.body, { success: false, message: "Access denied" });
    assert.equal(result.continued, false);
  }
  assert.equal(invoke(["MEMBER"], undefined).status, 401);
});
