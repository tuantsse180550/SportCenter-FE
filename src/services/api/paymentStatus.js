import { ApiError } from "../../api/apiClient.js";

export const PAYMENT_ID_PATTERN = /^[a-f\d]{24}$/i;

export function vnpayQueryFromSearch(search) {
  const query = {};
  for (const [key, value] of new URLSearchParams(search)) {
    if (!key.startsWith("vnp_")) continue;
    if (Object.hasOwn(query, key)) throw new ApiError("Phản hồi VNPay chứa tham số trùng lặp.", { status: 400 });
    query[key] = value;
  }
  if (!Object.keys(query).length || Object.keys(query).every(key => key === "vnp_TxnRef")) return null;
  return query;
}

// Only the ID is read from the URL. Gateway response codes never confirm payment.
export function paymentIdFromSearch(search) {
  const params = new URLSearchParams(search);
  const values = [...params.getAll("paymentId"), ...params.getAll("vnp_TxnRef")];
  if (!values.length) return { id: null, error: "Thiếu mã tham chiếu thanh toán trong đường dẫn." };
  if (values.some(value => !PAYMENT_ID_PATTERN.test(value)) || new Set(values.map(value => value.toLowerCase())).size !== 1) {
    return { id: null, error: "Mã tham chiếu thanh toán không hợp lệ." };
  }
  return { id: values[0].toLowerCase(), error: null };
}

export function validatePaymentStatus(id, data) {
    if (!PAYMENT_ID_PATTERN.test(id || "")) throw new ApiError("Invalid payment ID", { status: 400 });
    if (typeof data?.paymentId !== "string" || data.paymentId.toLowerCase() !== id.toLowerCase() ||
        !["PENDING", "SUCCESS", "FAILED"].includes(data.status) ||
        !["PENDING_PAYMENT", "CONFIRMED", "CANCELLED"].includes(data.registrationStatus)) {
      throw new ApiError("Phản hồi trạng thái thanh toán không hợp lệ.", { code: "INVALID_RESPONSE" });
    }
    return data;
}

export function createPaymentStatusReader(load) {
  return async (id, options = {}) => {
    if (!PAYMENT_ID_PATTERN.test(id || "")) throw new ApiError("Invalid payment ID", { status: 400 });
    return validatePaymentStatus(id, await load(id, options));
  };
}

// Extract text fields only; backend HTML is never inserted into the page.
export function createPaymentReceiptReader(load) {
  return async (id, options = {}) => {
    if (!PAYMENT_ID_PATTERN.test(id || "")) throw new ApiError("Invalid payment ID", { status: 400 });
    const html = await load(id, options);
    if (typeof html !== "string" || !html.trim()) {
      throw new ApiError("Phản hồi biên nhận không hợp lệ.", { code: "INVALID_RECEIPT" });
    }
    const document = new DOMParser().parseFromString(html, "text/html");
    document.querySelectorAll("script, style, iframe, object, embed").forEach(element => element.remove());
    const rows = [...document.querySelectorAll("table tr")].map(row =>
      [...row.querySelectorAll("td")].map(cell => cell.textContent.trim())
    ).filter(cells => cells.length === 2);
    const fields = new Map(rows);
    const labels = ["Mã biên nhận", "Hội viên", "Số điện thoại", "Lớp", "Khóa học", "Phương thức", "Thời gian thanh toán", "Trạng thái", "Tổng tiền"];
    if (document.title.trim() !== `Biên nhận thanh toán - ${id}` ||
        fields.get("Mã biên nhận") !== id || fields.get("Trạng thái") !== "ĐÃ THANH TOÁN" ||
        labels.some(label => !fields.get(label))) {
      throw new ApiError("Phản hồi biên nhận thiếu nội dung hoặc không khớp giao dịch.", { code: "INVALID_RECEIPT" });
    }
    return { id, rows: labels.map(label => [label, fields.get(label)]) };
  };
}

export function paymentResultError(error) {
  if (error?.code === "INVALID_RECEIPT") return "Dữ liệu biên nhận bị thiếu hoặc không khớp giao dịch. Vui lòng tải lại biên nhận.";
  if (error?.status === 400) return "Phản hồi thanh toán không hợp lệ hoặc đã bị thay đổi. Vui lòng xem trạng thái trong mục Thanh toán của tôi.";
  if (error?.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem kết quả.";
  if (error?.status === 403) return "Bạn không có quyền xem thanh toán này.";
  if (error?.status === 409) return "Chưa có biên nhận thanh toán thành công. Chưa thể xác định giao dịch đang chờ, thất bại hay đã hủy. Vui lòng kiểm tra lại sau hoặc liên hệ trung tâm.";
  if (error?.status === 404) return "Không tìm thấy thanh toán hoặc đăng ký liên quan. Vui lòng kiểm tra mã tham chiếu.";
  if (error?.code === "ABORTED" || error?.code === "TIMEOUT") return "Máy chủ phản hồi chậm. Vui lòng thử tải lại.";
  if (error?.code === "NETWORK") return "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.";
  return "Chưa thể tải thông tin thanh toán. Vui lòng thử lại sau.";
}

// Only this local destination is accepted after signing in from the result page.
export function paymentResultLoginTarget(state, role, fallback) {
  return role === "MEMBER" && typeof state?.returnTo === "string" &&
    /^\/payment-result(?:\?|$)/.test(state.returnTo) ? state.returnTo : fallback;
}
