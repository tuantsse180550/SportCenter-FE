# SportCenter FE

Frontend quản lý trung tâm thể thao, xây dựng bằng React 19, Vite 8 và React Router 7, kết nối REST API SportCenter-BE.

## Yêu cầu

- Node.js 20.19+ thuộc nhánh 20 hoặc Node.js 22.12+.
- npm và backend SportCenter tương thích.

## Cài đặt và chạy

Từ thư mục dự án, tạo file `.env` local:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

Dùng origin backend, không thêm `/api`. Đây là cấu hình công khai; không đặt credential, JWT signing secret, MongoDB URI hoặc VNPay hash secret trong biến `VITE_*`. File `.env` không được đưa vào Git.

```sh
npm ci
npm run dev
```

Mở địa chỉ do Vite hiển thị, mặc định `http://localhost:5173`. Backend chạy riêng. Khởi động lại Vite sau khi đổi cấu hình môi trường.

## Scripts

| Lệnh | Chức năng |
|---|---|
| `npm run dev` | Chạy development server |
| `npm run lint` | Kiểm tra ESLint |
| `npm run build` | Build production vào `dist/` |
| `npm run preview` | Xem thử bản đã build |

## Cấu trúc và phân quyền

- `src/`: router, layout, UI, API client, services và trạng thái ứng dụng.
- `public/`: tài nguyên tĩnh được ứng dụng sử dụng.
- `vite.config.js`: cấu hình React/Vite.
- `vercel.json`: rewrite cho React Router khi deploy trên Vercel.
- `eslint.config.js`: cấu hình lint.

Ứng dụng hỗ trợ `CENTER_MANAGER`, `COACH`, `MEMBER` và `RECEPTIONIST`; role được lấy từ backend. Backend chịu trách nhiệm xác thực và kiểm tra quyền dữ liệu.

## Build và deploy

Cấu hình `VITE_API_BASE_URL` trong môi trường build trỏ tới backend HTTPS phù hợp, sau đó chạy `npm ci` và `npm run build`. Deploy thư mục `dist/`; trên Vercel chọn framework Vite, build command `npm run build` và output directory `dist`.

Với hosting khác, cấu hình fallback về `index.html` cho route SPA. Các biến Vite được đóng gói lúc build, nên cần build lại khi đổi API URL. Backend phải cho phép origin frontend qua CORS.

Repository phát hành chỉ gồm source, tài nguyên ứng dụng và cấu hình cài đặt/build/deploy. Tests, tài liệu nội bộ, seed/debug scripts và artifact được giữ local, không thuộc bản source đưa lên GitHub.

## Quản lý khóa học

Quản lý vào mục **Khóa học** (`/manager/courses`) để tạo hoặc chỉnh sửa bộ môn, tên, mô tả, học phí và trạng thái khóa học; nút **Giáo án** mở trình quản lý lộ trình và bài mẫu có sẵn. Mỗi khóa học có một học phí trọn khóa cho từng học viên (`price`), không chia theo sĩ số lớp hay loại hình nhóm/cá nhân. Đăng ký lưu giá đã chốt trong `priceSnapshot`; thay đổi bảng giá không đổi số tiền của đăng ký và giao dịch cũ.

Trong form tạo lớp, chọn bộ môn rồi bấm **Tạo khóa học mới** cạnh ô khóa học. Khóa mới được tạo ở trạng thái hoạt động và chọn sẵn khi quay lại; tên lớp và HLV đã chọn được giữ nguyên. Khóa ngừng hoạt động không được đưa vào lựa chọn cho lớp mới.

## Kết quả thanh toán

Khách đăng ký tại chi tiết lớp, sau đó thanh toán qua VNPay Sandbox. Mục **Thanh toán của tôi** (`/member/payments`) hiển thị đăng ký chờ thanh toán và lịch sử giao dịch của chính khách hàng; có thể tiếp tục giao dịch đang chờ hoặc tạo giao dịch mới sau khi thất bại.

Để chạy local, FE dùng `VITE_API_BASE_URL=http://localhost:5000`; BE dùng `PAYMENT_MODE=vnpay`, thông tin merchant sandbox và `VNPAY_RETURN_URL=http://localhost:5173/payment-result`. Chạy FE đúng cổng 5173 bằng `npm run dev -- --port 5173 --strictPort`. Khởi động lại BE/FE sau khi sửa env. Không đưa secret VNPay vào FE.

VNPay trả trình duyệt trực tiếp về `/payment-result` kèm tham số `vnp_*`. Sau khi đăng nhập, FE gửi nguyên tham số có chữ ký tới `POST /api/payments/vnpay/verify-return`. BE xác minh chữ ký, merchant, số tiền, quyền sở hữu và cập nhật Payment/Registration trong cùng transaction. FE hiển thị ngay trạng thái trong phản hồi xác minh của BE, rồi tải riêng biên nhận; không gọi lại API trạng thái khi đã có kết quả xác minh hợp lệ. `GET /api/payments/:id/status` vẫn dùng để kiểm tra giao dịch đang chờ và tra cứu lịch sử bằng `?paymentId=<Payment._id>`. FE không tự xác nhận theo mã trên URL. Với HTML từ `GET /api/payments/:id/receipt`, FE kiểm tra mã biên nhận, trạng thái và các dòng dữ liệu rồi hiển thị bằng React. Không nhúng iframe hoặc chèn HTML vào trang; chỉ lấy nội dung chữ. Biên nhận thiếu nội dung hoặc tải lỗi sẽ có thông báo và nút kiểm tra lại.

Luồng browser return cho phép thử thanh toán local mà không cần tunnel. Nếu khách đóng trình duyệt trước khi quay về, cần IPN để cập nhật độc lập: cấu hình URL HTTPS công khai tới `GET /api/payments/vnpay-ipn` (tunnel tới BE local hoặc BE đã deploy). Callback lặp không làm mất kết quả thành công. MongoDB cần hỗ trợ transaction (Atlas hoặc replica set). `vercel.json` đã có SPA rewrite cho trang kết quả khi deploy.
