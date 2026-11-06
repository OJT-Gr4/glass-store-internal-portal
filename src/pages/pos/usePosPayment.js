import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { orderApi } from '../../api/orderApi';

const IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT';

function isDefinitiveRejection(error) {
  return error.status >= 400 && error.status < 500 && error.errorCode !== IDEMPOTENCY_CONFLICT;
}

function readPendingRequest(storageKey) {
  const request = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
  if (request && (!request.key || !request.payload || !request.fingerprint)) {
    throw new Error('Yêu cầu thanh toán lưu tạm không hợp lệ.');
  }
  return request;
}

/** Keeps the same payment intent across double-clicks, uncertain responses and reloads. */
export default function usePosPayment({ staffId, branchCode, onRestored, onPaid }) {
  const storageKey = `optivision.pos.payment.v1:${staffId || 'unknown'}:${branchCode || 'none'}`;
  const pendingRequest = useRef(null);
  const requestLock = useRef(false);
  const callbacks = useRef({ onRestored, onPaid });
  callbacks.current = { onRestored, onPaid };
  const [paying, setPaying] = useState(false);
  const [uncertainPayment, setUncertainPayment] = useState(false);

  useEffect(() => {
    try {
      const request = readPendingRequest(storageKey);
      pendingRequest.current = request;
      setUncertainPayment(Boolean(request));
      if (request) callbacks.current.onRestored(request.payload);
    } catch (error) {
      pendingRequest.current = null;
      setUncertainPayment(true);
      message.error(error.message);
    }
  }, [storageKey]);

  function forgetRequest() {
    sessionStorage.removeItem(storageKey);
    pendingRequest.current = null;
    setUncertainPayment(false);
  }

  function handleFailure(error) {
    if (isDefinitiveRejection(error)) forgetRequest();
    else setUncertainPayment(true);
    message.error(`Chưa xác nhận kết quả: ${error.message}. Giỏ hàng được giữ nguyên.`);
  }

  async function execute(request, persistRequest) {
    if (requestLock.current) return;
    requestLock.current = true;
    setPaying(true);
    try {
      if (persistRequest) sessionStorage.setItem(storageKey, JSON.stringify(request));
      const saved = await orderApi.createOrder(request.payload, request.key);
      if (!saved?.id || !saved?.orderCode) throw new Error('API chưa trả về đơn hàng đã lưu.');
      forgetRequest();
      callbacks.current.onPaid(saved, request.payload);
    } catch (error) {
      handleFailure(error);
    } finally {
      requestLock.current = false;
      setPaying(false);
    }
  }

  async function submitPayment(payload) {
    if (requestLock.current || uncertainPayment) return;
    const fingerprint = JSON.stringify(payload);
    if (pendingRequest.current && pendingRequest.current.fingerprint !== fingerprint) {
      message.warning('Yêu cầu trước chưa rõ kết quả. Kiểm tra đơn cũ trước khi tạo yêu cầu mới.');
      return;
    }
    const request = pendingRequest.current || { fingerprint, key: crypto.randomUUID(), payload };
    pendingRequest.current = request;
    await execute(request, true);
  }

  async function retryPayment() {
    if (pendingRequest.current?.payload) await execute(pendingRequest.current, false);
  }

  return {
    paying,
    uncertainPayment,
    canRetryPayment: Boolean(pendingRequest.current?.payload),
    isPaymentLocked: () => requestLock.current,
    submitPayment,
    retryPayment,
  };
}
