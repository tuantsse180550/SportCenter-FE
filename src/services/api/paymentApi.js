import { paymentApi, registrationApi } from "./resources.js";
import { ApiError } from "../../api/apiClient.js";
import { createPaymentReceiptReader, createPaymentStatusReader, validatePaymentStatus } from "./paymentStatus.js";
function mutablePayment(input) {
  if (input.amount !== undefined) throw new ApiError("Số tiền do hệ thống xác định theo học phí; không thể thay đổi.", { status: 400, code: "IMMUTABLE_PAYMENT_AMOUNT" });
  if (input.status !== undefined || input.paymentDate !== undefined) {
    throw new ApiError("Payment status and paymentDate cannot be changed through this endpoint.", { status: 400, code: "UNSUPPORTED_PAYMENT_CONFIRMATION" });
  }
  return input;
}
export const paymentService = {
  getPaymentStatus: createPaymentStatusReader((id, options) => paymentApi.status(id, options)),
  getPaymentReceipt: createPaymentReceiptReader((id, options) => paymentApi.receipt(id, options)),
  listPayments: () => paymentApi.list(),
  async listMyRegistrations() { return registrationApi.list(); },
  async verifyVnpayReturn(query, options) {
    const data = await paymentApi.verifyReturn(query, options);
    return validatePaymentStatus(query.vnp_TxnRef, data);
  },
  async listPendingRegistrations() { return (await registrationApi.list()).filter((r) => r.status === "PENDING_PAYMENT"); },
  async getRegistrationPayment(id) {
    const [registrations, payments] = await Promise.all([registrationApi.list(), paymentApi.list()]);
    const registration = registrations.find((r) => r.id === id) || null;
    const price = registration?.priceSnapshot;
    return { registration, coursePrice: Number.isFinite(price) && price >= 0 ? price : undefined, payments: payments.filter((p) => p.classRegistrationId === id) };
  },
  async recordPayment({ classRegistrationId, paymentMethod, confirmReceived = false }) {
    if (confirmReceived) throw new ApiError("Payment confirmation by reception is not supported by the current backend.", { code: "UNSUPPORTED_PAYMENT_CONFIRMATION" });
    const current = await this.getRegistrationPayment(classRegistrationId);
    if (current.registration?.status !== "PENDING_PAYMENT") throw new ApiError("This registration is no longer pending payment. Refresh to see its current status.");
    const existing = current.payments.find((p) => p.status === "PENDING");
    if (existing && (existing.paymentProvider === "PAYOS" || existing.payosOrderCode != null)) throw new ApiError("Giao dịch PayOS đang chờ trên ứng dụng. Vui lòng hoàn tất hoặc xử lý giao dịch đó trước khi thanh toán trên Web.", { status: 409, code: "MOBILE_PAYMENT_PENDING" });
    if (existing && existing.paymentMethod !== paymentMethod) throw new ApiError("Đã có giao dịch chờ với phương thức khác. Vui lòng kiểm tra giao dịch hiện tại.");
    const payload = { classRegistrationId, paymentMethod };
    const payment = existing || await paymentApi.create(payload);
    // Never derive CONFIRMED locally. The database response is authoritative.
    try { const refreshed = await this.getRegistrationPayment(classRegistrationId); return { payment, registration: refreshed.registration }; }
    catch (error) { return { payment, registration: null, refreshError: "Payment was recorded, but registration refresh failed: " + error.message }; }
  },
  createPayment: (input) => paymentApi.create(mutablePayment({ ...input, amount: undefined })),
  async createVnpayUrl(id) {
    const data = await paymentApi.vnpay(id);
    let url;
    try { url = new URL(data?.paymentUrl); } catch { throw new ApiError("Đường dẫn thanh toán không hợp lệ.", { code: "INVALID_RESPONSE" }); }
    if (url.protocol !== "https:" || url.hostname !== "sandbox.vnpayment.vn" || data?.paymentId !== id) {
      throw new ApiError("Đường dẫn thanh toán không hợp lệ.", { code: "INVALID_RESPONSE" });
    }
    return data;
  },
  updatePayment: (id, input) => paymentApi.update(id, mutablePayment(input)),
  simulatePayment(id, status) {
    if (!["SUCCESS", "FAILED"].includes(status)) throw new ApiError("Simulation status must be SUCCESS or FAILED.", { status: 400 });
    // Explicit mock-mode BE endpoint; not a gateway or receptionist confirmation.
    return paymentApi.simulate(id, status);
  },
};
