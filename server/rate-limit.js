import { createHmac } from 'node:crypto';

const localBuckets = new Map();
export async function rateLimit(req, env = process.env, fetchImpl = fetch) {
  const production = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
  const ip = env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim() : req.socket?.remoteAddress || 'local';
  const now = Date.now();
  const hash = createHmac('sha256', env.RATE_LIMIT_SALT || 'local-preview-only').update(ip).digest('hex').slice(0, 32);
  const keys = [`blair-chat:ip:${hash}:${Math.floor(now / 600000)}`, `blair-chat:day:${Math.floor(now / 86400000)}`];
  const ttl = [600 - Math.floor(now / 1000) % 600, 86400 - Math.floor(now / 1000) % 86400];
  const caps = [12, 200];
  if (production && (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN || !env.RATE_LIMIT_SALT)) throw new Error('Rate limiting is not configured.');
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    // One atomic operation across all server instances; rejected requests do not consume the global budget.
    const script = `for i=1,2 do if tonumber(redis.call('GET',KEYS[i]) or '0') >= tonumber(ARGV[i]) then return {0,redis.call('TTL',KEYS[i])} end end for i=1,2 do local n=redis.call('INCR',KEYS[i]); if n==1 then redis.call('EXPIRE',KEYS[i],ARGV[i+2]) end end return {1,0}`;
    const response = await fetchImpl(env.UPSTASH_REDIS_REST_URL, { method: 'POST', headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(['EVAL', script, '2', ...keys, ...caps.map(String), ...ttl.map(String)]), signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Rate limiter unavailable.');
    const { result, error } = await response.json();
    if (error || !Array.isArray(result) || result.length !== 2 || ![0, 1].includes(result[0]) || !Number.isFinite(result[1])) throw new Error('Rate limiter unavailable.');
    return { allowed: result[0] === 1, retryAfter: Math.max(1, result[1]) };
  }
  for (const [key, value] of localBuckets) if (value.expires <= now) localBuckets.delete(key);
  for (let i = 0; i < keys.length; i++) if ((localBuckets.get(keys[i])?.count || 0) >= caps[i]) return { allowed: false, retryAfter: ttl[i] };
  keys.forEach((key, i) => localBuckets.set(key, { count: (localBuckets.get(key)?.count || 0) + 1, expires: now + ttl[i] * 1000 }));
  return { allowed: true, retryAfter: 0 };
}
