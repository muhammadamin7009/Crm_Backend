const crypto = require("crypto");
const config = require("../config");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const encodeBase32 = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
};

const decodeBase32 = (secret) => {
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const character of String(secret || "")
    .toUpperCase()
    .replace(/=+$/g, "")) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Authenticator secret noto'g'ri");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

const encryptionKey = () => {
  const key = Buffer.from(config.mfa.encryptionKey, "base64");
  if (key.length !== 32) {
    throw new Error("MFA_ENCRYPTION_KEY 32 baytli base64 kalit bo'lishi kerak");
  }
  return key;
};

const encryptSecret = (secret) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
};

const decryptSecret = (payload) => {
  const [version, iv, tag, encrypted] = String(payload || "").split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Authenticator secret formati noto'g'ri");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

const generateSecret = () => encodeBase32(crypto.randomBytes(20));

const codeForCounter = (secret, counter) => {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary =
    ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255);
  return String(binary % 1_000_000).padStart(6, "0");
};

const verifyTotp = (secret, token, lastCounter = null, now = Date.now()) => {
  const normalized = String(token || "").trim();
  if (!/^\d{6}$/.test(normalized)) return null;
  const currentCounter = Math.floor(now / 30_000);
  for (const offset of [0, -1, 1]) {
    const counter = currentCounter + offset;
    const expected = codeForCounter(secret, counter);
    const matches = crypto.timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
    if (matches && (lastCounter === null || BigInt(counter) > BigInt(lastCounter))) {
      return counter;
    }
  }
  return null;
};

const buildOtpAuthUri = ({ secret, accountName }) => {
  const issuer = "AL-AMIN CRM";
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${query.toString()}`;
};

const generateRecoveryCodes = (count = 8) =>
  Array.from({ length: count }, () => {
    const bytes = crypto.randomBytes(8);
    let value = "";
    for (let index = 0; index < 8; index += 1) {
      value += RECOVERY_ALPHABET[bytes[index] % RECOVERY_ALPHABET.length];
    }
    return `${value.slice(0, 4)}-${value.slice(4)}`;
  });

const normalizeRecoveryCode = (code) =>
  String(code || "")
    .trim()
    .toUpperCase();

module.exports = {
  buildOtpAuthUri,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  normalizeRecoveryCode,
  verifyTotp,
};
