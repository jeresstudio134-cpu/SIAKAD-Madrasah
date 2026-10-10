import { ApiResponse } from '../types';

export class ApiError extends Error {
  status: number;
  data?: any;
  mustChangePassword?: boolean;

  constructor(message: string, status: number, data?: any, mustChangePassword?: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.mustChangePassword = mustChangePassword;
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('siakad_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include', // penting untuk httpOnly cookie
      signal: options.signal ?? controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Server terlalu lama merespons. Coba muat ulang halaman.', 408);
    }
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 0);
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type');
  let result: any = null;

  if (contentType && contentType.includes('application/json')) {
    result = await response.json();
  } else {
    result = {
      success: response.ok,
      message: response.statusText,
    };
  }

  if (!response.ok) {
    const errorMsg =
      result?.message || `Terjadi kesalahan saat memproses permintaan (${response.status})`;
    throw new ApiError(errorMsg, response.status, result?.data, result?.mustChangePassword);
  }

    // Backend mengirim { items, pagination }; sebagian halaman membaca { data, page, limit, total, totalPages }
  const d = result?.data;
  if (d && !Array.isArray(d) && Array.isArray(d.items) && d.pagination) {
    result.data = { ...d, data: d.items, ...d.pagination };
  }

  return result as ApiResponse<T>;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
