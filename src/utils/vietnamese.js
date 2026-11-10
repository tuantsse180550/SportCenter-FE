// Presentation only: never replace API values, roles, routes or the original Error.
export const enumLabels = Object.freeze({
  CENTER_MANAGER: "Quản lý trung tâm", COACH: "Huấn luyện viên", MEMBER: "Thành viên", RECEPTIONIST: "Nhân viên lễ tân",
  PENDING_PAYMENT: "Chờ thanh toán", CONFIRMED: "Đã xác nhận", CANCELLED: "Đã hủy",
  PRESENT: "Có mặt", ABSENT: "Vắng mặt",
  BEGINNER: "Cơ bản", INTERMEDIATE: "Trung cấp", ADVANCED: "Nâng cao",
  DRAFT: "Bản nháp", APPROVED: "Đã duyệt",
  SCHEDULED: "Đã xếp lịch", COMPLETED: "Đã hoàn thành",
  NOT_STARTED: "Chưa bắt đầu", IN_PROGRESS: "Đang thực hiện",
  ACTIVE: "Đang hoạt động", INACTIVE: "Ngừng hoạt động",
  PENDING: "Chờ xử lý", SUCCESS: "Thành công", FAILED: "Thất bại",
  CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản ngân hàng", ONLINE: "Trực tuyến",
  RESOLVED: "Đã giải quyết", LOCAL: "Tài khoản nội bộ", GOOGLE: "Google", AI: "AI",
});

export function uiLabel(value) {
  if (typeof value !== "string") return value;
  if (Object.hasOwn(enumLabels, value)) return enumLabels[value];
  if (value === "No sessions scheduled") return "Chưa có buổi học được xếp lịch";
  if (value === "N/A") return "Chưa có";
  return value;
}

export function noticeText(value) {
  return typeof value === "string" ? value.replace(/\b(PENDING_PAYMENT|CONFIRMED|CANCELLED)\b/g, uiLabel) : value;
}

const fieldLabels = {
  email: "email", password: "mật khẩu", role: "vai trò", fullName: "họ tên", phone: "số điện thoại", goal: "mục tiêu", level: "trình độ",
  userId: "mã tài khoản", memberId: "mã thành viên", coachId: "mã huấn luyện viên", classId: "mã lớp học", subjectId: "mã bộ môn", courseId: "mã khóa học",
  lessonId: "mã bài học", learningPathId: "mã lộ trình học", workoutPlanId: "mã kế hoạch tập luyện", classRegistrationId: "mã đăng ký lớp học",
  name: "tên", title: "tiêu đề", message: "nội dung", action: "hoạt động", order: "thứ tự", date: "ngày", startTime: "giờ bắt đầu", endTime: "giờ kết thúc",
  status: "trạng thái", amount: "số tiền", paymentMethod: "phương thức thanh toán", paymentDate: "ngày thanh toán", source: "nguồn", plan: "kế hoạch", result: "kết quả",
  isRead: "trạng thái đã đọc", idToken: "thông tin xác thực Google", field: "thông tin",
};

const errorMessages = {
  "Cannot delete course because it is being used by a class": "Không thể xóa khóa học đang được lớp học sử dụng.",
  "Cannot delete member because related records exist": "Không thể xóa học viên đã có đăng ký, điểm danh, tiến độ, kế hoạch, kết quả, bài tập hoặc yêu cầu hỗ trợ.",
  "Cannot delete coach because related records exist": "Không thể xóa HLV đang có lớp phụ trách, kế hoạch tập luyện hoặc bài tập.",
  "Cannot delete schedule because attendance records exist": "Không thể xóa lịch học của buổi đã có điểm danh.",
  "Cannot delete subject because it is being used by a course": "Không thể xóa bộ môn đang được khóa học sử dụng.",
  "Cannot delete subject because it is assigned to a coach": "Không thể xóa bộ môn đang là chuyên môn của HLV.",
  "Cannot delete workout plan because results exist": "Không thể xóa kế hoạch đã có kết quả tập luyện.",
  "Cannot delete lesson because progress records exist": "Không thể xóa bài học đã có tiến độ học tập.",
  "Cannot delete lesson because it has attendance records": "Không thể xóa bài học đã có điểm danh.",
  "Cannot delete class because it has related lessons, schedules, registrations, attendance records or homework": "Không thể xóa lớp đã có bài học, lịch, đăng ký, điểm danh, bài tập, kế hoạch hoặc tiến độ học.",
  "Mã phòng và sức chứa nguyên dương là bắt buộc.": "Vui lòng nhập mã phòng và sức chứa là số nguyên dương.",
  "Vui lòng chọn đủ thông tin và giờ kết thúc sau giờ bắt đầu.": "Vui lòng chọn đủ thông tin và giờ kết thúc sau giờ bắt đầu.",
  "roomNumber must be a non-empty string": "Mã phòng không được để trống.",
  "name must be a string": "Tên phòng phải là văn bản.",
  "Invalid room ID": "Mã định danh phòng không hợp lệ.",
  "Room number already exists": "Mã phòng đã tồn tại. Vui lòng chọn mã khác.",
  "Room not found": "Không tìm thấy phòng.",
  "capacity must be a positive integer": "Sức chứa phải là số nguyên dương.",
  "The selected room is not active": "Phòng đã chọn không còn hoạt động. Vui lòng chọn phòng khác.",
  "This room already has a schedule during the selected time": "Phòng đã có lịch trùng giờ. Vui lòng chọn phòng hoặc thời gian khác.",
  "Cannot deactivate a room with upcoming scheduled classes": "Không thể ngừng hoạt động phòng còn buổi học đã xếp lịch từ hôm nay trở đi.",
  "Cannot delete a room linked to schedules. Set its status to INACTIVE instead when allowed.": "Không thể xóa phòng đã được lịch học tham chiếu. Có thể ngừng hoạt động khi đủ điều kiện.",
  "Time must use HH:mm format": "Giờ phải có định dạng HH:mm.",
  "startTime must be earlier than endTime": "Giờ kết thúc phải sau giờ bắt đầu.",
  "You are not assigned to this session.": "Bạn chưa được phân công buổi học này.",
  "Invalid attendance session identity.": "Không xác định được lớp, bài học hoặc ngày của buổi học.",
  "Attendance cannot distinguish these sessions.": "Có nhiều buổi học hoặc bản ghi trùng thông tin điểm danh. Vui lòng liên hệ quản lý để kiểm tra.",
  "Member is not in this session roster.": "Thành viên không có trong danh sách của buổi học này.",
  "Attendance lookup for members is not supported securely.": "Hiện chưa hỗ trợ tra cứu điểm danh cá nhân. Vui lòng liên hệ huấn luyện viên.",
  "Access denied": "Bạn không có quyền truy cập.",
  "Authentication required": "Vui lòng đăng nhập để tiếp tục.",
  "Please sign in to continue.": "Vui lòng đăng nhập để tiếp tục.",
  "Invalid or expired token": "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
  "Invalid email or password": "Email hoặc mật khẩu không đúng.",
  "Account is inactive": "Tài khoản đã ngừng hoạt động.",
  "Account is inactive.": "Tài khoản đã ngừng hoạt động.",
  "Account is inactive or has an unsupported role.": "Tài khoản đã ngừng hoạt động hoặc có vai trò chưa được hỗ trợ.",
  "Email already exists": "Email đã được sử dụng.",
  "Email and password are required": "Vui lòng nhập email và mật khẩu.",
  "Email and password are required.": "Vui lòng nhập email và mật khẩu.",
  "Email, password and role are required": "Vui lòng cung cấp email, mật khẩu và vai trò.",
  "Email and a password of at least 6 characters are required.": "Vui lòng nhập email và mật khẩu có ít nhất 6 ký tự.",
  "Password must be at least 6 characters": "Mật khẩu phải có ít nhất 6 ký tự.",
  "Internal server error": "Hệ thống gặp lỗi nội bộ. Vui lòng thử lại sau.",
  "Session changed. Please retry.": "Phiên đăng nhập đã thay đổi. Vui lòng thử lại.",
  "Sign-in was cancelled.": "Đã hủy thao tác đăng nhập.",
  "The server returned an invalid response.": "Phản hồi từ hệ thống không hợp lệ. Vui lòng thử lại.",
  "The server returned an invalid response envelope.": "Phản hồi từ hệ thống không hợp lệ. Vui lòng thử lại.",
  "The server response is missing data.": "Phản hồi từ hệ thống thiếu dữ liệu. Vui lòng thử lại.",
  "The server returned invalid account information.": "Thông tin tài khoản do hệ thống trả về không hợp lệ.",
  "The server returned a profile for another account.": "Hồ sơ do hệ thống trả về không khớp với tài khoản của bạn.",
  "The server did not return a token.": "Hệ thống chưa cung cấp thông tin xác thực phiên đăng nhập.",
  "You do not have permission for this action.": "Bạn không có quyền thực hiện thao tác này.",
  "Request failed.": "Không thể hoàn tất yêu cầu. Vui lòng thử lại.",
  "Request timed out or was cancelled. Please retry.": "Yêu cầu hết thời gian chờ hoặc đã bị hủy. Vui lòng thử lại.",
  "Cannot reach the server. Check your connection and retry.": "Không thể kết nối với hệ thống. Vui lòng kiểm tra kết nối và thử lại.",
  "VITE_API_BASE_URL is not configured.": "Chưa cấu hình địa chỉ máy chủ. Vui lòng liên hệ quản trị viên.",
  "Invalid API path.": "Địa chỉ dịch vụ không hợp lệ. Vui lòng liên hệ quản trị viên.",
  "Google ID token is required": "Cần cung cấp thông tin xác thực Google.",
  "Google ID token is required.": "Cần cung cấp thông tin xác thực Google.",
  "Google authentication failed": "Không thể xác thực tài khoản Google.",
  "Invalid Google account": "Tài khoản Google không hợp lệ.",
  "An account with this email already exists. Please log in with email and password first.": "Email này đã có tài khoản. Vui lòng đăng nhập bằng email và mật khẩu trước.",
  "This account does not use Google login": "Tài khoản này không sử dụng đăng nhập Google.",
  "User not found": "Không tìm thấy tài khoản.",
  "Member not found": "Không tìm thấy thành viên.",
  "Coach not found": "Không tìm thấy huấn luyện viên.",
  "Class not found": "Không tìm thấy lớp học.",
  "Course not found": "Không tìm thấy khóa học.",
  "Subject not found": "Không tìm thấy bộ môn.",
  "Lesson not found": "Không tìm thấy bài học.",
  "Learning path not found": "Không tìm thấy lộ trình học.",
  "Lesson progress not found": "Không tìm thấy tiến độ học.",
  "Workout plan not found": "Không tìm thấy kế hoạch tập luyện.",
  "Workout result not found": "Không tìm thấy kết quả tập luyện.",
  "Payment not found": "Không tìm thấy thanh toán.",
  "Notification not found": "Không tìm thấy thông báo.",
  "Support request not found": "Không tìm thấy yêu cầu hỗ trợ.",
  "Schedule not found": "Không tìm thấy lịch học.",
  "Attendance not found": "Không tìm thấy bản ghi điểm danh.",
  "Class registration not found": "Không tìm thấy đăng ký lớp học.",
  "Member profile not found": "Chưa có hồ sơ thành viên.",
  "Member profile not found. Please create your profile.": "Chưa có hồ sơ thành viên. Vui lòng tạo hồ sơ.",
  "Member profile not found. Please create your profile first.": "Chưa có hồ sơ thành viên. Vui lòng tạo hồ sơ trước.",
  "Member profile is missing. Please contact reception.": "Chưa có hồ sơ thành viên. Vui lòng liên hệ lễ tân.",
  "A member profile is required. Please contact reception.": "Cần có hồ sơ thành viên. Vui lòng liên hệ lễ tân.",
  "Coach profile is missing.": "Chưa có hồ sơ huấn luyện viên.",
  "Coach profile is missing. Please contact the center manager.": "Chưa có hồ sơ huấn luyện viên. Vui lòng liên hệ quản lý trung tâm.",
  "Member profile already exists": "Hồ sơ thành viên đã tồn tại.",
  "Coach profile already exists": "Hồ sơ huấn luyện viên đã tồn tại.",
  "Member is already registered for this class": "Thành viên đã đăng ký lớp học này.",
  "This class registration is already confirmed": "Đăng ký lớp học này đã được xác nhận.",
  "This coach is already assigned to another class": "Huấn luyện viên này đã được phân công cho lớp khác.",
  "Invalid member level": "Trình độ thành viên không hợp lệ.",
  "Invalid class registration status": "Trạng thái đăng ký lớp học không hợp lệ.",
  "Invalid support request status": "Trạng thái yêu cầu hỗ trợ không hợp lệ.",
  "Invalid date": "Ngày không hợp lệ.",
  "Invalid paymentDate": "Ngày thanh toán không hợp lệ.",
  "Only members can create their own profile": "Chỉ thành viên mới được tạo hồ sơ cá nhân.",
  "User role must be MEMBER": "Tài khoản phải có vai trò thành viên.",
  "User role must be COACH": "Tài khoản phải có vai trò huấn luyện viên.",
  "At least one field is required to update": "Vui lòng cung cấp ít nhất một thông tin cần cập nhật.",
  "Attendance already recorded for this member, class, lesson and date": "Thành viên đã được điểm danh cho lớp học, bài học và ngày này.",
  "Attendance must be PRESENT or ABSENT.": "Điểm danh phải là Có mặt hoặc Vắng mặt.",
  "Subject already exists": "Bộ môn đã tồn tại.",
  "Subject name is required": "Vui lòng nhập tên bộ môn.",
  "Course name already exists": "Tên khóa học đã tồn tại.",
  "Cannot change the subject of a course while it is assigned to a class": "Không thể đổi bộ môn của khóa học đã được sử dụng trong lớp. Bạn vẫn có thể sửa tên, mô tả, học phí và trạng thái.",
  "Course name cannot be empty": "Tên khóa học không được để trống.",
  "Learning path name cannot be empty": "Tên lộ trình học không được để trống.",
  "Lesson title cannot be empty": "Tiêu đề bài học không được để trống.",
  "A lesson with this order already exists in this learning path": "Lộ trình học đã có bài học ở thứ tự này.",
  "A lesson with this order already exists in this class": "Lớp đã có bài học ở thứ tự này.",
  "The learning path does not belong to the class course": "Lộ trình không thuộc khóa học của lớp.",
  "The learning path needs complete template lessons before scheduling": "Lộ trình cần có đầy đủ tiêu đề và nội dung từng bài mẫu trước khi tạo lịch.",
  "Template lessons changed; refresh the schedule preview": "Giáo án mẫu vừa thay đổi. Vui lòng xem trước lịch học lại.",
  "Class already has lessons; refresh the schedule preview": "Lớp đã có bài học. Vui lòng xem trước lịch học lại để dùng giáo án của lớp.",
  "Template lesson orders must be unique": "Thứ tự các bài mẫu bị trùng. Vui lòng kiểm tra lại giáo án.",
  "Cannot change the course of a learning path that has lessons": "Không thể chuyển lộ trình đã có bài học sang khóa học khác.",
  "Lesson progress already exists for this member": "Tiến độ bài học của thành viên đã tồn tại.",
  "Cannot delete course because it is being used by a learning path": "Không thể xóa khóa học đang được sử dụng trong lộ trình học.",
  "Cannot delete learning path because it is being used by a lesson": "Không thể xóa lộ trình học đang có bài học.",
  "Cannot delete lesson because it is being used by a schedule": "Không thể xóa bài học đã được xếp lịch.",
  "Cannot delete subject because it is being used by a class": "Không thể xóa bộ môn đang có lớp học.",
  "Payment confirmation by reception is not supported by the current backend.": "Hệ thống hiện chưa hỗ trợ lễ tân xác nhận thanh toán.",
  "Payment status and paymentDate cannot be changed through this endpoint": "Không thể thay đổi trạng thái và ngày thanh toán bằng thao tác này.",
  "Payment status and paymentDate cannot be changed through this endpoint.": "Không thể thay đổi trạng thái và ngày thanh toán bằng thao tác này.",
  "Enter a valid non-negative payment amount.": "Vui lòng nhập số tiền hợp lệ, không nhỏ hơn 0.",
  "amount must be a valid number >= 0": "Số tiền phải là số hợp lệ, không nhỏ hơn 0.",
  "amount must be >= 0": "Số tiền không được nhỏ hơn 0.",
  "This registration is no longer pending payment. Refresh to see its current status.": "Đăng ký này không còn chờ thanh toán. Vui lòng làm mới để xem trạng thái hiện tại.",
  "A payment is already pending. Please contact reception to confirm receipt.": "Đã có thanh toán đang chờ xử lý. Vui lòng liên hệ lễ tân để được hỗ trợ.",
  "Cannot make payment for a cancelled registration": "Không thể thanh toán cho đăng ký đã hủy.",
  "Cannot pay for a cancelled registration": "Không thể thanh toán cho đăng ký đã hủy.",
  "Cannot update payment for a cancelled registration": "Không thể cập nhật thanh toán cho đăng ký đã hủy.",
  "Cannot change classRegistrationId": "Không thể thay đổi đăng ký lớp học gắn với thanh toán.",
  "Only pending payments can be updated": "Chỉ có thể cập nhật thanh toán đang chờ xử lý.",
  "Only pending payments can be simulated": "Chỉ có thể mô phỏng thanh toán đang chờ xử lý.",
  "Mock payment mode is disabled": "Chế độ mô phỏng thanh toán chưa được bật.",
  "You cannot access this payment": "Bạn không có quyền truy cập thanh toán này.",
  "Simulation status must be SUCCESS or FAILED.": "Kết quả mô phỏng phải là Thành công hoặc Thất bại.",
  "order must be greater than or equal to 1": "Thứ tự phải lớn hơn hoặc bằng 1.",
  "isRead must be a boolean": "Trạng thái đã đọc phải là Có hoặc Không.",
  "invalid": "Giá trị không hợp lệ.",
};

export function errorText(message, context = {}) {
  if (typeof message === "string") {
    const text = message.trim();
    if (Object.hasOwn(errorMessages, text)) return errorMessages[text];
    const partial = text.match(/^(\d+) attendance records saved before the error\. Retry to update remaining records\. (.*)$/s);
    if (partial) return `Đã lưu ${partial[1]} lượt điểm danh trước khi xảy ra lỗi. Vui lòng thử lại để cập nhật các lượt còn lại. ${errorText(partial[2], context)}`;
    if (/^ATTENDANCE_(NOT_STARTED|ENDED|CANCELLED|INVALID_TIME)$/.test(context.code || "")) return message;
    if (/^ATTENDANCE_(NOT_STARTED|ENDED|CANCELLED|INVALID_TIME)$/.test(context.code || "")) return message;
    const refresh = text.match(/^Payment was recorded, but registration refresh failed: (.*)$/s);
    if (refresh) return `Đã ghi nhận thanh toán nhưng chưa làm mới được đăng ký. ${errorText(refresh[1], context)}`;
    const required = text.match(/^(.+) (?:are|is) required\.?$/);
    if (required) {
      const fields = required[1].split(/,\s*|\s+and\s+/).map(s => fieldLabels[s] || "thông tin");
      return `Vui lòng cung cấp ${fields.join(", ")}.`;
    }
    const empty = text.match(/^(\w+) must not be empty$/);
    if (empty) return `${fieldLabels[empty[1]] || "Thông tin"} không được để trống.`;
    const choices = text.match(/^(\w+) must be (.+)$/);
    if (choices) {
      const labels = choices[2].split(/,\s*|\s+or\s+/).map(uiLabel);
      if (labels.every(s => !/[A-Z_]{3,}/.test(s))) return `${fieldLabels[choices[1]] || "Thông tin"} phải là ${labels.join(", ")}.`;
    }
    if (/^Invalid (record|list) response for /.test(text)) return "Dữ liệu do hệ thống trả về không hợp lệ. Vui lòng thử lại.";
  }
  if (context.code === "NETWORK") return "Không thể kết nối với hệ thống. Vui lòng kiểm tra kết nối và thử lại.";
  if (context.code === "ABORTED") return "Yêu cầu hết thời gian chờ hoặc đã bị hủy. Vui lòng thử lại.";
  if (context.status === 401) return "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.";
  if (context.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (context.status === 404) return "Không tìm thấy thông tin được yêu cầu.";
  if (context.status === 409) return "Dữ liệu bị trùng hoặc xung đột. Vui lòng kiểm tra lại.";
  if (context.status >= 500) return "Hệ thống gặp lỗi nội bộ. Vui lòng thử lại sau.";
  return "Không thể hoàn tất yêu cầu. Vui lòng kiểm tra thông tin và thử lại.";
}

export function errorDetailsText(details, context = {}) {
  if (typeof details === "string") return errorText(details, context);
  if (Array.isArray(details)) return details.map(d => errorDetailsText(d, context)).join("\n");
  if (details && typeof details === "object") return Object.entries(details).map(([field, value]) => `${fieldLabels[field] || "Thông tin"}: ${errorDetailsText(value, context)}`).join("\n");
  return "Thông tin không hợp lệ.";
}
