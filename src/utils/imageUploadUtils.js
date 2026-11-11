export const DEFAULT_AVATAR_URL =
  'https://i.pinimg.com/236x/3e/f1/fc/3ef1fcc3b6cbb97199f961bb0b3ead3f.jpg';

export const DEFAULT_PRODUCT_IMAGE =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvIuZeIWL8lzCvG6kGgNUCAlk_ov0naBVuipn8z44eFg&s=10';

export function isValidImageInput(value) {
  if (!value || !String(value).trim()) return true;
  const trimmed = String(value).trim();
  if (trimmed.startsWith('data:image/')) {
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed);
  }
  return /^https?:\/\/.+/i.test(trimmed);
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
