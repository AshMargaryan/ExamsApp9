import { apiClient } from "../api/client";

/** Fetches an authenticated URL as a Blob and triggers a browser download of it. */
export async function downloadAuthenticatedFile(url: string, filename: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(url, { responseType: "blob" });
  const objectUrl = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Downloads a blob URL that's already loaded in memory (e.g. an open image lightbox) — no extra fetch needed. */
export function saveBlobUrl(blobUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
