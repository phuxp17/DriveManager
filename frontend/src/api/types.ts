export type ItemType =
  | 'FILE'
  | 'IMAGE'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'AUDIO'
  | 'ARCHIVE'
  | 'LINK'
  | 'NOTE';

export interface ItemEntry {
  id: string;
  ownerId: string;
  type: ItemType;
  name: string;
  description: string | null;
  url: string | null;
  domain: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  reviewedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  favoritedAt: string | null;
  lastOpenedAt: string | null;
  driveUrl?: string | null;
  storageFileId?: string | null;
  storageConnectionId?: string | null;
}

export interface ItemPage {
  content: ItemEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ItemDetail {
  id: string;
  ownerId: string;
  type: ItemType;
  name: string;
  description: string | null;
  url: string | null;
  domain: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  reviewedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  driveUrl?: string | null;
  storageFileId?: string | null;
  storageConnectionId?: string | null;
}

export interface CreateLinkRequest {
  name: string;
  description?: string;
  url: string;
}

export interface PatchItemRequest {
  name?: string;
  description?: string;
  expectedVersion: number;
}

export interface ImportFileRequest {
  connectionId: string;
  driveFileId: string;
  name?: string;
  description?: string;
}

export interface Collection {
  id: string;
  ownerId: string;
  parentId: string | null;
  name: string;
  deletedAt: string | null;
  version: number;
}

export interface CreateCollectionRequest {
  name: string;
  parentId?: string | null;
}

export interface RenameCollectionRequest {
  name: string;
}

export interface MoveCollectionRequest {
  parentId: string | null;
}

export interface MoveItemCollectionRequest {
  sourceCollectionId: string;
  destinationCollectionId: string;
}

export interface Tag {
  id: string;
  ownerId: string;
  name: string;
  color: string | null;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface MergeTagRequest {
  targetId: string;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
}

export interface CsrfResponse {
  headerName: string;
  parameterName: string;
  token: string;
}

export interface StorageConnection {
  id: string;
  provider: string;
  displayName: string;
  status: string;
  grantedScopes: string;
  quotaTotalBytes?: number | null;
  quotaUsedBytes?: number | null;
  quotaUsageInDriveBytes?: number | null;
  quotaRemainingBytes?: number | null;
  lastSyncedAt?: string | null;
}

export interface SyncResult {
  newItems: number;
  updatedItems: number;
  totalItems: number;
}

export interface ConnectResponse {
  authorizationUrl: string;
}

export interface ContactResponse {
  contactUserId: string;
  email: string;
  displayName: string;
  alias: string | null;
  createdAt: string;
}

export interface AddContactRequest {
  email: string;
  alias?: string;
}

export type ShareTargetType = 'ITEM' | 'COLLECTION';
export type ShareStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED';

export interface ShareResponse {
  id: string;
  ownerId: string;
  ownerEmail: string;
  targetType: ShareTargetType;
  targetId: string;
  targetName: string;
  recipientId: string;
  recipientEmail: string;
  permission: string;
  status: ShareStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShareRequest {
  targetType: ShareTargetType;
  targetId: string;
  recipientEmail: string;
}

export interface ApiErrorPayload {
  timestamp: string;
  status: number;
  code: string;
  message: string;
}

export type LibraryView =
  | 'active'
  | 'inbox'
  | 'uncategorized'
  | 'favorites'
  | 'recent'
  | 'shared'
  | 'archive'
  | 'trash';

export interface LibraryFilters {
  view?: LibraryView;
  page?: number;
  size?: number;
  q?: string;
  type?: string;
  tags?: string[];
  collectionId?: string;
  favorite?: boolean;
  createdFrom?: string;
  createdBefore?: string;
  sort?: 'added' | 'modified';
  connectionId?: string;
}
