# 🏬 GlassStore Internal Portal (Hệ Thống Quản Trị Nội Bộ & POS Bán Hàng)

Cổng thông tin vận hành nội bộ dành cho Nhân viên Bán hàng tại quầy (POS), Kỹ thuật viên Khúc xạ (Optometry), Kỹ thuật viên Xưởng kính Lab và Quản lý Kho chi nhánh.

---

## 🎨 Bảng Màu Chuẩn (Official Palette)

Tất cả thành viên trong nhóm code UI portal phải tuân thủ bảng màu chính thức:

| Tên Màu | Mã HEX | RGB | Ứng Dụng |
| :--- | :--- | :--- | :--- |
| **Primary Dark** | `#086288` | `rgb(8, 98, 136)` | Sidebar nền, Nút hành động chính, Header text, Tổng tiền bill |
| **Ocean Blue** | `#4D8DBA` | `rgb(77, 141, 186)` | Menu mục đang chọn (Active), Viền nút In bill |
| **Sky Accent** | `#97D7FF` | `rgb(151, 215, 255)` | Đường viền ngăn cách, Card Mắt Phải (OD) |
| **Warm Cream** | `#FFEFC4` | `rgb(255, 239, 196)` | Tag SKU sản phẩm, Badge chi nhánh, Card Mắt Trái (OS) |

> Xem chi tiết tại [DESIGN_PALETTE.md](./DESIGN_PALETTE.md).

---

## 🚀 Khởi Chạy Dự Án

```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy môi trường phát triển (Port 5174)
npm run dev
```

Truy cập: `http://localhost:5174`

---

## 📋 Các Phân Hệ Chức Năng (Modules)

1. **Bán Hàng POS Quầy (`pos`)**:
   - Quét mã vạch Barcode / nhập SKU nhanh
   - Tự động cộng dồn số lượng, tính tổng tiền hàng, áp mã Voucher
   - Nút In hóa đơn nhiệt K80 và Xác nhận thanh toán VietQR
2. **Phòng Đo Khám Khúc Xạ (`optometry`)**:
   - Nhập thông số chuẩn nhãn khoa riêng biệt: Mắt Phải (OD) & Mắt Trái (OS)
   - Lưu các chỉ số SPH, CYL, AXIS, ADD, PD (khoảng cách đồng tử)
   - In phiếu khám khúc xạ chuẩn A5
3. **Xưởng Mài Lắp Kính & QC (`lab`)**:
   - Quản lý quy trình gia công từ đơn kính thuốc
   - Chuyển trạng thái quy trình: Chờ xử lý -> Đang mài tròng -> Đạt kiểm định QC -> Sẵn sàng giao
4. **Quản Trị & Tồn Kho (`dashboard`)**:
   - Báo cáo doanh thu ca làm việc, số đơn bán ra, số ca đo mắt
   - Bảng theo dõi tồn kho khả dụng của chi nhánh
