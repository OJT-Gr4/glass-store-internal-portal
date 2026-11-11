import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Dropdown,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  PictureOutlined,
  ReloadOutlined,
  StopOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { catalogManagementApi } from '../../api/catalogManagementApi';

const { Text, Title } = Typography;

const RESOURCE_CONFIG = {
  products: { title: 'Sản phẩm & Biến thể', singular: 'sản phẩm' },
  categories: { title: 'Danh mục', singular: 'danh mục' },
  brands: { title: 'Thương hiệu', singular: 'thương hiệu' },
  locations: { title: 'Cửa hàng / kho', singular: 'địa điểm' }
};

const PRODUCT_TYPE_LABELS = {
  FRAME: { label: 'Gọng kính', color: 'blue' },
  LENS: { label: 'Tròng kính', color: 'purple' },
  SUNGLASSES: { label: 'Kính mát', color: 'gold' },
  ACCESSORY: { label: 'Phụ kiện', color: 'cyan' }
};

const STATUS_CONFIG = {
  ACTIVE: { label: 'Đang kinh doanh', color: 'green', icon: <CheckCircleOutlined /> },
  HIDDEN: { label: 'Đã ẩn (khách không thấy)', color: 'orange', icon: <EyeInvisibleOutlined /> },
  DISCONTINUED: { label: 'Ngừng kinh doanh', color: 'default', icon: <StopOutlined /> }
};

const EMPTY_DATA = { products: [], categories: [], brands: [], locations: [] };

const formatMoney = (val) => (val != null ? `${Number(val).toLocaleString('vi-VN')} đ` : '—');

const SAMPLE_IMAGE_PRESETS = [
  { label: 'Gọng Bolon Square', url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=500' },
  { label: 'Gọng Bolon Rose Gold', url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=500' },
  { label: 'Gọng Gentle Monster', url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=500' },
  { label: 'Kính Aviator Vàng', url: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=500' },
  { label: 'Tròng Chemi / Essilor', url: 'https://images.unsplash.com/photo-1582142839970-2b9da988941f?w=500' },
  { label: 'Kính Râm Wayfarer', url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500' },
  { label: 'Hộp Đựng Da & Khăn', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500' }
];

export default function CatalogManagementPage() {
  const [form] = Form.useForm();
  const [variantForm] = Form.useForm();
  const [priceForm] = Form.useForm();

  const watchedProductImage = Form.useWatch('initialImageUrl', form);
  const watchedVariantImage = Form.useWatch('imageUrl', variantForm);

  const handleImageFileSelect = (e, targetForm, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.error('Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP, GIF).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      targetForm.setFieldsValue({ [fieldName]: loadEvent.target.result });
    };
    reader.readAsDataURL(file);
  };

  const [activeTab, setActiveTab] = useState('products');
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Modals state
  const [modal, setModal] = useState({ open: false, record: null });
  const [variantModal, setVariantModal] = useState({ open: false, product: null, variant: null });
  const [priceModal, setPriceModal] = useState({ open: false, variant: null });

  // Product filters
  const [productFilter, setProductFilter] = useState({
    keyword: '',
    categoryId: undefined,
    brandId: undefined,
    productType: undefined,
    status: 'ALL'
  });

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [productsRes, categoriesRes, brandsRes, locationsRes] = await Promise.all([
        catalogManagementApi.getProducts(productFilter),
        catalogManagementApi.getCategories(),
        catalogManagementApi.getBrands(),
        catalogManagementApi.getLocations()
      ]);

      const products = productsRes?.data || productsRes || [];
      const categories = categoriesRes?.data || categoriesRes || [];
      const brands = brandsRes?.data || brandsRes || [];
      const locations = locationsRes?.data || locationsRes || [];

      setData({
        products: Array.isArray(products) ? products : [],
        categories: Array.isArray(categories) ? categories : [],
        brands: Array.isArray(brands) ? brands : [],
        locations: Array.isArray(locations) ? locations : []
      });
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Không thể tải dữ liệu quản trị danh mục.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [productFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal
  const openCreate = () => {
    form.resetFields();
    if (activeTab === 'products') {
      form.setFieldsValue({
        productType: 'FRAME',
        status: 'ACTIVE'
      });
    }
    setModal({ open: true, record: null });
  };

  // Open Edit Modal
  const openEdit = (record) => {
    const firstVariant = record.variants?.[0];
    form.setFieldsValue({
      ...record,
      initialImageUrl: firstVariant?.imageUrl || '',
    });
    setModal({ open: true, record });
  };

  const closeModal = () => {
    if (saving) return;
    setModal({ open: false, record: null });
    form.resetFields();
  };

  // Save Record (Category, Brand, Location, Product)
  const saveRecord = async (values) => {
    setSaving(true);
    const { record } = modal;
    try {
      if (activeTab === 'products') {
        if (record) {
          await catalogManagementApi.updateProduct(record.id, {
            name: values.name,
            slug: values.slug || undefined,
            categoryId: values.categoryId,
            brandId: values.brandId,
            productType: values.productType,
            description: values.description,
            status: values.status
          });

          // Đồng bộ cập nhật ảnh cho biến thể chính của sản phẩm nếu có thay đổi
          const primaryVariant = record.variants?.[0];
          if (primaryVariant && values.initialImageUrl !== undefined && values.initialImageUrl !== primaryVariant.imageUrl) {
            await catalogManagementApi.updateVariant(primaryVariant.id, {
              sku: primaryVariant.sku,
              barcode: primaryVariant.barcode,
              name: primaryVariant.name,
              color: primaryVariant.color,
              frameShape: primaryVariant.frameShape,
              material: primaryVariant.material,
              lensIndex: primaryVariant.lensIndex,
              price: primaryVariant.price,
              costPrice: primaryVariant.costPrice,
              imageUrl: values.initialImageUrl,
              status: primaryVariant.status || 'ACTIVE'
            });
          }
        } else {
          const payload = {
            name: values.name,
            slug: values.slug || undefined,
            categoryId: values.categoryId,
            brandId: values.brandId,
            productType: values.productType,
            description: values.description,
            status: values.status || 'ACTIVE'
          };
          if (values.initialSku && values.initialPrice !== undefined && values.initialCostPrice !== undefined) {
            payload.variants = [{
              sku: values.initialSku,
              barcode: values.initialBarcode || values.initialSku,
              name: values.initialVariantName || values.name,
              color: values.initialColor,
              price: values.initialPrice,
              costPrice: values.initialCostPrice,
              imageUrl: values.initialImageUrl,
              status: 'ACTIVE'
            }];
          }
          await catalogManagementApi.createProduct(payload);
        }
      } else if (activeTab === 'categories') {
        if (record) await catalogManagementApi.updateCategory(record.id, values);
        else await catalogManagementApi.createCategory(values);
      } else if (activeTab === 'brands') {
        if (record) await catalogManagementApi.updateBrand(record.id, values);
        else await catalogManagementApi.createBrand(values);
      } else if (record) {
        await catalogManagementApi.updateLocation(record.id, {
          name: values.name,
          area: values.area,
          locationType: values.locationType
        });
      } else {
        await catalogManagementApi.createLocation(values);
      }

      message.success(`Đã ${record ? 'cập nhật' : 'tạo'} ${RESOURCE_CONFIG[activeTab].singular}.`);
      setModal({ open: false, record: null });
      form.resetFields();
      await loadData(false);
    } catch (error) {
      message.error(error.message || `Không thể lưu ${RESOURCE_CONFIG[activeTab].singular}.`);
    } finally {
      setSaving(false);
    }
  };

  // Delete Record
  const deleteRecord = async (record) => {
    try {
      if (activeTab === 'products') await catalogManagementApi.deleteProduct(record.id);
      else if (activeTab === 'categories') await catalogManagementApi.deleteCategory(record.id);
      else if (activeTab === 'brands') await catalogManagementApi.deleteBrand(record.id);
      else await catalogManagementApi.deleteLocation(record.id);

      message.success(`Đã xử lý xóa / ngừng ${RESOURCE_CONFIG[activeTab].singular}.`);
      await loadData(false);
    } catch (error) {
      message.error(error.message || `Không thể xóa ${RESOURCE_CONFIG[activeTab].singular}.`);
    }
  };

  // Toggle Location Active
  const toggleLocation = async (record, active) => {
    try {
      await catalogManagementApi.setLocationActive(record.id, active);
      message.success(`Đã ${active ? 'kích hoạt' : 'vô hiệu hóa'} ${record.name}.`);
      await loadData(false);
    } catch (error) {
      message.error(error.message || 'Không thể cập nhật trạng thái địa điểm.');
    }
  };

  // Product status change
  const handleProductStatusChange = async (product, newStatus) => {
    try {
      await catalogManagementApi.setProductStatus(product.id, newStatus);
      message.success(`Đã cập nhật trạng thái sản phẩm ${product.name} sang ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      await loadData(false);
    } catch (error) {
      message.error(error.message || 'Không thể cập nhật trạng thái sản phẩm.');
    }
  };

  // Variant Modal Open
  const openAddVariant = (product) => {
    variantForm.resetFields();
    variantForm.setFieldsValue({
      status: 'ACTIVE',
      price: 0,
      costPrice: 0
    });
    setVariantModal({ open: true, product, variant: null });
  };

  const openEditVariant = (product, variant) => {
    variantForm.resetFields();
    variantForm.setFieldsValue(variant);
    setVariantModal({ open: true, product, variant });
  };

  const closeVariantModal = () => {
    if (saving) return;
    setVariantModal({ open: false, product: null, variant: null });
    variantForm.resetFields();
  };

  const saveVariant = async (values) => {
    setSaving(true);
    const { product, variant } = variantModal;
    try {
      if (variant) {
        await catalogManagementApi.updateVariant(variant.id, values);
        message.success(`Đã cập nhật biến thể SKU ${values.sku}.`);
      } else {
        await catalogManagementApi.createVariant(product.id, values);
        message.success(`Đã tạo biến thể mới SKU ${values.sku} cho sản phẩm.`);
      }
      setVariantModal({ open: false, product: null, variant: null });
      variantForm.resetFields();
      await loadData(false);
    } catch (error) {
      message.error(error.message || 'Không thể lưu biến thể sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const deleteVariant = async (variant) => {
    try {
      await catalogManagementApi.deleteVariant(variant.id);
      message.success(`Đã ngừng kinh doanh biến thể SKU ${variant.sku}.`);
      await loadData(false);
    } catch (error) {
      message.error(error.message || 'Không thể xóa / ngừng biến thể.');
    }
  };

  // Quick Price Edit Modal
  const openPriceEdit = (variant) => {
    priceForm.setFieldsValue({
      price: variant.price,
      costPrice: variant.costPrice
    });
    setPriceModal({ open: true, variant });
  };

  const closePriceModal = () => {
    if (saving) return;
    setPriceModal({ open: false, variant: null });
    priceForm.resetFields();
  };

  const savePrice = async (values) => {
    setSaving(true);
    const { variant } = priceModal;
    try {
      await catalogManagementApi.updateVariantPrice(variant.id, values);
      message.success(`Đã cập nhật giá cho biến thể SKU ${variant.sku}.`);
      setPriceModal({ open: false, variant: null });
      priceForm.resetFields();
      await loadData(false);
    } catch (error) {
      message.error(error.message || 'Không thể cập nhật giá biến thể.');
    } finally {
      setSaving(false);
    }
  };

  // Variant subtable columns
  const variantColumns = [
    {
      title: 'Mã SKU / Barcode',
      key: 'skuBarcode',
      render: (_, v) => (
        <Space direction="vertical" size={2}>
          <Text strong copyable className="text-[#086288]">{v.sku}</Text>
          <Text type="secondary" className="text-xs">Barcode: {v.barcode || '—'}</Text>
        </Space>
      )
    },
    {
      title: 'Tên biến thể & Ảnh',
      key: 'nameImg',
      render: (_, v) => (
        <Space orientation="horizontal" align="center" size={8}>
          {v.imageUrl ? (
            <Image
              src={v.imageUrl}
              alt={v.name}
              width={36}
              height={36}
              className="rounded object-cover border border-slate-200"
              fallback="https://placehold.co/100x100?text=No+Img"
            />
          ) : (
            <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
              Ảnh
            </div>
          )}
          <Space direction="vertical" size={0}>
            <Text strong className="text-xs">{v.name}</Text>
            <Text type="secondary" className="text-[11px]">
              {[v.color, v.frameShape, v.lensIndex ? `Index ${v.lensIndex}` : null, v.material].filter(Boolean).join(' · ') || '—'}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      key: 'price',
      render: (price, v) => (
        <Space>
          <Text strong className="text-slate-800">{formatMoney(price)}</Text>
          <Tooltip title="Sửa nhanh giá">
            <Button
              type="text"
              size="small"
              icon={<DollarOutlined className="text-emerald-600" />}
              onClick={() => openPriceEdit(v)}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: 'Giá vốn',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (cp) => <Text type="secondary">{formatMoney(cp)}</Text>
    },
    {
      title: 'Tồn khả dụng',
      key: 'stock',
      render: (_, v) => (
        <Tooltip title="Số dư tồn kho chỉ quản lý qua phiếu kho (Nhập/Xuất/Chuyển), không sửa trực tiếp">
          <Badge
            count={v.availableQuantity ?? v.stockQuantity ?? 0}
            overflowCount={9999}
            style={{ backgroundColor: (v.availableQuantity ?? v.stockQuantity ?? 0) > 0 ? '#10b981' : '#f59e0b' }}
          />
        </Tooltip>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st, v) => {
        const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.ACTIVE;
        return (
          <Dropdown
            menu={{
              items: [
                { key: 'ACTIVE', label: 'Đang kinh doanh' },
                { key: 'HIDDEN', label: 'Ẩn khỏi catalog khách' },
                { key: 'DISCONTINUED', label: 'Ngừng kinh doanh' }
              ],
              onClick: ({ key }) => catalogManagementApi.setVariantStatus(v.id, key).then(() => {
                message.success('Đã cập nhật trạng thái biến thể.');
                loadData(false);
              })
            }}
          >
            <Tag color={cfg.color} className="cursor-pointer">
              {cfg.label} <DownOutlined className="text-[9px]" />
            </Tag>
          </Dropdown>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'variantActions',
      width: 110,
      render: (_, v, record, index, product) => (
        <Space orientation="horizontal" size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-label={`Sửa biến thể ${v.sku}`}
            onClick={() => openEditVariant(product, v)}
          />
          <Popconfirm
            title="Ngừng kinh doanh biến thể này?"
            description="Lịch sử các đơn hàng trước đây vẫn được bảo toàn nguyên vẹn."
            okText="Xác nhận"
            cancelText="Hủy"
            onConfirm={() => deleteVariant(v)}
          >
            <Button danger size="small" icon={<StopOutlined />} aria-label={`Ngừng biến thể ${v.sku}`} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Columns for main tabs
  const columns = useMemo(() => {
    const actions = {
      title: 'Thao tác',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          {activeTab === 'products' && (
            <Tooltip title="Thêm biến thể SKU mới">
              <Button
                type="dashed"
                icon={<PlusCircleOutlined />}
                onClick={() => openAddVariant(record)}
              />
            </Tooltip>
          )}
          <Button
            aria-label={`Sửa ${record.name}`}
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title={`Xóa / ngừng ${RESOURCE_CONFIG[activeTab].singular}?`}
            description="Sản phẩm có đơn hàng sẽ được chuyển sang Ngừng kinh doanh để bảo toàn lịch sử."
            okText="Xác nhận"
            cancelText="Hủy"
            onConfirm={() => deleteRecord(record)}
          >
            <Button danger aria-label={`Xóa ${record.name}`} icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    };

    if (activeTab === 'products') {
      return [
        {
          title: 'Sản phẩm',
          dataIndex: 'name',
          key: 'name',
          render: (name, p) => {
            const firstImg = p.variants?.find(v => v.imageUrl)?.imageUrl;
            return (
              <Space align="center" size={10}>
                {firstImg ? (
                  <Image
                    src={firstImg}
                    alt={name}
                    width={44}
                    height={44}
                    className="rounded-lg object-cover border border-slate-200"
                    fallback="https://placehold.co/100x100?text=No+Img"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-semibold">
                    Ảnh
                  </div>
                )}
                <Space direction="vertical" size={1}>
                  <Text strong className="text-sm text-slate-900">{name}</Text>
                  <Text type="secondary" className="text-xs">Slug: <code className="bg-slate-100 px-1 py-0.5 rounded">{p.slug}</code></Text>
                  {p.description && <Text type="secondary" className="text-xs italic line-clamp-1">{p.description}</Text>}
                </Space>
              </Space>
            );
          }
        },
        {
          title: 'Loại sản phẩm',
          dataIndex: 'productType',
          key: 'productType',
          render: (type) => {
            const cfg = PRODUCT_TYPE_LABELS[type] || { label: type, color: 'default' };
            return <Tag color={cfg.color}>{cfg.label}</Tag>;
          }
        },
        {
          title: 'Danh mục',
          dataIndex: 'categoryName',
          key: 'categoryName',
          render: (cat) => cat || '—'
        },
        {
          title: 'Thương hiệu',
          dataIndex: 'brandName',
          key: 'brandName',
          render: (b) => <Text strong>{b || '—'}</Text>
        },
        {
          title: 'Biến thể',
          key: 'variantsCount',
          render: (_, p) => (
            <Badge
              count={p.variants?.length || 0}
              showZero
              style={{ backgroundColor: '#086288' }}
            />
          )
        },
        {
          title: 'Trạng thái',
          dataIndex: 'status',
          key: 'status',
          render: (st, p) => {
            const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.ACTIVE;
            return (
              <Dropdown
                menu={{
                  items: [
                    { key: 'ACTIVE', label: 'Đang kinh doanh' },
                    { key: 'HIDDEN', label: 'Ẩn khỏi catalog khách' },
                    { key: 'DISCONTINUED', label: 'Ngừng kinh doanh' }
                  ],
                  onClick: ({ key }) => handleProductStatusChange(p, key)
                }}
              >
                <Tag color={cfg.color} className="cursor-pointer py-0.5 px-2">
                  {cfg.icon} {cfg.label} <DownOutlined className="text-[9px] ml-1" />
                </Tag>
              </Dropdown>
            );
          }
        },
        actions
      ];
    }

    if (activeTab === 'categories') {
      return [
        { title: 'Tên danh mục', dataIndex: 'name', key: 'name' },
        { title: 'Slug', dataIndex: 'slug', key: 'slug' },
        { title: 'Mô tả', dataIndex: 'description', key: 'description', render: (value) => value || '—' },
        actions
      ];
    }
    if (activeTab === 'brands') {
      return [
        { title: 'Tên thương hiệu', dataIndex: 'name', key: 'name' },
        { title: 'Quốc gia', dataIndex: 'country', key: 'country', render: (value) => value || '—' },
        { title: 'Mô tả', dataIndex: 'description', key: 'description', render: (value) => value || '—' },
        actions
      ];
    }
    return [
      { title: 'Mã địa điểm', dataIndex: 'code', key: 'code' },
      { title: 'Tên địa điểm', dataIndex: 'name', key: 'name' },
      { title: 'Khu vực', dataIndex: 'area', key: 'area', render: (value) => value || '—' },
      {
        title: 'Loại',
        dataIndex: 'locationType',
        key: 'locationType',
        render: (value) => (value === 'BRANCH' ? 'Chi nhánh' : value === 'WAREHOUSE' ? 'Kho' : 'Chưa phân loại')
      },
      {
        title: 'Trạng thái',
        dataIndex: 'active',
        key: 'active',
        render: (active, record) => (
          <Space>
            <Switch checked={active} onChange={(checked) => toggleLocation(record, checked)} />
            <Tag color={active ? 'green' : 'default'}>{active ? 'Đang hoạt động' : 'Đã ẩn'}</Tag>
          </Space>
        )
      },
      actions
    ];
  }, [activeTab]);

  const tabs = Object.entries(RESOURCE_CONFIG).map(([key, config]) => ({
    key,
    label: config.title
  }));
  const currentConfig = RESOURCE_CONFIG[activeTab];
  const records = data[activeTab] || [];

  return (
    <main className="min-h-screen w-full bg-[#f9f9ff]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 sm:p-6">
        <header className="flex flex-col justify-between gap-4 rounded-xl border border-[#d8e3fb]/50 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#086288]">Quản trị hệ thống (Catalog Admin)</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Sản phẩm, biến thể, giá và danh mục</h1>
            <p className="mt-1 text-sm text-slate-600">
              Quản trị toàn diện danh mục hàng hoá. Giá thay đổi qua server, ẩn/ngừng sản phẩm bảo toàn lịch sử đơn.
            </p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="bg-[#086288]">
            Thêm {currentConfig.singular}
          </Button>
        </header>

        <section className="rounded-xl border border-[#d8e3fb]/50 bg-white p-4 shadow-sm sm:p-5">
          {loadError && (
            <Alert
              className="mb-4"
              type="error"
              showIcon
              message="Không thể tải dữ liệu"
              description={loadError}
              action={<Button icon={<ReloadOutlined />} onClick={() => loadData()}>Thử lại</Button>}
            />
          )}

          <Tabs activeKey={activeTab} items={tabs} onChange={setActiveTab} />

          {/* Toolbar for Product Tab */}
          {activeTab === 'products' && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex flex-wrap gap-3 items-center">
              <Input.Search
                placeholder="Tìm tên, SKU, barcode, mô tả..."
                allowClear
                value={productFilter.keyword}
                onChange={(e) => setProductFilter((prev) => ({ ...prev, keyword: e.target.value }))}
                style={{ width: 280 }}
              />
              <Select
                placeholder="Loại sản phẩm"
                allowClear
                value={productFilter.productType}
                onChange={(val) => setProductFilter((prev) => ({ ...prev, productType: val }))}
                style={{ width: 150 }}
                options={[
                  { value: 'FRAME', label: 'Gọng kính' },
                  { value: 'LENS', label: 'Tròng kính' },
                  { value: 'SUNGLASSES', label: 'Kính mát' },
                  { value: 'ACCESSORY', label: 'Phụ kiện' }
                ]}
              />
              <Select
                placeholder="Danh mục"
                allowClear
                value={productFilter.categoryId}
                onChange={(val) => setProductFilter((prev) => ({ ...prev, categoryId: val }))}
                style={{ width: 180 }}
                options={data.categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Select
                placeholder="Thương hiệu"
                allowClear
                value={productFilter.brandId}
                onChange={(val) => setProductFilter((prev) => ({ ...prev, brandId: val }))}
                style={{ width: 170 }}
                options={data.brands.map((b) => ({ value: b.id, label: b.name }))}
              />
              <Select
                placeholder="Trạng thái"
                value={productFilter.status}
                onChange={(val) => setProductFilter((prev) => ({ ...prev, status: val }))}
                style={{ width: 160 }}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'ACTIVE', label: 'Đang kinh doanh' },
                  { value: 'HIDDEN', label: 'Đã ẩn' },
                  { value: 'DISCONTINUED', label: 'Ngừng kinh doanh' }
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={() => loadData(true)}>
                Làm mới
              </Button>
            </div>
          )}

          {loading && !records.length ? (
            <div className="flex justify-center py-12"><Spin /></div>
          ) : (
            <Table
              rowKey="id"
              columns={columns}
              dataSource={records}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: loadError ? 'Không có dữ liệu để hiển thị.' : 'Chưa có dữ liệu.' }}
              expandable={activeTab === 'products' ? {
                expandedRowRender: (record) => (
                  <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <Text strong className="text-xs uppercase tracking-wide text-slate-600">
                        Danh sách biến thể của: {record.name} ({record.variants?.length || 0} biến thể)
                      </Text>
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openAddVariant(record)}
                        className="bg-[#086288]"
                      >
                        Thêm biến thể
                      </Button>
                    </div>
                    <Table
                      rowKey="id"
                      columns={variantColumns.map((col) => ({
                        ...col,
                        render: (...args) => (col.render ? col.render(args[0], args[1], args[2], args[3], record) : args[0])
                      }))}
                      dataSource={record.variants || []}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: 'Chưa có biến thể nào cho sản phẩm này.' }}
                    />
                  </div>
                ),
                rowExpandable: () => true
              } : undefined}
            />
          )}
        </section>
      </div>

      {/* Main CRUD Modal (Product / Category / Brand / Location) */}
      <Modal
        title={`${modal.record ? 'Sửa' : 'Thêm'} ${currentConfig.singular}`}
        open={modal.open}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText="Lưu"
        cancelText="Hủy"
        width={activeTab === 'products' ? 700 : 520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={saveRecord}>
          {activeTab === 'products' && (
            <>
              <Form.Item
                name="name"
                label="Tên sản phẩm"
                rules={[{ required: true, whitespace: true, message: 'Nhập tên sản phẩm.' }, { max: 255 }]}
              >
                <Input placeholder="Ví dụ: Gọng Kính Bolon Graceful BJ3120" maxLength={255} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="productType"
                    label="Loại sản phẩm"
                    rules={[{ required: true, message: 'Chọn loại sản phẩm.' }]}
                  >
                    <Select
                      options={[
                        { value: 'FRAME', label: 'Gọng kính' },
                        { value: 'LENS', label: 'Tròng kính' },
                        { value: 'SUNGLASSES', label: 'Kính mát' },
                        { value: 'ACCESSORY', label: 'Phụ kiện' }
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="status"
                    label="Trạng thái kinh doanh"
                    initialValue="ACTIVE"
                    rules={[{ required: true, message: 'Chọn trạng thái.' }]}
                  >
                    <Select
                      options={[
                        { value: 'ACTIVE', label: 'Đang kinh doanh (Hiển thị)' },
                        { value: 'HIDDEN', label: 'Ẩn khỏi catalog khách' },
                        { value: 'DISCONTINUED', label: 'Ngừng kinh doanh' }
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="categoryId"
                    label="Danh mục"
                    rules={[{ required: true, message: 'Chọn danh mục.' }]}
                  >
                    <Select
                      placeholder="Chọn danh mục"
                      options={data.categories.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="brandId"
                    label="Thương hiệu"
                    rules={[{ required: true, message: 'Chọn thương hiệu.' }]}
                  >
                    <Select
                      placeholder="Chọn thương hiệu"
                      options={data.brands.map((b) => ({ value: b.id, label: b.name }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="slug"
                label="Slug URL"
                tooltip="Tự động sinh từ tên sản phẩm nếu để trống."
                rules={[{ max: 255 }]}
              >
                <Input placeholder="Tự động sinh nếu để trống (ví dụ: gong-kinh-bolon-bj3120)" maxLength={255} />
              </Form.Item>

              <Form.Item name="description" label="Mô tả sản phẩm">
                <Input.TextArea rows={3} placeholder="Mô tả chất liệu, tính năng nổi bật..." />
              </Form.Item>

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="initialImageUrl"
                    label="Hình ảnh sản phẩm (URL hoặc tải từ máy)"
                    tooltip="Nhập URL ảnh từ internet hoặc bấm nút tải ảnh từ máy tính"
                  >
                    <Input
                      placeholder="https://images.unsplash.com/... hoặc chọn tệp"
                      suffix={
                        <label className="cursor-pointer text-[#086288] hover:text-[#004967] text-xs font-semibold flex items-center gap-1 m-0">
                          <UploadOutlined /> Tải ảnh
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageFileSelect(e, form, 'initialImageUrl')}
                          />
                        </label>
                      }
                    />
                  </Form.Item>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-[11px] text-slate-400 mr-1 self-center">Gợi ý ảnh mẫu:</span>
                    {SAMPLE_IMAGE_PRESETS.slice(0, 4).map((p) => (
                      <Tag
                        key={p.label}
                        className="cursor-pointer hover:border-[#086288] hover:text-[#086288]"
                        onClick={() => form.setFieldsValue({ initialImageUrl: p.url })}
                      >
                        {p.label}
                      </Tag>
                    ))}
                  </div>
                </Col>
                <Col span={8}>
                  <div className="flex flex-col items-center justify-center p-2 border border-dashed border-slate-300 rounded-lg bg-slate-50 min-h-[95px]">
                    {watchedProductImage ? (
                      <div className="relative group text-center">
                        <Image
                          src={watchedProductImage}
                          alt="Xem trước ảnh"
                          width={75}
                          height={75}
                          className="rounded object-cover"
                          fallback="https://placehold.co/100x100?text=Loi+Anh"
                        />
                        <Button
                          size="small"
                          danger
                          type="text"
                          className="text-[10px] p-0 block mx-auto mt-1"
                          onClick={() => form.setFieldsValue({ initialImageUrl: '' })}
                        >
                          Gỡ ảnh
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 text-xs py-2">
                        <PictureOutlined style={{ fontSize: 24 }} />
                        <div className="text-[11px] mt-1">Xem trước ảnh</div>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>

              {!modal.record && (
                <>
                  <Divider plain className="text-xs text-slate-500 font-semibold">
                    Khởi tạo biến thể đầu tiên (Tùy chọn)
                  </Divider>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="initialSku" label="Mã SKU ban đầu">
                        <Input placeholder="Ví dụ: BL-BJ3120-C10" maxLength={100} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="initialBarcode" label="Mã Barcode">
                        <Input placeholder="Tự sinh hoặc quét mã vạch" maxLength={100} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="initialPrice" label="Giá bán (VND)">
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                          placeholder="0"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="initialCostPrice" label="Giá vốn (VND)">
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                          placeholder="0"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Alert
                    type="info"
                    showIcon
                    message="Lưu ý về số dư tồn kho"
                    description="Biến thể tạo mới sẽ có số dư tồn ban đầu bằng 0. Tồn kho được quản lý an toàn qua phân hệ Phiếu kho, không thể sửa trực tiếp qua CRUD."
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'categories' && (
            <>
              <Form.Item
                name="name"
                label="Tên danh mục"
                rules={[{ required: true, whitespace: true, message: 'Nhập tên danh mục.' }, { max: 100 }]}
              >
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item
                name="slug"
                label="Slug"
                rules={[{ required: true, whitespace: true, message: 'Nhập slug.' }, { max: 100 }]}
              >
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item name="description" label="Mô tả" rules={[{ max: 255 }]}>
                <Input.TextArea rows={3} maxLength={255} />
              </Form.Item>
            </>
          )}

          {activeTab === 'brands' && (
            <>
              <Form.Item
                name="name"
                label="Tên thương hiệu"
                rules={[{ required: true, whitespace: true, message: 'Nhập tên thương hiệu.' }, { max: 100 }]}
              >
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item name="country" label="Quốc gia" rules={[{ max: 50 }]}>
                <Input maxLength={50} />
              </Form.Item>
              <Form.Item name="description" label="Mô tả" rules={[{ max: 255 }]}>
                <Input.TextArea rows={3} maxLength={255} />
              </Form.Item>
            </>
          )}

          {activeTab === 'locations' && (
            <>
              <Form.Item
                name="code"
                label="Mã địa điểm"
                rules={[{ required: !modal.record, whitespace: true, message: 'Nhập mã địa điểm.' }, { max: 32 }]}
              >
                <Input maxLength={32} disabled={Boolean(modal.record)} />
              </Form.Item>
              <Form.Item
                name="name"
                label="Tên địa điểm"
                rules={[{ required: true, whitespace: true, message: 'Nhập tên địa điểm.' }, { max: 160 }]}
              >
                <Input maxLength={160} />
              </Form.Item>
              <Form.Item name="area" label="Khu vực" rules={[{ max: 100 }]}>
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item
                name="locationType"
                label="Loại địa điểm"
                rules={[{ required: true, message: 'Chọn loại địa điểm.' }]}
              >
                <Select
                  options={[
                    { value: 'BRANCH', label: 'Chi nhánh' },
                    { value: 'WAREHOUSE', label: 'Kho' }
                  ]}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Variant Modal */}
      <Modal
        title={`${variantModal.variant ? 'Sửa' : 'Thêm'} biến thể cho "${variantModal.product?.name || ''}"`}
        open={variantModal.open}
        onCancel={closeVariantModal}
        onOk={() => variantForm.submit()}
        confirmLoading={saving}
        okText="Lưu biến thể"
        cancelText="Hủy"
        width={680}
        destroyOnClose
      >
        <Form form={variantForm} layout="vertical" onFinish={saveVariant}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="Mã SKU (Duy nhất)"
                rules={[{ required: true, whitespace: true, message: 'Nhập mã SKU.' }, { max: 100 }]}
              >
                <Input placeholder="Ví dụ: BL-BJ3120-C10" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="barcode"
                label="Mã Barcode (Duy nhất)"
                rules={[{ required: true, whitespace: true, message: 'Nhập mã barcode.' }, { max: 100 }]}
              >
                <Input placeholder="Ví dụ: 8936012340011" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="Tên biến thể"
            rules={[{ required: true, whitespace: true, message: 'Nhập tên biến thể.' }, { max: 255 }]}
          >
            <Input placeholder="Ví dụ: Bolon BJ3120 - Rose Gold" maxLength={255} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="price"
                label="Giá bán (VND)"
                rules={[
                  { required: true, message: 'Nhập giá bán.' },
                  { type: 'number', min: 0, message: 'Giá bán không được âm.' }
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="costPrice"
                label="Giá vốn (VND)"
                rules={[
                  { required: true, message: 'Nhập giá vốn.' },
                  { type: 'number', min: 0, message: 'Giá vốn không được âm.' }
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="color" label="Màu sắc">
                <Input placeholder="Rose Gold C10" maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="frameShape" label="Dáng gọng">
                <Input placeholder="Geometrical" maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="material" label="Chất liệu">
                <Input placeholder="B-Titanium" maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="lensIndex" label="Chiết suất">
                <Input placeholder="1.60 / 1.67" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="imageUrl"
                label="Hình ảnh biến thể (URL hoặc tải từ máy)"
                tooltip="Nhập URL ảnh từ internet hoặc bấm nút tải ảnh từ máy tính"
              >
                <Input
                  placeholder="https://images.unsplash.com/... hoặc chọn tệp"
                  suffix={
                    <label className="cursor-pointer text-[#086288] hover:text-[#004967] text-xs font-semibold flex items-center gap-1 m-0">
                      <UploadOutlined /> Tải ảnh
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageFileSelect(e, variantForm, 'imageUrl')}
                      />
                    </label>
                  }
                />
              </Form.Item>
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-[11px] text-slate-400 mr-1 self-center">Gợi ý ảnh mẫu:</span>
                {SAMPLE_IMAGE_PRESETS.map((p) => (
                  <Tag
                    key={p.label}
                    className="cursor-pointer hover:border-[#086288] hover:text-[#086288]"
                    onClick={() => variantForm.setFieldsValue({ imageUrl: p.url })}
                  >
                    {p.label}
                  </Tag>
                ))}
              </div>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
                <Select
                  options={[
                    { value: 'ACTIVE', label: 'Đang kinh doanh' },
                    { value: 'HIDDEN', label: 'Ẩn khỏi khách' },
                    { value: 'DISCONTINUED', label: 'Ngừng kinh doanh' }
                  ]}
                />
              </Form.Item>
              <div className="flex flex-col items-center justify-center p-2 border border-dashed border-slate-300 rounded-lg bg-slate-50 min-h-[85px] mt-1">
                {watchedVariantImage ? (
                  <div className="relative group text-center">
                    <Image
                      src={watchedVariantImage}
                      alt="Xem trước ảnh"
                      width={65}
                      height={65}
                      className="rounded object-cover"
                      fallback="https://placehold.co/100x100?text=Loi+Anh"
                    />
                    <Button
                      size="small"
                      danger
                      type="text"
                      className="text-[10px] p-0 block mx-auto mt-1"
                      onClick={() => variantForm.setFieldsValue({ imageUrl: '' })}
                    >
                      Gỡ ảnh
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-xs py-1">
                    <PictureOutlined style={{ fontSize: 20 }} />
                    <div className="text-[10px] mt-0.5">Xem trước ảnh</div>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            message="Bảo toàn số dư tồn kho"
            description="Số lượng tồn kho thực tế được quản lý độc quyền qua luồng Chứng từ kho / Điều chuyển kho, tránh rủi ro gian lận hoặc sai lệch sổ sách."
          />
        </Form>
      </Modal>

      {/* Quick Price Modal */}
      <Modal
        title={`Cập nhật giá bán & giá vốn (SKU: ${priceModal.variant?.sku || ''})`}
        open={priceModal.open}
        onCancel={closePriceModal}
        onOk={() => priceForm.submit()}
        confirmLoading={saving}
        okText="Cập nhật giá"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={priceForm} layout="vertical" onFinish={savePrice}>
          <Form.Item
            name="price"
            label="Giá bán mới (VND)"
            rules={[
              { required: true, message: 'Nhập giá bán.' },
              { type: 'number', min: 0, message: 'Giá bán không được âm.' }
            ]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
              placeholder="0"
            />
          </Form.Item>
          <Form.Item
            name="costPrice"
            label="Giá vốn mới (VND)"
            rules={[
              { type: 'number', min: 0, message: 'Giá vốn không được âm.' }
            ]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
              placeholder="0"
            />
          </Form.Item>
          <Text type="secondary" className="text-xs">
            * Mọi thay đổi giá sẽ được kiểm tra và áp dụng qua máy chủ. Đơn hàng đang mở giỏ có cảnh báo thay đổi giá (ORDER_PRICE_CHANGED).
          </Text>
        </Form>
      </Modal>
    </main>
  );
}
