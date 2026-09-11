import { apiClient, ApiError } from './client';
import { fetchCsrf, getCsrfHeaderName, getCsrfToken } from './csrf';
import { ImportFileRequest, ItemDetail } from './types';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GiB (5.368.709.120 bytes)

export const filesApi = {
  async importFile(payload: ImportFileRequest): Promise<ItemDetail> {
    return apiClient<ItemDetail>('/api/v1/items/files/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async uploadFile(
    connectionId: string,
    file: File,
    name?: string,
    description?: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<ItemDetail> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new ApiError(
        400,
        'FILE_TOO_LARGE',
        `Kích thước tệp vượt quá giới hạn tối đa 5GB. Tệp của bạn: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB.`
      );
    }

    let token = getCsrfToken();
    let headerName = getCsrfHeaderName();
    if (!token) {
      const csrf = await fetchCsrf();
      token = csrf.token;
      headerName = csrf.headerName;
    }

    return new Promise<ItemDetail>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/v1/items/files/upload', true);
      xhr.withCredentials = true;
      xhr.setRequestHeader(headerName, token!);
      xhr.setRequestHeader('Accept', 'application/json');

      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Upload aborted by user', 'AbortError'));
        });
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result: ItemDetail = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            resolve({} as ItemDetail);
          }
        } else {
          let errorData: any = {};
          try {
            errorData = JSON.parse(xhr.responseText);
          } catch {
            // ignore
          }

          const msg =
            errorData.message ||
            (xhr.status === 400
              ? 'Tệp tin vượt quá giới hạn 50MB hoặc không hợp lệ.'
              : xhr.status === 503
              ? 'Máy chủ đang quá tải dung lượng xử lý tải lên. Vui lòng thử lại sau.'
              : 'Đã xảy ra lỗi khi tải tệp lên máy chủ.');

          reject(new ApiError(xhr.status, errorData.code || 'UPLOAD_ERROR', msg, errorData.timestamp));
        }
      };

      xhr.onerror = () => {
        reject(new ApiError(0, 'NETWORK_ERROR', 'Lỗi kết nối mạng khi tải tệp.'));
      };

      const formData = new FormData();
      formData.append('connectionId', connectionId);
      formData.append('file', file);
      if (name) formData.append('name', name);
      if (description) formData.append('description', description);

      xhr.send(formData);
    });
  },
};
