import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

/**
 * Chat/attachment image endpoints require an Authorization header, which a
 * plain <img src> can't send — so instead we fetch the bytes through
 * apiClient (which does attach it) and hand the <img> an object URL. Loads
 * once per `url` and revokes the previous object URL on change/unmount.
 */
export function useAuthenticatedImageUrl(url: string | null): { src: string | null; error: boolean } {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setSrc(null);
    setError(false);
    if (!url) return;

    let active = true;
    let objectUrl: string | null = null;

    apiClient
      .get<Blob>(url, { responseType: "blob" })
      .then((res) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { src, error };
}
