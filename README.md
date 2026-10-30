# GlassStore Internal Portal - POS, Optometry & Eyewear Lab Management

Hệ thống quản trị và vận hành nội bộ dành cho chuỗi bán lẻ mắt kính, xây dựng trên nền tảng **React 18**, **Vite 5**, **Ant Design 5**, phục vụ nhân viên bán hàng tại quầy (POS), kỹ thuật viên đo mắt, kỹ thuật viên mài lắp kính (Lab) và quản lý cửa hàng.

---

## 1. Công nghệ sử dụng (Tech Stack)

- **Ngôn ngữ:** JavaScript / JSX (ES6+)
- **Framework UI:** React 18.3
- **Build Tool:** Vite 5.2
- **Thư viện Giao diện (UI Kit):** Ant Design 5.18 (`antd`) & `@ant-design/icons`
- **In hóa đơn & Phiếu đo:** `react-to-print` (In trực tiếp hóa đơn K80 và phiếu đo A5)
- **Biểu đồ thống kê:** `recharts` 2.12
- **Xử lý dữ liệu bảng & Xuất Excel:** `xlsx` (SheetJS)
- **Routing:** React Router DOM 6.23
- **HTTP Client:** Axios 1.7 (Giao tiếp với API Gateway)

---

## 2. Cấu trúc thư mục mã nguồn

```text
internal-portal/
├── public/                 # Static assets
├── src/
│   ├── api/                # Axios instance & Interceptor gắn JWT Token
│   ├── components/         # Common UI Components (Sidebar, Navbar, PrintTemplates)
│   ├── layouts/            # DashboardLayout (Sidebar phân quyền theo Role)
│   ├── pages/              # Các phân hệ nghiệp vụ nội bộ
│   │   ├── Login/          # Đăng nhập dành cho nhân viên / Admin
│   │   ├── Pos/            # Màn hình bán lẻ POS tại quầy, quét Barcode, in bill K80
│   │   ├── Optometry/      # Phòng đo mắt, nhập chỉ số OD/OS, in phiếu đo thị lực
│   │   ├── Lab/            # Xưởng gia công kính, cập nhật tiến độ mài tròng, QC
│   │   ├── Products/       # Quản lý danh mục, sản phẩm, SKU và tồn kho cửa hàng
│   │   ├── Orders/         # Quản lý đơn hàng toàn hệ thống, xử lý bảo hành
│   │   └── Dashboard/      # Biểu đồ doanh thu ngày/tháng, tỷ lệ kênh, xuất file Excel
│   ├── routes/             # Cấu hình PrivateRoutes & Phân quyền RBAC
│   ├── App.jsx             # Root Component cấu hình ConfigProvider Ant Design
│   └── main.jsx            # Entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## 3. Yêu cầu môi trường (Prerequisites)

- **Node.js:** 18.x hoặc 20.x trở lên
- **NPM:** 9.x hoặc 10.x trở lên

---

## 4. Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc:

| Tên biến | Giá trị mặc định | Mô tả |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Địa chỉ Gateway Backend |

---

## 5. Hướng dẫn khởi chạy (Getting Started)

### Cài đặt dependencies:
```bash
npm install
```

### Khởi chạy môi trường phát triển (Dev Mode):
```bash
npm run dev
```
Giao diện mặc định chạy tại địa chỉ: `http://localhost:5173` (hoặc `5174`)

### Đóng gói ứng dụng (Production Build):
```bash
npm run build
```
Mã nguồn sau khi tối ưu được sinh ra tại thư mục: `dist/`

---

## 6. Phân hệ nghiệp vụ & Màn hình chính

| Đường dẫn (Route) | Phân hệ nghiệp vụ | Vai trò sử dụng | Chức năng chi tiết theo SRS |
| :--- | :--- | :--- | :--- |
| `/pos` | **Bán hàng tại quầy (POS)** | Thu ngân, Sales Staff | Quét barcode sản phẩm, chọn khách hàng qua SĐT, áp voucher, thanh toán tiền mặt/VietQR, in hóa đơn nhiệt K80 |
| `/optometry` | **Phòng đo khúc xạ** | KTV Đo mắt | Form chuyên dụng nhập thông số khúc xạ $OD$ (Mắt phải) và $OS$ (Mắt trái): SPH, CYL, AXIS, ADD, PD; in phiếu đo A5 |
| `/lab` | **Xưởng gia công mài lắp** | KTV Xưởng Lab | Tiếp nhận đơn kính thuốc từ POS/Web, cập nhật trạng thái mài lắp: `Chờ mài` $\rightarrow$ `Đang cắt mài` $\rightarrow$ `Kiểm tra QC` $\rightarrow$ `Sẵn sàng bàn giao` |
| `/admin/products`| **Quản lý sản phẩm & Kho** | Quản lý, Admin | CRUD gọng kính, tròng kính; theo dõi tồn kho khả dụng tại từng chi nhánh |
| `/admin/orders` | **Đơn hàng & Bảo hành** | Quản lý, CSKH | Tra cứu đơn hàng, tiếp nhận bảo hành gọng/tròng theo số điện thoại |
| `/admin/dashboard`| **Báo cáo kinh doanh** | Quản lý, Chủ cửa hàng | Biểu đồ doanh thu tuần/tháng bằng `recharts`, thống kê đơn Online vs Offline, xuất dữ liệu ra file `.xlsx` |

---

## 7. Quy tắc Git & Phân nhánh (Git Workflow)

1. Nhánh `main`: Dành riêng cho bản phát hành chính thức, không commit trực tiếp.
2. Nhánh `dev`: Nhánh làm việc chung hàng ngày.
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/<ten-tinh-nang>
   ```
3. Commit thông điệp chuẩn mực:
   - `feat(pos): integrate react-to-print for receipt invoice`
   - `feat(optometry): add OD/OS measurement validation form`
   - `feat(lab): add status transition for eyewear cutting and QC check`
4. Push lên GitHub và tạo Pull Request merge vào nhánh `dev`.
