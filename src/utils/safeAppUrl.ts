/**
 * Notification action_url values come from the server and get passed
 * straight to expo-router's router.push(). expo-router forwards anything
 * URL-shaped (scheme://, https:, tel:, market:, etc.) to the OS via
 * Linking.openURL, so this guards every router.push(action_url) call site
 * against an unexpected external value ever reaching it, by requiring an
 * app-relative path.
 */
export function isSafeAppUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0) return false;
  if (!url.startsWith('/')) return false;
  if (url.startsWith('//')) return false; // protocol-relative, e.g. //evil.com
  if (url.includes('://')) return false;
  if (/[\s\r\n]/.test(url)) return false;
  return true;
}
