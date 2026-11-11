import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import { errorText } from "../src/utils/vietnamese.js";

test("PasswordChangeForm shows honest BE limitation notice instead of broken form", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { PasswordChangeForm } = await server.ssrLoadModule("/src/components/member/PasswordChangeForm.jsx");
    const html = renderToStaticMarkup(createElement(PasswordChangeForm));
    assert.match(html, /Đổi mật khẩu/);
    assert.match(html, /Máy chủ hiện chưa hỗ trợ tự đổi mật khẩu trên ứng dụng web/);
    assert.doesNotMatch(html, /<form|<input|\/api\/auth\/password/);
  } finally {
    await server.close();
  }
});

test("MemberTrainingSections filters out DRAFT plans, formats separators cleanly, and sanitizes homework links", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { MemberTrainingSections } = await server.ssrLoadModule("/src/pages/member/MemberTrainingPage.jsx");

    const draftOnlyHtml = renderToStaticMarkup(createElement(MemberTrainingSections, {
      plans: [{ id: "p-draft", status: "DRAFT", goal: "Nháp chưa duyệt", plan: "Nội dung nháp" }],
      progress: [],
      homework: [],
    }));
    assert.match(draftOnlyHtml, /Chưa có kế hoạch được duyệt/);
    assert.doesNotMatch(draftOnlyHtml, /Nháp chưa duyệt/);

    const fullHtml = renderToStaticMarkup(createElement(MemberTrainingSections, {
      plans: [
        { id: "p-draft", status: "DRAFT", goal: "Ẩn bản nháp", plan: "Không hiện" },
        { id: "p-ok", status: "APPROVED", goal: "Tăng sức bền", plan: "Chạy bộ 3 buổi/tuần", level: "BEGINNER" },
      ],
      progress: [
        { id: "lp-1", lessonId: { title: "Bài 1" }, classId: { name: "Yoga Sáng" }, status: "COMPLETED", coachComment: "Rất tốt" },
      ],
      homework: [
        {
          id: "hw-1",
          title: "Bài tập hít thở",
          description: "Thực hành 15 phút mỗi sáng",
          classId: { name: "Yoga Sáng" },
          attachments: ["https://example.com/guide.pdf", "javascript:alert(1)"],
        },
      ],
    }));

    assert.match(fullHtml, /Tăng sức bền/);
    assert.doesNotMatch(fullHtml, /Ẩn bản nháp/);
    assert.match(fullHtml, />Kế hoạch cá nhân · Cơ bản</);
    assert.match(fullHtml, /Yoga Sáng · Đã hoàn thành/);
    assert.match(fullHtml, /<a href="https:\/\/example\.com\/guide\.pdf" target="_blank" rel="noopener noreferrer">https:\/\/example\.com\/guide\.pdf<\/a>/);
    assert.doesNotMatch(fullHtml, /href="javascript:/);
    assert.match(fullHtml, /<li>javascript:alert\(1\)<\/li>/);
    assert.match(fullHtml, /Yoga Sáng · Không đặt hạn hoàn thành/);
  } finally {
    await server.close();
  }
});

test("MemberPaymentsPage and MemberResultsPage guide missing memberId without loading loops, and MemberLayout handles null user", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { AppContext } = await server.ssrLoadModule("/src/store/appContext.js");
    const { MemberPaymentsPage } = await server.ssrLoadModule("/src/pages/member/MemberPaymentsPage.jsx");
    const { MemberResultsPage } = await server.ssrLoadModule("/src/pages/member/MemberResultsPage.jsx");
    const { MemberLayout } = await server.ssrLoadModule("/src/layouts/MemberLayout.jsx");
    const { NotificationsPage } = await server.ssrLoadModule("/src/pages/shared/NotificationsPage.jsx");
    const { SupportRequestsPage } = await server.ssrLoadModule("/src/pages/shared/SupportRequestsPage.jsx");

    const renderWithApp = (Component, user) => renderToStaticMarkup(
      createElement(MemoryRouter, { initialEntries: ["/member/payments"] },
        createElement(AppContext.Provider, { value: { user, authLoading: false, setUser() {}, toast() {} } },
          createElement(Component)))
    );

    const noProfile = { id: "u1", email: "member@test.invalid", role: "MEMBER", memberId: undefined };

    const paymentsHtml = renderWithApp(MemberPaymentsPage, noProfile);
    assert.match(paymentsHtml, /Hoàn thiện hồ sơ để đăng ký và thanh toán/);
    assert.doesNotMatch(paymentsHtml, /Đang tải/);

    const resultsHtml = renderWithApp(MemberResultsPage, noProfile);
    assert.match(resultsHtml, /Hoàn thiện hồ sơ để xem kết quả tập luyện/);
    assert.doesNotMatch(resultsHtml, /Đang tải/);

    const layoutNullUserHtml = renderWithApp(MemberLayout, null);
    assert.match(layoutNullUserHtml, /Thành viên/);
    assert.match(layoutNullUserHtml, />T</);

    const notificationsHtml = renderWithApp(NotificationsPage, { ...noProfile, memberId: "m1" });
    assert.match(notificationsHtml, /Thông báo/);

    const supportHtml = renderWithApp(SupportRequestsPage, { ...noProfile, memberId: "m1" });
    assert.match(supportHtml, /Yêu cầu hỗ trợ/);
  } finally {
    await server.close();
  }
});

test("VNPay 5000 VND minimum is enforced in PaymentForm and MemberClassRegistrationPanel blocks cancelled registrations with payment history", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { PaymentForm } = await server.ssrLoadModule("/src/components/common/RegistrationPaymentModal.jsx");
    const { MemberClassRegistrationPanel } = await server.ssrLoadModule("/src/pages/member/MemberClassDetailPage.jsx");

    const belowMinCreateHtml = renderToStaticMarkup(createElement(PaymentForm, {
      data: {
        registration: { id: "reg-1", status: "PENDING_PAYMENT", classItem: { name: "Lớp Thử", course: { name: "Khóa Thử" } } },
        payments: [],
        coursePrice: 2000,
      },
      customerView: true,
      reload() {},
      setBusy() {},
    }));
    assert.match(belowMinCreateHtml, /VNPay Sandbox yêu cầu số tiền thanh toán từ 5\.000 ₫ trở lên/);
    assert.match(belowMinCreateHtml, /<button[^>]*disabled=""[^>]*>Thanh toán qua VNPay Sandbox<\/button>/);

    const validCreateHtml = renderToStaticMarkup(createElement(PaymentForm, {
      data: {
        registration: { id: "reg-2", status: "PENDING_PAYMENT", classItem: { name: "Lớp Chuẩn", course: { name: "Khóa Chuẩn" } } },
        payments: [],
        coursePrice: 50000,
      },
      customerView: true,
      reload() {},
      setBusy() {},
    }));
    assert.match(validCreateHtml, /<button type="button" class="btn primary">Thanh toán qua VNPay Sandbox<\/button>/);

    const cancelledWithPaymentHtml = renderToStaticMarkup(createElement(MemberClassRegistrationPanel, {
      classId: "cls-1",
      memberId: "mem-1",
      coursePrice: 500000,
      registration: { id: "reg-3", status: "CANCELLED" },
      hasPaymentHistory: true,
      confirmation: { loading: false, error: null, data: [] },
      onRegister() {},
      onProfile() {},
      onSchedule() {},
      onPay() {},
    }));
    assert.match(cancelledWithPaymentHtml, /đã có lịch sử giao dịch thanh toán nên chưa thể tự đăng ký lại trực tuyến/);
    assert.match(cancelledWithPaymentHtml, /<button[^>]*disabled=""[^>]*>Đăng ký lại<\/button>/);

    const cancelledClosedCourseHtml = renderToStaticMarkup(createElement(MemberClassRegistrationPanel, {
      classId: "cls-1",
      memberId: "mem-1",
      coursePrice: 500000,
      registrationOpen: false,
      registration: { id: "reg-4", status: "CANCELLED" },
      hasPaymentHistory: false,
      confirmation: { loading: false, error: null, data: [] },
      onRegister() {},
      onProfile() {},
      onSchedule() {},
      onPay() {},
    }));
    assert.match(cancelledClosedCourseHtml, /Khóa học hiện ngừng nhận đăng ký mới/);
    assert.match(cancelledClosedCourseHtml, /<button[^>]*disabled=""[^>]*>Đăng ký lại<\/button>/);
  } finally {
    await server.close();
  }
});

test("RegistrationHistory enriches sport/coach from classes and avoids NaN on missing amounts", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { RegistrationHistory } = await server.ssrLoadModule("/src/components/member/MemberUI.jsx");
    const html = renderToStaticMarkup(createElement(MemoryRouter, null,
      createElement(RegistrationHistory, {
        registrations: [{
          id: "reg-1",
          classId: "cls-9",
          status: "PENDING_PAYMENT",
          classItem: { id: "cls-9", name: "Yoga Cơ Bản" },
        }],
        payments: [{ id: "pay-1", classRegistrationId: "reg-1", status: "PENDING" }],
        classes: [{ id: "cls-9", name: "Yoga Cơ Bản", sport: "Yoga", coach: { name: "HLV Mai" } }],
      })));
    assert.match(html, /Yoga/);
    assert.match(html, /Huấn luyện viên: HLV Mai/);
    assert.doesNotMatch(html, /NaN/);
    assert.match(html, /Chưa có thông tin/);
  } finally {
    await server.close();
  }
});

test("errorText translates newly audited MEMBER backend errors into Vietnamese", () => {
  assert.match(
    errorText("This cancelled registration has payment history. Please contact staff to register again."),
    /lịch sử giao dịch thanh toán.*liên hệ nhân viên trung tâm/
  );
  assert.match(
    errorText("VNPay requires a whole VND amount of at least 5000 VND"),
    /VNPay yêu cầu số tiền.*5\.000 ₫/
  );
  assert.match(
    errorText("Payment link expired. Refresh and create a new payment."),
    /Liên kết thanh toán đã hết hạn/
  );
  assert.match(
    errorText("Course tuition has not been configured"),
    /Khóa học chưa được cấu hình học phí/
  );
  assert.match(
    errorText("message must not exceed 2000 characters"),
    /không được vượt quá 2000 ký tự/
  );
  assert.match(
    errorText("Your role cannot view these homeworks."),
    /không có quyền xem các bài tập/
  );
});
