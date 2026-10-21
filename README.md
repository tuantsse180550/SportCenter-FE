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
