import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Button, Alert, message, Spin, Popconfirm, Tag, Tooltip, Collapse } from 'antd';
import { QRCode } from 'antd';
import { CheckOutlined, CopyOutlined, CheckCircleFilled, QrcodeOutlined, ApiOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { orderApi } from '../../api/orderApi';
import { money } from './ProductCatalog';

// EMVCo QR Code CRC16-CCITT generator for Napas 247 standard
function crc16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(tag, val) {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val);
  const len = String(str.length).padStart(2, '0');
  return `${tag}${len}${str}`;
}

/**
 * Generates an official EMVCo-compliant VietQR payload string.
 * Banking apps (MBBank, Vietcombank, Techcombank, etc.) parse this string without
 * "ảnh qr không đúng định dạng" format errors.
 */
export function generateVietQrEmvco({ bankBin = '970422', accountNumber = '0938773607', amount, memo = '' }) {
  const sub00 = tlv('00', 'A000000727');
  const sub01_org = tlv('00', bankBin) + tlv('01', accountNumber);
  const sub01 = tlv('01', sub01_org);
  const sub02 = tlv('02', 'QRIBFTTA');
  const tag38 = tlv('38', sub00 + sub01 + sub02);

  const tag53 = tlv('53', '704');
  const tag54 = amount ? tlv('54', String(Math.round(amount))) : '';
  const tag58 = tlv('58', 'VN');
  const tag62 = memo ? tlv('62', tlv('08', memo)) : '';

  const header = tlv('00', '01') + tlv('01', '12');
  const raw = header + tag38 + tag53 + tag54 + tag58 + tag62 + '6304';
  const checksum = crc16(raw);
  return raw + checksum;
}

export default function PosSepayModal({
  open,
  order,
  onSuccess,
  onClose,
  onManualSettled
}) {
  const [initiation, setInitiation] = useState(null);
  const [vietQrCodeString, setVietQrCodeString] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [status, setStatus] = useState('PENDING_PAYMENT');
  const [copiedKey, setCopiedKey] = useState(null);
  const [settlingManual, setSettlingManual] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [testingCallback, setTestingCallback] = useState(false);
  const [configInfo, setConfigInfo] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  const pollIntervalRef = useRef(null);
  const isCompletedRef = useRef(false);

  // Load VietQR config info for merchant connection reference
  useEffect(() => {
    if (open) {
      orderApi.getVietQrConfigInfo()
        .then(res => setConfigInfo(res))
        .catch(() => {});
    }
  }, [open]);

  // 1. Khởi tạo thanh toán VietQR và gọi Step 4 Generate QR Code khi mở modal
  useEffect(() => {
    if (!open || !order?.id) {
      setInitiation(null);
      setVietQrCodeString('');
      setStatus('PENDING_PAYMENT');
      isCompletedRef.current = false;
      return;
    }

    let active = true;
    setLoading(true);

    // Call Step 4: Generate official VietQR dynamic code
    Promise.allSettled([
      orderApi.initiatePayment(order.id, 'VIETQR'),
      orderApi.generateVietQr(order.orderCode)
    ]).then(([initRes, qrRes]) => {
      if (!active) return;
      if (initRes.status === 'fulfilled') {
        setInitiation(initRes.value);
      }
      if (qrRes.status === 'fulfilled' && qrRes.value?.qrCode) {
        setVietQrCodeString(qrRes.value.qrCode);
      }
      setLoading(false);
    }).catch(err => {
      if (!active) return;
      console.warn('Lỗi khởi tạo VietQR:', err);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [open, order?.id, order?.orderCode]);

  // 2. Real-time Polling: Nhận biến động số dư sau khi VietQR gọi Step 2 Transaction Sync
  useEffect(() => {
    if (!open || !order?.id || status === 'PAID') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const checkPaymentStatus = async () => {
      if (isCompletedRef.current) return;
      setSyncing(true);
      try {
        const history = await orderApi.syncPayment(order.id);
        setLastSyncTime(new Date());

        const isSuccess = Array.isArray(history) && history.some(p => p.status === 'SUCCESS');
        if (isSuccess && !isCompletedRef.current) {
          isCompletedRef.current = true;
          setStatus('PAID');
          clearInterval(pollIntervalRef.current);
          message.success('Thanh toán VietQR thành công! Đang hoàn tất đơn hàng...');
          
          const updatedOrder = await orderApi.getOrderById(order.id).catch(() => ({ ...order, status: 'PAID' }));
          
          setTimeout(() => {
            if (onSuccess) onSuccess(updatedOrder);
          }, 1000);
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra trạng thái VietQR:', err);
      } finally {
        setSyncing(false);
      }
    };

    const initialTimer = setTimeout(checkPaymentStatus, 1000);
    pollIntervalRef.current = setInterval(checkPaymentStatus, 2000);

    return () => {
      clearTimeout(initialTimer);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [open, order?.id, status, onSuccess]);

  // Step 5: Gọi API Test Callback trên Sandbox của VietQR (POST /vqr/bank/api/test/transaction-callback)
  const handleTestCallback = async () => {
    if (!order?.orderCode || testingCallback || isCompletedRef.current) return;
    setTestingCallback(true);
    try {
      message.loading({ content: 'Đang gọi API Test Callback VietQR (dev.vietqr.org)...', key: 'vqr_test' });
      const res = await orderApi.triggerVietQrTestCallback(order.orderCode);
      message.success({ content: 'VietQR Test Callback đã đồng bộ thành công!', key: 'vqr_test' });

      if (!isCompletedRef.current) {
        isCompletedRef.current = true;
        setStatus('PAID');
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        const updatedOrder = await orderApi.getOrderById(order.id).catch(() => ({ ...order, status: 'PAID' }));
        setTimeout(() => {
          if (onSuccess) onSuccess(updatedOrder);
        }, 1000);
      }
    } catch (e) {
      console.error('Lỗi khi gọi VietQR Test Callback:', e);
      message.error({ content: `Lỗi gọi API Test Callback: ${e.message || 'Lỗi server'}`, key: 'vqr_test' });
    } finally {
      setTestingCallback(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    message.success({ content: `Đã sao chép: ${text}`, duration: 1 });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Xác nhận đã nhận tiền thủ công tại quầy (fallback đối soát khi cần)
  const handleManualSettle = async () => {
    if (!order?.id) return;
    setSettlingManual(true);
    try {
      const settled = await orderApi.settleCash(order.id);
      message.success('Đã xác nhận thanh toán chuyển khoản tại quầy thành công!');
      if (onManualSettled) onManualSettled(settled);
      else if (onSuccess) onSuccess(settled);
    } catch (err) {
      message.error(`Không thể xác nhận: ${err.message || 'Lỗi server'}`);
    } finally {
      setSettlingManual(false);
    }
  };

  // Hủy đơn hàng POS
  const handleCancelOrder = async () => {
    if (!order?.id) return;
    setCancelling(true);
    try {
      await orderApi.cancel(order.id, 'Thu ngân hủy giao dịch thanh toán VietQR', false);
      message.info(`Đã hủy đơn ${order.orderCode}`);
      if (onClose) onClose();
    } catch (err) {
      message.error(`Không thể hủy: ${err.message || 'Lỗi server'}`);
    } finally {
      setCancelling(false);
    }
  };

  // Official dynamic EMVCo Napas 247 QR payload
  const emvcoPayload = useMemo(() => {
    if (vietQrCodeString) return vietQrCodeString;
    if (!order) return '';
    return generateVietQrEmvco({
      bankBin: '970422', // MBBank
      accountNumber: '0938773607',
      amount: order.finalAmount,
      memo: order.orderCode
    });
  }, [vietQrCodeString, order]);

  if (!order) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={780}
      centered
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#086288', fontSize: '24px' }}>
              qr_code_2
            </span>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Thanh toán VietQR Napas 247
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag color="red" style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}>
              VIETQR PRO CALLBACK
            </Tag>
            <Tag color="blue" style={{ fontWeight: 600, fontSize: '12px' }}>
              Mã đơn: {order.orderCode}
            </Tag>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Popconfirm
            title="Hủy đơn hàng?"
            description="Đơn hàng đang chờ thanh toán này sẽ bị hủy bỏ."
            okText="Hủy đơn"
            cancelText="Giữ lại"
            okButtonProps={{ danger: true, loading: cancelling }}
            onConfirm={handleCancelOrder}
          >
            <Button danger disabled={status === 'PAID' || settlingManual}>
              Hủy đơn hàng
            </Button>
          </Popconfirm>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              icon={<ApiOutlined />}
              onClick={() => setShowConfig(!showConfig)}
            >
              {showConfig ? 'Ẩn cấu hình API' : 'Xem cấu hình VietQR'}
            </Button>

            <Popconfirm
              title="Xác nhận tiền đã vào tài khoản?"
              description="Sử dụng khi khách đã chuyển khoản nhưng hệ thống cần đối soát thủ công."
              okText="Xác nhận đã nhận"
              cancelText="Đóng"
              onConfirm={handleManualSettle}
            >
              <Button loading={settlingManual} disabled={status === 'PAID'}>
                Xác nhận thủ công
              </Button>
            </Popconfirm>

            <Button
              type="primary"
              onClick={handleTestCallback}
              loading={testingCallback}
              disabled={status === 'PAID'}
              style={{ background: '#b91c1c', borderColor: '#b91c1c' }}
            >
              Gọi API Test Callback (Sandbox)
            </Button>
          </div>
        </div>
      }
    >
      {/* Khung xem cấu hình kết nối API VietQR gửi cho VietQR support */}
      {showConfig && configInfo && (
        <Alert
          style={{ marginBottom: '16px' }}
          type="info"
          showIcon
          message="Thông tin kết nối API VietQR (Gửi cho VietQR để cấu hình hoặc nghiệm thu GoLive)"
          description={
            <div style={{ fontSize: '12px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>• <strong>Tên merchant:</strong> {configInfo.merchantName}</div>
              <div>• <strong>URL kết nối:</strong> <code>{configInfo.apiUrl}</code></div>
              <div>• <strong>URL Path (Suffix) Webhook:</strong> <code>{configInfo.urlPathSuffix}</code></div>
              <div>• <strong>API Get Token (VietQR gọi):</strong> <code>{configInfo.partnerGetTokenUrl}</code></div>
              <div>• <strong>Username (Key kết nối):</strong> <code>{configInfo.username}</code></div>
              <div>• <strong>Password (Key kết nối):</strong> <code>{configInfo.password}</code></div>
              <div>• <strong>Tài khoản thụ hưởng:</strong> {configInfo.bankAccount} ({configInfo.bankCode}) - {configInfo.userBankName}</div>
            </div>
          }
        />
      )}

      {status === 'PAID' ? (
        <div style={{ textAlign: 'center', padding: '36px 16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#d1fae5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CheckCircleFilled style={{ fontSize: 36, color: '#059669' }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#065f46', margin: '0 0 8px' }}>
            Thanh toán thành công!
          </h3>
          <p style={{ color: '#4b5563', fontSize: '14px', margin: '0 0 16px' }}>
            Hệ thống VietQR Callback đã đồng bộ thành công giao dịch cho đơn hàng <strong>{order.orderCode}</strong>.
          </p>
          <Tag color="success" style={{ fontSize: '13px', padding: '4px 12px' }}>
            Đã thanh toán: {money(order.finalAmount)}
          </Tag>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', padding: '12px 0' }}>
          {/* Cột trái: QR Code Chuẩn Napas 247 */}
          <div style={{
            flex: '0 0 280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              marginBottom: '12px',
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              fontWeight: 700,
              fontSize: '12px'
            }}>
              <QrcodeOutlined />
              <span>VIETQR · NAPAS 247</span>
            </div>

            <div style={{
              background: '#ffffff',
              padding: '12px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              {loading ? (
                <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spin tip="Đang tạo mã VietQR..." />
                </div>
              ) : (
                <QRCode
                  value={emvcoPayload}
                  size={220}
                  bordered={false}
                  errorLevel="M"
                />
              )}
            </div>

            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '8px', lineHeight: 1.4 }}>
                Khách hàng mở App Ngân hàng bất kỳ (MBBank, VCB, BIDV, Techcombank, ...) quét mã để thanh toán tự động
              </div>
            </div>
          </div>

          {/* Cột phải: Thông tin chi tiết đơn & tài khoản */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* Header số tiền */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>TỔNG TIỀN THANH TOÁN</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#1d4ed8' }}>
                    {money(order.finalAmount)}
                  </div>
                </div>
                <Tooltip title="Sao chép số tiền">
                  <Button
                    size="small"
                    onClick={() => handleCopy(order.finalAmount, 'amount')}
                  >
                    {copiedKey === 'amount' ? 'Đã sao chép' : 'Sao chép'}
                  </Button>
                </Tooltip>
              </div>

              {/* Bảng chi tiết chuyển khoản */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Nội dung chuyển khoản (Bắt buộc):</span>
                  <span style={{ fontWeight: 700, color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleCopy(order.orderCode, 'code')}>
                    {order.orderCode} {copiedKey === 'code' ? <CheckOutlined className="text-emerald-600" /> : <CopyOutlined className="text-slate-400" />}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Ngân hàng thụ hưởng:</span>
                  <span style={{ fontWeight: 600 }}>MBBank (Quân Đội)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Số tài khoản:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleCopy('0938773607', 'acc')}>
                    0938773607 {copiedKey === 'acc' ? <CheckOutlined className="text-emerald-600" /> : <CopyOutlined className="text-slate-400" />}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
                  <span style={{ fontWeight: 600 }}>CÔNG TY KÍNH MẮT OPTIVISION</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Khách hàng:</span>
                  <span style={{ fontWeight: 600 }}>{order.customerName || 'Khách vãng lai'} {order.customerPhone ? `(${order.customerPhone})` : ''}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Chi nhánh POS:</span>
                  <span style={{ fontWeight: 600 }}>{order.branchName || order.branchCode || 'Chi nhánh'}</span>
                </div>
              </div>
            </div>

            {/* Trạng thái đối soát tự động */}
            <div style={{
              marginTop: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: syncing ? '#10b981' : '#3b82f6',
                  boxShadow: syncing ? '0 0 6px #10b981' : 'none'
                }} />
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                  {syncing ? 'Đang kiểm tra biến động số dư VietQR...' : 'Đang chờ VietQR callback xác thực'}
                </span>
              </div>
              {lastSyncTime && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Cập nhật: {lastSyncTime.toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
