import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
test("result UI shows a backend receipt or an honest error, never URL success", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { PaymentResultView } = await server.ssrLoadModule("/src/pages/member/PaymentResultPage.jsx");
    const render = query => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/payment-result?vnp_ResponseCode=00"] }, createElement(PaymentResultView, { query: { reload() {}, ...query } })));
    const html = render({ data: { paymentId: "a".repeat(24), status: "SUCCESS", registrationStatus: "CONFIRMED", receipt: { rows: [["Mã biên nhận", "a".repeat(24)], ["Trạng thái", "ĐÃ THANH TOÁN"]] } } });
    assert.match(html, /Đã thanh toán/); assert.match(html, /ĐÃ THANH TOÁN/); assert.doesNotMatch(html, /<iframe|<script/); assert.doesNotMatch(html, /Đã xác nhận/);
    for (const status of [401, 403, 404, 409, 500]) {
      const error = render({ error: { status } });
      assert.match(error, /role="alert"/); assert.match(error, /Thử tải lại/); assert.doesNotMatch(error, /<iframe|<h2>Đã thanh toán/);
    }
    const unknown = render({ error: { status: 409 } });
    assert.match(unknown, /Chưa thể xác nhận kết quả thanh toán/);
    assert.doesNotMatch(unknown, /Đang xác minh thanh toán|Thanh toán thất bại|Thanh toán đã hủy/);
    for (const status of ["PENDING", "FAILED"]) {
      const result = render({ data: { status, registrationStatus: "PENDING_PAYMENT" } });
      assert.match(result, status === "PENDING" ? /Đang chờ xác nhận thanh toán/ : /Thanh toán thất bại/);
      assert.doesNotMatch(result, /<iframe|<h2>Đã thanh toán/);
    }
    const receiptFailure = render({ data: { status: "SUCCESS", registrationStatus: "CANCELLED" }, receiptError: { status: 500 } });
    assert.match(receiptFailure, /Đã thanh toán/);
    assert.match(receiptFailure, /Đăng ký lớp đã bị hủy/);
    assert.doesNotMatch(receiptFailure, /<iframe/);
    assert.doesNotMatch(render({ data: { html: "receipt" } }), /<h2>Đã thanh toán/);
  } finally { await server.close(); }
});
