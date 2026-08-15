import { apiClient } from "../api/client";

// English -> Armenian lookup for the "select to pronounce" widget's
// Translate button. Backed by /practice/translate/ (see PronounceView's
// sibling TranslateView on the backend — same disk-cached Google Translate
// proxy pattern). Kept as a tiny in-memory cache on top of the server's own
// disk cache so re-selecting the same word within a session is instant.
const cache = new Map<string, string | null>();

export async function translateToArmenian(text: string): Promise<string | null> {
  const key = text.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const { data } = await apiClient.get<{ text: string; translation: string }>("/practice/translate/", {
      params: { text },
    });
    cache.set(key, data.translation);
    return data.translation;
  } catch {
    cache.set(key, null);
    return null;
  }
}
