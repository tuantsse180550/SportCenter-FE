import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("class panel only hides signup for a confirmed registration of this class", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { MemberClassRegistrationPanel } = await server.ssrLoadModule("/src/pages/member/MemberClassDetailPage.jsx");
    const base = { classId: "class-a", memberId: "member", coursePrice: 1200000, confirmation: { loading: false, error: null, data: [], reload() {} }, onRegister() {}, onProfile() {}, onSchedule() {} };
    const render = props => renderToStaticMarkup(createElement(MemberClassRegistrationPanel, { ...base, ...props }));
    const confirmed = [{ classId: "class-a", registrationStatus: "CONFIRMED", status: "COMPLETED", date: "2020-01-01" }];
    const known = render({ confirmation: { ...base.confirmation, data: confirmed } });
    assert.match(known, /Thông tin đăng ký/);
    assert.match(known, /Đã xác nhận/);
    assert.match(known, /Xem lịch học của tôi/);
    assert.doesNotMatch(known, /Yêu cầu đăng ký|Bắt đầu hành trình|Đăng ký lớp học|Học phí khóa học|Hiện chưa thể tra cứu|Đã thanh toán/);
    const unrelated = render({ confirmation: { ...base.confirmation, data: [{ ...confirmed[0], classId: "class-b" }] } });
    assert.match(unrelated, /Yêu cầu đăng ký/);
    assert.match(unrelated, /Yêu cầu đăng ký/);
    assert.doesNotMatch(unrelated, /Bạn chưa đăng ký|Bạn đã được xác nhận/);
    const loading = render({ confirmation: { ...base.confirmation, data: confirmed, loading: true } });
    assert.match(loading, /Đang kiểm tra đăng ký/);
    assert.doesNotMatch(loading, /Yêu cầu đăng ký|Bạn đã được xác nhận/);
    for (const status of [403, 500]) {
      const failure = render({ confirmation: { ...base.confirmation, data: confirmed, error: { status, message: "Request failed" } } });
      assert.match(failure, /Thử kiểm tra lại/);
      assert.doesNotMatch(failure, /Yêu cầu đăng ký|Bạn đã được xác nhận|Bạn chưa đăng ký/);
    }
    const pending = render({ registration: { status: "PENDING_PAYMENT" } });
    assert.match(pending, /Chờ thanh toán/);
    assert.doesNotMatch(pending, /Yêu cầu đăng ký|Đã xác nhận|Đã thanh toán/);
    const postedConfirmation = render({ registration: { status: "CONFIRMED" } });
    assert.match(postedConfirmation, /Xem lịch học của tôi/);
    assert.doesNotMatch(postedConfirmation, /Yêu cầu đăng ký/);
    const missingProfile = render({ memberId: null });
    assert.match(missingProfile, /Hoàn thiện hồ sơ/);
    assert.doesNotMatch(missingProfile, /Yêu cầu đăng ký|Bạn đã được xác nhận/);
  } finally { await server.close(); }
});
