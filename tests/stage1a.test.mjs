import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";
import { errorText } from "../src/utils/vietnamese.js";

test("Member self-profile updates always use /api/members/me and reject mismatched IDs", async () => {
  const fixture = createBackendFixture();
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fixture.fetch;
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { authService, memberService } = await server.ssrLoadModule("/src/services/index.js");
    fixture.state.members.length = 0;
    const { user } = await authService.login({ email: "member@test.invalid", password: "test-password" });
    assert.equal(user.memberId, undefined);

    const created = await memberService.createMyProfile({ fullName: "Nguyen Van A", phone: "0900000009", goal: "Health", level: "BEGINNER" });
    assert.ok(created.id);
    // Simulate immediate edit before authService.restore() populates user.memberId
    assert.equal(authService.getCurrentUser().memberId, undefined);
    const updated = await memberService.updateProfile(created.id, { goal: "Endurance" });
    assert.equal(updated.goal, "Endurance");
    assert.ok(fixture.calls.some(c => c.method === "PUT" && c.route === "/api/members/me"));
    assert.equal(fixture.calls.some(c => c.route.startsWith("/api/members/") && c.route !== "/api/members/me"), false);

    const restored = await authService.restore();
    assert.equal(restored.memberId, created.id);
    const beforeDenied = fixture.calls.length;
    await assert.rejects(memberService.updateProfile("another-member-id", { goal: "Hack" }), e => e.status === 403);
    assert.equal(fixture.calls.length, beforeDenied);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("Member pages without memberId guide to profile completion instead of fetching 404 resources", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { AppContext } = await server.ssrLoadModule("/src/store/appContext.js");
    const { MemberAttendancePage } = await server.ssrLoadModule("/src/pages/member/MemberAttendancePage.jsx");
    const { MemberTrainingPage } = await server.ssrLoadModule("/src/pages/member/MemberTrainingPage.jsx");
    const { SupportRequestsPage } = await server.ssrLoadModule("/src/pages/shared/SupportRequestsPage.jsx");

    const renderPage = (Component, user) => renderToStaticMarkup(
      createElement(MemoryRouter, null,
        createElement(AppContext.Provider, { value: { user, authLoading: false, setUser() {}, toast() {} } },
          createElement(Component)))
    );

    const noProfileMember = { id: "u1", email: "member@test.invalid", role: "MEMBER", memberId: undefined };

    const attendanceHtml = renderPage(MemberAttendancePage, noProfileMember);
    assert.match(attendanceHtml, /Hoàn thiện hồ sơ để xem điểm danh/);
    assert.match(attendanceHtml, />Hoàn thiện hồ sơ</);
    assert.doesNotMatch(attendanceHtml, /Làm mới|Đang tải/);

    const trainingHtml = renderPage(MemberTrainingPage, noProfileMember);
    assert.match(trainingHtml, /Hoàn thiện hồ sơ để xem kế hoạch và phản hồi/);
    assert.match(trainingHtml, />Hoàn thiện hồ sơ</);
    assert.doesNotMatch(trainingHtml, /Đang tải/);

    const supportMemberHtml = renderPage(SupportRequestsPage, noProfileMember);
    assert.match(supportMemberHtml, /Hoàn thiện hồ sơ để gửi yêu cầu hỗ trợ/);
    assert.match(supportMemberHtml, />Hoàn thiện hồ sơ</);
    assert.doesNotMatch(supportMemberHtml, /<form|<textarea|Đang tải/);

    const managerHtml = renderPage(SupportRequestsPage, { id: "u2", email: "manager@test.invalid", role: "CENTER_MANAGER" });
    assert.doesNotMatch(managerHtml, /Hoàn thiện hồ sơ để gửi yêu cầu hỗ trợ/);
  } finally {
    await server.close();
  }
});

test("errorText preserves Vietnamese client and 4xx messages while masking >= 500 internal failures", () => {
  assert.equal(errorText("Vui lòng chọn bộ môn của khóa học."), "Vui lòng chọn bộ môn của khóa học.");
  assert.equal(errorText("Học phí mỗi học viên phải là số nguyên VNĐ từ 0 trở lên."), "Học phí mỗi học viên phải là số nguyên VNĐ từ 0 trở lên.");
  assert.equal(errorText("Vui lòng chọn khóa học thuộc bộ môn và huấn luyện viên còn trống.", { status: 400 }), "Vui lòng chọn khóa học thuộc bộ môn và huấn luyện viên còn trống.");
  assert.equal(errorText("Đơn hàng thanh toán PayOS đã tồn tại.", { status: 409 }), "Đơn hàng thanh toán PayOS đã tồn tại.");
  assert.match(errorText("Lỗi nội bộ hệ thống", { status: 500 }), /lỗi nội bộ/);
  assert.match(errorText("Unhandled database error", { status: 500 }), /lỗi nội bộ/);
});

test("0 VND tuition renders fee label, explains limitation, and disables online signup and payment creation", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { MemberClassRegistrationPanel } = await server.ssrLoadModule("/src/pages/member/MemberClassDetailPage.jsx");
    const { PaymentForm } = await server.ssrLoadModule("/src/components/common/RegistrationPaymentModal.jsx");
    const render = registration => renderToStaticMarkup(createElement(MemberClassRegistrationPanel, {
      classId: "cls-1", memberId: "mem-1", coursePrice: 0, registration,
      confirmation: { loading: false, error: null, data: [] }, onRegister() {}, onProfile() {}, onSchedule() {}, onPay() {},
    }));

    const fresh = render(null);
    assert.match(fresh, /học viên: 0/);
    assert.match(fresh, /0 ₫ chưa hỗ trợ tạo giao dịch thanh toán tự động/);
    assert.match(fresh, /<button[^>]*disabled=""[^>]*>Yêu cầu đăng ký<\/button>/);

    const cancelled = render({ status: "CANCELLED" });
    assert.match(cancelled, /0 ₫ chưa hỗ trợ tạo giao dịch thanh toán tự động/);
    assert.match(cancelled, /<button[^>]*disabled=""[^>]*>Đăng ký lại<\/button>/);

    const paymentFormHtml = renderToStaticMarkup(createElement(PaymentForm, {
      data: {
        registration: { id: "reg-1", status: "PENDING_PAYMENT", classItem: { name: "Lớp A", course: { name: "Khóa miễn phí" } } },
        payments: [],
        coursePrice: 0,
      },
      customerView: true,
      reload() {},
      setBusy() {},
    }));
    assert.match(paymentFormHtml, /chỉ hỗ trợ tạo giao dịch thanh toán với học phí lớn hơn 0 ₫/);
    assert.match(paymentFormHtml, /<button[^>]*disabled=""[^>]*>Thanh toán qua VNPay Sandbox<\/button>/);
  } finally {
    await server.close();
  }
});

test("Manager and Receptionist list filters happen in memory without query reloads, and Manager create class is gated while loading", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { AppContext } = await server.ssrLoadModule("/src/store/appContext.js");
    const { ManagerClassesPage } = await server.ssrLoadModule("/src/pages/manager/ManagerClassesPage.jsx");
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null,
        createElement(AppContext.Provider, { value: { user: { id: "m1", role: "CENTER_MANAGER" }, authLoading: false, setUser() {}, toast() {} } },
          createElement(ManagerClassesPage)))
    );
    assert.match(html, /<button[^>]*disabled=""[^>]*>.*Tạo lớp học<\/button>/);

    const classesSrc = fs.readFileSync(new URL("../src/pages/manager/ManagerClassesPage.jsx", import.meta.url), "utf8");
    const managerMembersSrc = fs.readFileSync(new URL("../src/pages/manager/ManagerMembersPage.jsx", import.meta.url), "utf8");
    const receptionistMembersSrc = fs.readFileSync(new URL("../src/pages/receptionist/ReceptionistMembersPage.jsx", import.meta.url), "utf8");
    assert.doesNotMatch(classesSrc, /useQuery\([^;]*\[filters\]/);
    assert.doesNotMatch(managerMembersSrc, /useQuery\([^;]*\[filters\]/);
    assert.doesNotMatch(receptionistMembersSrc, /useQuery\([^;]*\[search\]/);
  } finally {
    await server.close();
  }
});
