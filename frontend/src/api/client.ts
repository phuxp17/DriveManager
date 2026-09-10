import { ApiErrorPayload } from './types';
import { fetchCsrf, getCsrfHeaderName, getCsrfToken } from './csrf';

export class ApiError extends Error {
  status: number;
  code: string;
  timestamp: string;

  constructor(status: number, code: string, message: string, timestamp?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.timestamp = timestamp || new Date().toISOString();
  }
}

export interface RequestOptions extends RequestInit {
  skipCsrf?: boolean;
}

export async function apiClient<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Auto attach CSRF token for mutations unless explicitly skipped
  if (isMutation && !options.skipCsrf) {
    let token = getCsrfToken();
    let headerName = getCsrfHeaderName();
    if (!token) {
      const csrf = await fetchCsrf();
      token = csrf.token;
      headerName = csrf.headerName;
    }
    headers.set(headerName, token);
  }

  // Auto set Content-Type to application/json if body is JSON string and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    ...options,
    method,
    headers,
    credentials: 'include',
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
  }

  // Handle 403 CSRF retry once for mutation
  if (response.status === 403 && isMutation && !options.skipCsrf) {
    try {
      const newCsrf = await fetchCsrf();
      headers.set(newCsrf.headerName, newCsrf.token);
      response = await fetch(url, { ...fetchOptions, headers });
    } catch {
      // If refetch fails, proceed with original response
    }
  }

  if (!response.ok) {
    let errorData: Partial<ApiErrorPayload> = {};
    try {
      errorData = await response.json();
    } catch {
      // fallback if not json
    }

    const status = response.status;
    const code = errorData.code || (status === 401 ? 'UNAUTHENTICATED' : status === 404 ? 'NOT_FOUND' : 'ERROR');
    const message = errorData.message || (
      status === 401 ? 'Phiên đăng nhập đã hết hạn hoặc thông tin không hợp lệ.' :
      status === 403 ? 'Truy cập bị từ chối hoặc token không hợp lệ.' :
      status === 404 ? 'Không tìm thấy tài nguyên yêu cầu.' :
      status === 409 ? 'Xung đột dữ liệu hoặc phiên bản đã thay đổi.' :
      status === 429 ? 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' :
      status === 503 ? 'Dịch vụ tạm thời quá tải. Vui lòng thử lại sau ít phút.' :
      'Đã xảy ra lỗi không xác định từ máy chủ.'
    );

    throw new ApiError(status, code, message, errorData.timestamp);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}
