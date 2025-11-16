/**
 * Ensures a URL has a protocol (http:// or https://)
 * If no protocol is present, adds https://
 */
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) {
    return null;
  }

  const trimmed = url.trim();

  // Already has a protocol
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Add https:// by default
  return `https://${trimmed}`;
}
