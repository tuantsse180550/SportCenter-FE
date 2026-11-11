import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { readContracts } from "../scripts/backendContracts.mjs";

test("every declared resource method maps to a mounted BE route", () => {
  const routes = readContracts();
  const source = fs.readFileSync(new URL("../src/services/api/resources.js", import.meta.url), "utf8");
  for (const m of source.matchAll(/resource\("([^"]+)"[^;]+;/g)) {
    const base = "/api/" + m[1];
    const methods = [["GET", base], ["POST", base], ["PUT", base + "/:id"]];
    if (m[0].includes("update: false")) methods.pop();
    if (m[0].includes("remove: true")) methods.push(["DELETE", base + "/:id"]);
    for (const [method, url] of methods) {
      assert.ok(routes.some(r => r.method === method && r.url === url), method + " " + url);
    }
  }
  assert.equal(new Set(routes.map(r => r.method + " " + r.url)).size, routes.length);
  assert.equal(routes.some(r => r.method === "DELETE" && r.url === "/api/payments/:id"), false);
});

test("special profile/schedule/payment contracts are owner/role gated in source", () => {
  const routes = readContracts();
  for (const url of ["/api/members/me", "/api/schedules/my", "/api/payments/:id/simulate"]) {
    const contract = routes.find(r => r.url === url);
    assert.equal(contract.authenticated, true);
    assert.deepEqual(contract.roles, ["MEMBER"]);
  }
  const payment = routes.find(r => r.url === "/api/payments" && r.method === "POST");
  assert.match(payment.source, /status: "PENDING"/);
  assert.doesNotMatch(payment.body, /status|paymentDate/);
});

test("POST/PUT payload whitelists use only fields read by the actual controller", () => {
  const contracts = readContracts();
  const source = fs.readFileSync(new URL("../src/services/api/resources.js", import.meta.url), "utf8");
  const fieldsOf = s => [...s.matchAll(/"([^"]+)"/g)].map(m => m[1]);
  for (const m of source.matchAll(/resource\("([^"]+)",\s*normalize\.\w+,\s*\[([^\]]*)\](?:,\s*\{([^}]*)\})?\)/g)) {
    const defaults = fieldsOf(m[2]);
    const options = m[3] || "";
    for (const [method, option] of [["POST", "createFields"], ["PUT", "updateFields"]]) {
      if (method === "PUT" && options.includes("update: false")) continue;
      const declared = options.match(new RegExp(option + ":\\s*\\[([^\\]]*)\\]"));
      const sent = declared ? fieldsOf(declared[1]) : defaults;
      const contract = contracts.find(c => c.method === method && c.url === "/api/" + m[1] + (method === "PUT" ? "/:id" : ""));
      assert.ok(contract, m[1]);
      const accepted = contract.body.split(",").map(s => s.trim()).filter(Boolean);
      for (const field of sent) assert.ok(accepted.includes(field), method + " " + m[1] + " unsupported field " + field);
    }
  }
});
