import { apiClient } from "./client";

export interface Folder {
  id: string;
  parent: string | null;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentAttachment {
  id: string;
  document: string;
  file_type: "image" | "pdf" | "document" | "text";
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
  download_url: string;
}

export type DocumentKind = "rich_text" | "canvas";

export interface DocumentSummary {
  id: string;
  folder: string | null;
  kind: DocumentKind;
  title: string;
  icon: string;
  tags: string[];
  is_favorite: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  snippet: string;
}

export interface Document extends Omit<DocumentSummary, "snippet"> {
  // For kind="rich_text": Tiptap's JSON document shape, opaque everywhere
  // except inside the rich-text editor. For kind="canvas": {strokes: [...]},
  // opaque everywhere except inside CanvasEditor.
  content: Record<string, unknown>;
  attachments: DocumentAttachment[];
}

export interface DocumentListFilters {
  folder?: string | null;
  favorite?: boolean;
  pinned?: boolean;
  trashed?: boolean;
  tag?: string;
  q?: string;
}

export async function listFolders(): Promise<Folder[]> {
  const { data } = await apiClient.get("/notes/folders/");
  return data;
}

export async function createFolder(input: { name: string; parent?: string | null }): Promise<Folder> {
  const { data } = await apiClient.post("/notes/folders/", input);
  return data;
}

export async function updateFolder(
  id: string,
  input: Partial<{ name: string; parent: string | null; color: string; sort_order: number }>,
): Promise<Folder> {
  const { data } = await apiClient.patch(`/notes/folders/${id}/`, input);
  return data;
}

export async function deleteFolder(id: string): Promise<void> {
  await apiClient.delete(`/notes/folders/${id}/`);
}

export async function restoreFolder(id: string): Promise<Folder> {
  const { data } = await apiClient.post(`/notes/folders/${id}/restore/`);
  return data;
}

export async function purgeFolder(id: string): Promise<void> {
  await apiClient.delete(`/notes/folders/${id}/purge/`);
}

export async function listDocuments(filters: DocumentListFilters = {}): Promise<DocumentSummary[]> {
  const params: Record<string, string> = {};
  if (filters.folder !== undefined && filters.folder !== null) params.folder = filters.folder;
  if (filters.favorite) params.favorite = "true";
  if (filters.pinned) params.pinned = "true";
  if (filters.trashed) params.trashed = "true";
  if (filters.tag) params.tag = filters.tag;
  if (filters.q) params.q = filters.q;
  const { data } = await apiClient.get("/notes/documents/", { params });
  return data;
}

export async function getDocument(id: string): Promise<Document> {
  const { data } = await apiClient.get(`/notes/documents/${id}/`);
  return data;
}

export async function createDocument(input: {
  title?: string;
  folder?: string | null;
  kind?: DocumentKind;
  content?: Record<string, unknown>;
}): Promise<Document> {
  const { data } = await apiClient.post("/notes/documents/", input);
  return data;
}

export async function updateDocument(
  id: string,
  input: Partial<{
    title: string;
    folder: string | null;
    icon: string;
    content: Record<string, unknown>;
    tags: string[];
    is_favorite: boolean;
    is_pinned: boolean;
  }>,
): Promise<Document> {
  const { data } = await apiClient.patch(`/notes/documents/${id}/`, input);
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/notes/documents/${id}/`);
}

export async function restoreDocument(id: string): Promise<Document> {
  const { data } = await apiClient.post(`/notes/documents/${id}/restore/`);
  return data;
}

export async function purgeDocument(id: string): Promise<void> {
  await apiClient.delete(`/notes/documents/${id}/purge/`);
}

export async function duplicateDocument(id: string): Promise<Document> {
  const { data } = await apiClient.post(`/notes/documents/${id}/duplicate/`);
  return data;
}

export async function moveDocument(id: string, folder: string | null): Promise<Document> {
  const { data } = await apiClient.post(`/notes/documents/${id}/move/`, { folder });
  return data;
}

export async function uploadAttachment(documentId: string, file: File): Promise<DocumentAttachment> {
  const form = new FormData();
  form.append("document", documentId);
  form.append("file", file);
  const { data } = await apiClient.post("/notes/attachments/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export function attachmentDownloadPath(id: string): string {
  return `/notes/attachments/${id}/download/`;
}
