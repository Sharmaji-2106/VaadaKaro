/**
 * Tells the backend who the end user is, for its per-client rate limits. Server-only.
 *
 * X-Forwarded-For is never passed on: browsers can set it to anything, and Next.js keeps a
 * client-supplied value. The IP is read only from TRUSTED_IP_HEADER, a header your host sets and
 * overwrites itself (Vercel: x-real-ip, Cloudflare: cf-connecting-ip), and is sent with a secret
 * shared with the backend so nobody can forge it by calling the API directly.
 *
 * With either variable unset, nothing is sent and the backend sees every user as this server.
 */
export function clientIpHeaders(incoming: Headers): Record<string, string> {
  const secret = process.env.PROXY_SHARED_SECRET;
  const header = process.env.TRUSTED_IP_HEADER;
  if (!secret || !header) return {};
  const ip = incoming.get(header)?.split(',')[0].trim();
  return ip ? { 'X-Client-IP': ip, 'X-Proxy-Secret': secret } : {};
}
