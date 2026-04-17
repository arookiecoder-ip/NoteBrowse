export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Too many unlock attempts.");
  }
}

interface Counter {
  failures: number;
  firstAt: number;
  blockedUntil: number;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 5 * 60 * 1000;

const buckets = new Map<string, Counter>();

function key(ip: string, slug: string): string {
  return `${ip}::${slug}`;
}

export function rateLimitAssert(ip: string, slug: string): void {
  const k = key(ip, slug);
  const c = buckets.get(k);
  if (!c) return;

  const now = Date.now();
  if (c.blockedUntil > now) {
    throw new RateLimitError(Math.ceil((c.blockedUntil - now) / 1000));
  }
}

export function rateLimitFail(ip: string, slug: string): void {
  const k = key(ip, slug);
  const now = Date.now();
  const c = buckets.get(k);

  if (!c || now - c.firstAt > WINDOW_MS) {
    buckets.set(k, { failures: 1, firstAt: now, blockedUntil: 0 });
    return;
  }

  const failures = c.failures + 1;
  const blockedUntil = failures >= MAX_FAILURES ? now + LOCKOUT_MS : c.blockedUntil;
  buckets.set(k, { failures, firstAt: c.firstAt, blockedUntil });
}

export function rateLimitReset(ip: string, slug: string): void {
  buckets.delete(key(ip, slug));
}

// ── Rate Limiting for Creation (IP based) ───────────────────────────
const CREATE_MAX_PER_HOUR = 10;
const CREATE_WINDOW_MS = 60 * 60 * 1000;

interface CreateCounter {
  count: number;
  firstAt: number;
}
const createBuckets = new Map<string, CreateCounter>();

export function rateLimitCreateAssert(ip: string): void {
  const now = Date.now();
  const c = createBuckets.get(ip);
  if (!c) return;

  if (now - c.firstAt <= CREATE_WINDOW_MS && c.count >= CREATE_MAX_PER_HOUR) {
    throw new RateLimitError(Math.ceil((CREATE_WINDOW_MS - (now - c.firstAt)) / 1000));
  }
}

export function rateLimitCreateRecord(ip: string): void {
  const now = Date.now();
  const c = createBuckets.get(ip);

  if (!c || now - c.firstAt > CREATE_WINDOW_MS) {
    createBuckets.set(ip, { count: 1, firstAt: now });
  } else {
    createBuckets.set(ip, { count: c.count + 1, firstAt: c.firstAt });
  }
}
