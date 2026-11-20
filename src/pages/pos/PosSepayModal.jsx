import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Button, Alert, message, Spin, Popconfirm, Tag, Tooltip, Collapse } from 'antd';
import { QRCode } from 'antd';
import { CheckOutlined, CopyOutlined, CheckCircleFilled, QrcodeOutlined, ApiOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { orderApi } from '../../api/orderApi';
import { money } from './ProductCatalog';
import { copyToClipboard } from '../../utils/browserSafe';
import './pos-sepay-modal.css';

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
export function generateVietQrEmvco({ bankBin = '970422', accountNumber = '3906122006', amount, memo = '' }) {
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

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    if (!text) return;
    copyToClipboard(text);
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

  const bankInfo = useMemo(() => {
    const f = initiation?.formFields || {};
    return {
      bankBin: f.bankId || '970422',
      bankName: f.bankName || (configInfo?.bankCode ? `${configInfo.bankCode} Bank` : 'MBBank'),
      accountNumber: f.accountNo || configInfo?.bankAccount || '3906122006',
      accountName: f.accountName || configInfo?.userBankName || 'TRAN HUU TRUNG PHONG',
      addInfo: f.addInfo || order?.orderCode || '',
    };
  }, [initiation, configInfo, order?.orderCode]);

  // Official dynamic EMVCo Napas 247 QR payload
  const emvcoPayload = useMemo(() => {
    if (initiation?.qrContent) return initiation.qrContent;
    if (vietQrCodeString) return vietQrCodeString;
    if (!order) return '';
    return generateVietQrEmvco({
      bankBin: bankInfo.bankBin,
      accountNumber: bankInfo.accountNumber,
      amount: order.finalAmount,
      memo: bankInfo.addInfo || order.orderCode
    });
  }, [initiation, vietQrCodeString, order, bankInfo]);

  if (!order) return null;

  return (
    <Modal open={open} onCancel={onClose} width={780} centered className="pos-qr-modal"
      title={<div className="pos-qr-title"><span className="material-symbols-outlined" aria-hidden="true">qr_code_2</span><div><strong>Thanh toán chuyển khoản</strong><small>VietQR · NAPAS 247</small></div></div>}
      footer={<div className="pos-qr-footer">
        <Popconfirm title="Hủy đơn hàng?" description="Đơn hàng đang chờ thanh toán sẽ bị hủy. Vui lòng xác nhận khách chưa chuyển tiền." okText="Hủy đơn" cancelText="Giữ lại" okButtonProps={{ danger: true, loading: cancelling }} onConfirm={handleCancelOrder}>
          <Button danger disabled={status === 'PAID' || settlingManual}>Hủy đơn hàng</Button>
        </Popconfirm>
        <Popconfirm title="Xác nhận tiền đã vào tài khoản?" description="Chỉ xác nhận sau khi kiểm tra giao dịch trong tài khoản cửa hàng." okText="Xác nhận đã nhận" cancelText="Đóng" onConfirm={handleManualSettle}>
          <Button loading={settlingManual} disabled={status === 'PAID'}>Xác nhận thủ công</Button>
        </Popconfirm>
      </div>}>
      {status === 'PAID' ? <div className="pos-qr-success"><CheckCircleFilled /><h3>Thanh toán thành công</h3><p>Đã xác nhận thanh toán cho đơn {order.orderCode}.</p><strong>{money(order.finalAmount)}</strong></div> :
        <div className="pos-qr-content">
          <section className="pos-qr-code" aria-label="Mã thanh toán VietQR">
            <div className="pos-qr-code-label">QUÉT MÃ ĐỂ THANH TOÁN</div>
            <div className="pos-qr-image">{loading ? <div className="pos-qr-loading"><Spin tip="Đang tạo mã VietQR..." /></div> : <QRCode value={emvcoPayload} size={220} bordered={false} errorLevel="M" />}</div>
            <p>Mở ứng dụng ngân hàng và quét mã để chuyển khoản.</p>
          </section>
          <section className="pos-qr-details" aria-label="Thông tin chuyển khoản">
            <div className="pos-qr-amount"><span>Tổng thanh toán</span><strong>{money(order.finalAmount)}</strong><button type="button" onClick={() => handleCopy(order.finalAmount, 'amount')}>{copiedKey === 'amount' ? 'Đã sao chép' : 'Sao chép'}</button></div>
            <dl>
              <div><dt>Nội dung chuyển khoản</dt><dd><button type="button" className="pos-qr-copy" onClick={() => handleCopy(order.orderCode, 'code')}>{order.orderCode} {copiedKey === 'code' ? <CheckOutlined /> : <CopyOutlined />}</button></dd></div>
              <div><dt>Ngân hàng</dt><dd>{bankInfo.bankName}</dd></div>
              <div><dt>Số tài khoản</dt><dd><button type="button" className="pos-qr-copy" onClick={() => handleCopy(bankInfo.accountNumber, 'acc')}>{bankInfo.accountNumber} {copiedKey === 'acc' ? <CheckOutlined /> : <CopyOutlined />}</button></dd></div>
              <div><dt>Chủ tài khoản</dt><dd>{bankInfo.accountName}</dd></div>
              <div><dt>Khách hàng</dt><dd>{order.customerName || 'Khách vãng lai'}</dd></div>
            </dl>
            <div className="pos-qr-status" role="status"><span className="pos-qr-dot" />{syncing ? 'Đang kiểm tra thanh toán…' : 'Đang chờ xác nhận chuyển khoản'}{lastSyncTime && <small>Cập nhật {lastSyncTime.toLocaleTimeString('vi-VN')}</small>}</div>
          </section>
        </div>}
    </Modal>
  );
}
