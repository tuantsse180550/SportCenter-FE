import test from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "../src/api/apiClient.js";
import { createPaymentReceiptReader, createPaymentStatusReader, paymentIdFromSearch, paymentResultError, paymentResultLoginTarget } from "../src/services/api/paymentStatus.js";
import { ReceiptDOMParser } from "./receiptDomFixture.mjs";
globalThis.DOMParser = ReceiptDOMParser;
const id = "a".repeat(24);
test("status follows backend enums and must belong to the requested payment", async () => {
  for (const status of ["PENDING", "SUCCESS", "FAILED"]) {
    const data = { paymentId: id, status, registrationStatus: "PENDING_PAYMENT", paymentDate: null };
    assert.deepEqual(await createPaymentStatusReader(async () => data)(id), data);
  }
  for (const data of [null, { paymentId: id, status: "PAID", registrationStatus: "CONFIRMED" },
    { paymentId: "b".repeat(24), status: "SUCCESS", registrationStatus: "CONFIRMED" },
    { paymentId: id, status: "SUCCESS", registrationStatus: "UNKNOWN" }]) {
    await assert.rejects(createPaymentStatusReader(async () => data)(id), e => e.code === "INVALID_RESPONSE");
  }
  await assert.rejects(createPaymentStatusReader(() => assert.fail("Must not fetch"))("invalid"), e => e.status === 400);
});
const labels = ["Mã biên nhận", "Hội viên", "Số điện thoại", "Lớp", "Khóa học", "Phương thức", "Thời gian thanh toán", "Trạng thái", "Tổng tiền"];
const receipt = '<html><head><title>Biên nhận thanh toán - ' + id + '</title></head><body><table>' + labels.map(label => '<tr><td>' + label + '</td><td>' + (label === "Mã biên nhận" ? id : label === "Trạng thái" ? "ĐÃ THANH TOÁN" : "Receipt fixture") + '</td></tr>').join("") + '</table></body></html>';
test("URL only selects an ID; query success never confirms payment", () => {
  assert.equal(paymentIdFromSearch("?vnp_TxnRef=" + id + "&vnp_ResponseCode=00").id, id);
  for (const query of ["?vnp_ResponseCode=00", "?paymentId=invalid", "?paymentId=" + id + "&vnp_TxnRef=" + "b".repeat(24)]) assert.ok(paymentIdFromSearch(query).error);
});
test("existing receipt API uses bearer GET and isolates the returned HTML", async () => {
  let call;
  const client = createApiClient({ baseUrl: "https://api.test.invalid", tokenStore: { getToken: () => "token" }, fetchImpl: async (url, options) => {
    call = { url, ...options }; return new Response(receipt, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } });
  const data = await createPaymentReceiptReader((id, options) => client("/api/payments/" + id + "/receipt", { ...options, responseType: "html" }))(id);
  assert.equal(call.url, "https://api.test.invalid/api/payments/" + id + "/receipt");
  assert.equal(call.method, "GET"); assert.equal(call.body, undefined); assert.equal(call.headers.Authorization, "Bearer token");
  assert.equal(data.status, undefined); assert.equal(data.id, id);
  assert.equal(data.html, undefined); assert.equal(data.rows.length, 9); assert.deepEqual(data.rows[0], ["Mã biên nhận", id]);
});
test("unexpected responses and wrong references cannot confirm payment", async () => {
  for (const html of [null, {}, "", "<html>login</html>", receipt.replace(id, "b".repeat(24))]) {
    await assert.rejects(createPaymentReceiptReader(async () => html)(id), e => e.code === "INVALID_RECEIPT");
  }
  await assert.rejects(createPaymentReceiptReader(() => assert.fail("Must not fetch"))("invalid"), e => e.status === 400);
  const client = createApiClient({ baseUrl: "https://api.test.invalid", tokenStore: { getToken: () => "token" }, fetchImpl: async () => new Response(receipt, { headers: { "Content-Type": "application/json" } }) });
  await assert.rejects(client("/api/payments/" + id + "/receipt", { responseType: "html" }), e => e.code === "INVALID_RESPONSE");
});
test("receipt errors preserve status; 409 does not mean pending; timeout never succeeds", async () => {
  for (const status of [401, 403, 404, 409, 500]) {
    let cleared = false;
    const client = createApiClient({ baseUrl: "https://api.test.invalid", tokenStore: { getToken: () => "token", clear() { cleared = true; } }, fetchImpl: async () => new Response(JSON.stringify({ success: false, message: "error" }), { status }) });
    await assert.rejects(client("/api/payments/" + id + "/receipt", { responseType: "html" }), e => e.status === status && !!paymentResultError(e));
    assert.equal(cleared, status === 401);
  }
  assert.match(paymentResultError({ status: 409 }), /Chưa thể xác định/);
  const client = createApiClient({ baseUrl: "https://api.test.invalid", timeoutMs: 5, tokenStore: { getToken: () => "token" }, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))) });
  await assert.rejects(client("/api/payments/" + id + "/receipt", { responseType: "html" }), e => e.code === "ABORTED");
});
test("sign-in preserves only the local result destination", () => {
  const path = "/payment-result?paymentId=" + id;
  assert.equal(paymentResultLoginTarget({ returnTo: path }, "MEMBER", "/member/home"), path);
  for (const value of ["https://evil.invalid", "//evil.invalid", "/manager", "/payment-result/evil"]) assert.equal(paymentResultLoginTarget({ returnTo: value }, "MEMBER", "/member/home"), "/member/home");
});
