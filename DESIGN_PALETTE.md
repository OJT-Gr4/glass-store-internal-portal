# 🎨 BẢNG MÀU CHÍNH THỨC CỦA HỆ THỐNG GLASSSTORE (INTERNAL PORTAL)

Tài liệu này quy chuẩn hệ thống màu sắc nhận diện thương hiệu cho ứng dụng quản trị nội bộ **`internal-portal`** (POS bán hàng tại quầy, Phòng đo khám khúc xạ, Xưởng gia công kính Lab, Quản trị kho).

---

## 1. Bảng Màu Thương Hiệu (Brand Palette)

| Tên Màu | Mã HEX | Giá Trị RGB | Vai Trò Trong Internal Portal |
| :--- | :--- | :--- | :--- |
| **Primary Dark** | `#086288` | `rgb(8, 98, 136)` | **Sidebar**, Tiêu đề trang, Nút chính (Thu tiền/In bill/Lưu đơn), Tổng tiền thanh toán. |
| **Ocean Blue** | `#4D8DBA` | `rgb(77, 141, 186)` | **Menu Active Item**, Viền nút phụ, Icon tiền tố trong input form. |
| **Sky Accent** | `#97D7FF` | `rgb(151, 215, 255)` | Đường kẻ viền chia tách Sidebar, Viền card khám Mắt Phải (OD), Tag Prescription. |
| **Warm Cream** | `#FFEFC4` | `rgb(255, 239, 196)` | **Tag Mã SKU**, Badge chi nhánh, Viền card khám Mắt Trái (OS), Tag lệnh chờ gia công. |

---

## 2. Màu Bổ Trợ Chuẩn (Neutrals)

- **Nền ứng dụng (Content background)**: `#f8fafc`
- **Nền Card / Header**: `#ffffff`
- **Màu văn bản chính**: `#0f172a` hoặc `#1e293b`
- **Màu văn bản phụ**: `#64748b`
- **Đường viền bảng & khung (Borders)**: `#e2e8f0`

---

## 3. Cấu Hình Ant Design Theme (`ConfigProvider`)

Toàn bộ ứng dụng được bọc bởi `ConfigProvider` của Ant Design:

```jsx
import { ConfigProvider } from 'antd';

<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#086288',
      colorLink: '#4D8DBA',
      colorSuccess: '#086288',
      borderRadius: 8,
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
    }
  }}
>
  <App />
</ConfigProvider>
```

---

## 4. Quy Chuẩn Sử Dụng Cho Các Module Nội Bộ

### A. Quầy POS (`pos`):
- Nút Barcode & Quét: `#086288`
- Tag Mã SKU: Background `#FFEFC4`, chữ và viền `#086288`
- Tổng tiền thanh toán: Số to 26px, màu `#086288`, font weight 900
- Nút xác nhận thanh toán VietQR: Nền `#086288`, text trắng, đổ bóng `rgba(8, 98, 136, 0.3)`

### B. Phòng Khám Khúc Xạ (`optometry`):
- Card Mắt Phải (OD): Nền `#f0f9ff`, viền `#97D7FF`
- Card Mắt Trái (OS): Nền `#fffbeb`, viền `#FFEFC4`
- Nút Lưu phiếu khám: `#086288`

### C. Xưởng Lab Cắt Mài (`lab`):
- Trạng thái Chờ xử lý: Tag `#FFEFC4` + `#086288`
- Trạng thái Đang mài tròng: Tag xanh dương processing
- Trạng thái Đạt QC: Tag Success (`#086288`)
