import { apiClient } from './client';
import { getCsrfHeaderName, getCsrfToken, fetchCsrf } from './csrf';

export interface DriveCapabilities {
  canEdit?: boolean;
  canComment?: boolean;
  canShare?: boolean;
  canCopy?: boolean;
  canDelete?: boolean;
  canTrash?: boolean;
  canRename?: boolean;
  canAddChildren?: boolean;
}

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  parents: string[];
  modifiedTime?: string;
  createdTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  isFolder: boolean;
  trashed: boolean;
  shared: boolean;
  owners: string[];
  capabilities: DriveCapabilities;
}

export interface DriveFileListResponse {
  files: DriveItem[];
  nextPageToken?: string;
}

export interface PermissionItem {
  id: string;
  type: string;
  role: string;
  emailAddress?: string;
  displayName?: string;
  photoLink?: string;
}

export interface CreatePermissionRequest {
  role: string;
  type: string;
  emailAddress?: string;
  sendNotificationEmail?: boolean;
}

export const driveApi = {
  async listFiles(
    accountId: string,
    parentId: string = 'root',
    pageToken?: string,
    pageSize: number = 50,
    signal?: AbortSignal
  ): Promise<DriveFileListResponse> {
    const params = new URLSearchParams();
    params.set('parentId', parentId);
    params.set('pageSize', pageSize.toString());
    if (pageToken) params.set('pageToken', pageToken);

    return apiClient<DriveFileListResponse>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files?${params.toString()}`,
      { signal }
    );
  },

  async searchFiles(
    accountId: string,
    query: string,
    parentId?: string,
    pageToken?: string,
    pageSize: number = 50,
    signal?: AbortSignal
  ): Promise<DriveFileListResponse> {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('pageSize', pageSize.toString());
    if (parentId && parentId !== 'root') params.set('parentId', parentId);
    if (pageToken) params.set('pageToken', pageToken);

    return apiClient<DriveFileListResponse>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/search?${params.toString()}`,
      { signal }
    );
  },

  async getFile(accountId: string, fileId: string, signal?: AbortSignal): Promise<DriveItem> {
    return apiClient<DriveItem>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}`,
      { signal }
    );
  },

  getContentUrl(accountId: string, fileId: string, exportFormat?: string): string {
    const base = `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}/content`;
    return exportFormat ? `${base}?export=${encodeURIComponent(exportFormat)}` : base;
  },

  async uploadFile(
    accountId: string,
    file: File,
    parentId: string = 'root',
    customName?: string,
    onProgress?: (percent: number) => void
  ): Promise<DriveItem> {
    let token = getCsrfToken();
    let headerName = getCsrfHeaderName();
    if (!token) {
      const csrf = await fetchCsrf();
      token = csrf.token;
      headerName = csrf.headerName;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('parentId', parentId);
    if (customName) formData.append('name', customName);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/drive-accounts/${encodeURIComponent(accountId)}/files`);
      xhr.withCredentials = true;
      if (token && headerName) {
        xhr.setRequestHeader(headerName, token);
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
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch {
            resolve({} as DriveItem);
          }
        } else {
          let msg = 'Tải tệp lên Google Drive thất bại';
          try {
            const err = JSON.parse(xhr.responseText);
            if (err.message) msg = err.message;
          } catch {}
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Lỗi kết nối mạng khi tải tệp lên.'));
      };

      xhr.send(formData);
    });
  },

  async createFolder(accountId: string, name: string, parentId: string = 'root'): Promise<DriveItem> {
    return apiClient<DriveItem>(`/api/drive-accounts/${encodeURIComponent(accountId)}/folders`, {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    });
  },

  async renameFile(accountId: string, fileId: string, name: string): Promise<DriveItem> {
    return apiClient<DriveItem>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }
    );
  },

  async moveFile(accountId: string, fileId: string, newParentId: string, oldParentId?: string): Promise<DriveItem> {
    return apiClient<DriveItem>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}/move`,
      {
        method: 'POST',
        body: JSON.stringify({ newParentId, oldParentId }),
      }
    );
  },

  async copyFile(accountId: string, fileId: string, name?: string, destinationFolderId?: string): Promise<DriveItem> {
    return apiClient<DriveItem>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}/copy`,
      {
        method: 'POST',
        body: JSON.stringify({ name, destinationFolderId }),
      }
    );
  },

  async trashFile(accountId: string, fileId: string, trashed: boolean = true): Promise<DriveItem> {
    return apiClient<DriveItem>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}/trash`,
      {
        method: 'POST',
        body: JSON.stringify({ trashed }),
      }
    );
  },

  async restoreFile(accountId: string, fileId: string): Promise<DriveItem> {
    return apiClient<DriveItem>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}/restore`,
      {
        method: 'POST',
      }
    );
  },

  async deleteFilePermanent(accountId: string, fileId: string): Promise<void> {
    return apiClient<void>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}?permanent=true`,
      {
        method: 'DELETE',
      }
    );
  },

  async listPermissions(accountId: string, fileId: string): Promise<PermissionItem[]> {
    return apiClient<PermissionItem[]>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}/permissions`
    );
  },

  async createPermission(accountId: string, fileId: string, data: CreatePermissionRequest): Promise<PermissionItem> {
    return apiClient<PermissionItem>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}/permissions`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async deletePermission(accountId: string, fileId: string, permissionId: string): Promise<void> {
    return apiClient<void>(
      `/api/drive-accounts/${encodeURIComponent(accountId)}/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}`,
      {
        method: 'DELETE',
      }
    );
  },
};
