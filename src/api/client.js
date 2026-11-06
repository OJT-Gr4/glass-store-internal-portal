const API_BASE_URL = import.meta.env?.VITE_API_GATEWAY_URL || '';

/**
 * Universal fetch wrapper for OptiVision REST APIs via API Gateway (Port 8080)
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('optivision_jwt_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || `Lỗi yêu cầu: ${response.status} ${response.statusText}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.errorCode = data?.errorCode;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}
