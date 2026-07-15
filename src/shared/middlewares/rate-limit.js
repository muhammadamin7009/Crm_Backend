const DEFAULT_MESSAGE = "Juda ko'p so'rov yuborildi. Birozdan keyin qayta urinib ko'ring";

const rateLimit = ({ windowMs, max, message = DEFAULT_MESSAGE, keyGenerator } = {}) => {
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error("windowMs musbat bo'lishi kerak");
  if (!Number.isInteger(max) || max <= 0) throw new Error("max musbat butun son bo'lishi kerak");

  const buckets = new Map();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.min(windowMs, 10 * 60 * 1000));
  cleanup.unref?.();

  return (req, res, next) => {
    const now = Date.now();
    const key = String(keyGenerator ? keyGenerator(req) : req.ip || "unknown");
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message });
    }

    next();
  };
};

module.exports = rateLimit;
