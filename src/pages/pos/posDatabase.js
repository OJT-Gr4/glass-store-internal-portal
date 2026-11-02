// ============================================================
// OptiVision POS Terminal - Master Product Database
// Mapping SKU and Barcodes (EAN-13 / Code128 / UPC)
// ============================================================

export const PRODUCT_CATALOG = [
  {
    id: 1,
    barcode: '893850123401',
    sku: 'FRM-BOLON-BLK',
    name: 'Gọng Bolon Titanium Mắt Vuông - Đen Titan',
    category: 'Gọng Kính',
    price: 3250000,
    stock: 24,
    color: '#086288',
    brand: 'Bolon Eyewear'
  },
  {
    id: 2,
    barcode: '893850123402',
    sku: 'FRM-GM-BLK',
    name: 'Gọng Gentle Monster TR90 Cao Cấp Mắt Tròn',
    category: 'Gọng Kính',
    price: 1850000,
    stock: 45,
    color: '#1e293b',
    brand: 'Gentle Monster'
  },
  {
    id: 3,
    barcode: '893850123403',
    sku: 'FRM-GUCCI-GLD',
    name: 'Gọng Kính Gucci Mạ Vàng 18K Luxury Edition',
    category: 'Gọng Kính',
    price: 6800000,
    stock: 8,
    color: '#d97706',
    brand: 'Gucci Italy'
  },
  {
    id: 4,
    barcode: '893850123404',
    sku: 'SUN-RB-WAYF-BLK',
    name: 'Kính Râm Ray-Ban Polarized Wayfarer Chống Chói',
    category: 'Kính Râm',
    price: 4950000,
    stock: 15,
    color: '#065f46',
    brand: 'Ray-Ban'
  },
  {
    id: 5,
    barcode: '893850123405',
    sku: 'LNS-CHEMI-160',
    name: 'Cặp Tròng Kính Chemi U2 BlueCut 1.60 Lọc Ánh Sáng Xanh',
    category: 'Tròng Kính',
    price: 650000,
    stock: 120,
    color: '#2563eb',
    brand: 'Chemi Lens Hàn Quốc'
  },
  {
    id: 6,
    barcode: '893850123406',
    sku: 'LNS-ESSI-GEN8',
    name: 'Cặp Tròng Đổi Màu Essilor Transitions Signature Gen 8',
    category: 'Tròng Kính',
    price: 3380000,
    stock: 35,
    color: '#7c3aed',
    brand: 'Essilor Pháp'
  },
  {
    id: 7,
    barcode: '893850123407',
    sku: 'LNS-ZEISS-CLR',
    name: 'Cặp Tròng Kính Siêu Mỏng Zeiss ClearView BlueGuard 1.67',
    category: 'Tròng Kính',
    price: 4250000,
    stock: 18,
    color: '#0284c7',
    brand: 'Carl Zeiss Đức'
  },
  {
    id: 8,
    barcode: '893850123408',
    sku: 'ACC-CLEAN-SPY',
    name: 'Chai Xịt Nano Vệ Sinh Tròng Kính Chống Bám Bụi & Nước (60ml)',
    category: 'Phụ Kiện',
    price: 950000,
    stock: 250,
    color: '#059669',
    brand: 'OptiCare'
  },
  {
    id: 9,
    barcode: '893850123409',
    sku: 'ACC-MICRO-CLT',
    name: 'Khăn Lau Kính Microfiber Siêu Mịn Chuyên Dụng Nhãn Khoa',
    category: 'Phụ Kiện',
    price: 35000,
    stock: 500,
    color: '#475569',
    brand: 'OptiCare'
  },
  {
    id: 10,
    barcode: '893850123410',
    sku: 'ACC-BOX-LTH',
    name: 'Hộp Đựng Kính Bọc Da Cao Cấp Chống Va Đập Khóa Từ',
    category: 'Phụ Kiện',
    price: 180000,
    stock: 80,
    color: '#92400e',
    brand: 'OptiVision Official'
  }
];

/**
 * Find product by barcode or SKU (case-insensitive)
 */
export function findProductByBarcodeOrSku(query) {
  if (!query || !query.trim()) return null;
  const clean = query.trim().toUpperCase();

  return PRODUCT_CATALOG.find(
    (p) => p.barcode.toUpperCase() === clean || p.sku.toUpperCase() === clean
  );
}

