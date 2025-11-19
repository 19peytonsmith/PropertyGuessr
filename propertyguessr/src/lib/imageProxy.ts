/**
 * Converts a Zillow image URL to use our proxy endpoint
 * This avoids CORS issues in production
 */
export function getProxiedImageUrl(zillowUrl: string): string {
  if (typeof window === "undefined") {
    // Server-side: return original URL
    return zillowUrl;
  }

  // Client-side: use proxy in production, direct URL in development
  if (process.env.NODE_ENV === "production") {
    return `/api/proxy-image?url=${encodeURIComponent(zillowUrl)}`;
  }

  return zillowUrl;
}
