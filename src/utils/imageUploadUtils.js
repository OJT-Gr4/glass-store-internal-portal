export const DEFAULT_AVATAR_URL =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJAy3MrvYrmubxOdwfv33LI41s2yC06qjU4-qkqMyF4w&s';

export const DEFAULT_PRODUCT_IMAGE =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvIuZeIWL8lzCvG6kGgNUCAlk_ov0naBVuipn8z44eFg&s=10';

export const CLOUDINARY_CONFIG = {
  cloudName: 'dbcvrbm8x',
  apiKey: '366326716711443',
  apiSecret: 'C83MS7o5SEYP6RFG0eJw_syF-Yc',
  uploadUrl: 'https://api.cloudinary.com/v1_1/dbcvrbm8x/image/upload',
};

export function isValidImageInput(value) {
  if (!value || !String(value).trim()) return true;
  const trimmed = String(value).trim();
  if (trimmed.startsWith('data:image/')) {
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed);
  }
  return /^https?:\/\/.+/i.test(trimmed);
}

async function computeSha1(str) {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
}

/**
 * Uploads an image file directly to Cloudinary using signed authentication.
 * Returns the permanent secure HTTPS URL (e.g. https://res.cloudinary.com/dbcvrbm8x/image/upload/...)
 */
export async function uploadToCloudinary(file) {
  if (!file) throw new Error('Vui lòng chọn tệp hình ảnh.');
  const timestamp = Math.floor(Date.now() / 1000);
  const strToSign = `timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
  const signature = await computeSha1(strToSign);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
  formData.append('timestamp', String(timestamp));
  if (signature) {
    formData.append('signature', signature);
  }

  const res = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Lỗi tải ảnh Cloudinary (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.secure_url || data.url;
}

export function compressImageToDataUrl(file, maxDimension = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp hình ảnh.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Không thể giải mã tệp hình ảnh.'));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * High-level helper: attempts Cloudinary upload first, falls back to local compressed data URL if network error.
 */
export async function uploadImageFile(file, maxDimension = 640) {
  try {
    return await uploadToCloudinary(file);
  } catch (error) {
    console.warn('Tải ảnh lên Cloudinary gặp lỗi, chuyển sang nén dữ liệu cục bộ:', error);
    return await compressImageToDataUrl(file, maxDimension, 0.85);
  }
}
