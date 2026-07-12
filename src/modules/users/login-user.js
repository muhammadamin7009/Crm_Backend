const db = require("../../db");
const { BadRequestError, UnauthorizedError } = require("../../shared/errors");
const { sendSms } = require("../../shared/sms");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../../shared/config");

const maskPhone = (phone = "") => phone.replace(/^(\+?\d{3})\d+(\d{2})$/, "$1******$2");

const deviceName = (userAgent = "") => {
  const browser = /Edg/i.test(userAgent)
    ? "Edge"
    : /Firefox/i.test(userAgent)
      ? "Firefox"
      : /Chrome/i.test(userAgent)
        ? "Chrome"
        : /Safari/i.test(userAgent)
          ? "Safari"
          : "Brauzer";
  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /Android/i.test(userAgent)
      ? "Android"
      : /iPhone|iPad/i.test(userAgent)
        ? "iOS"
        : /Mac OS/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "Noma'lum qurilma";
  return `${browser} / ${os}`;
};

const getUserPermissions = async (user) => {
  if (user.role === "super_admin") return ["*"];
  if (user.role !== "admin") return [];

  const rows = await db("user_permissions")
    .where({ user_id: user.id, allowed: true })
    .select("permission_key");

  return rows.map((row) => row.permission_key);
};

const publicUser = async (existing, company) => ({
  id: existing.id,
  username: existing.username,
  role: existing.role,
  first_name: existing.first_name,
  last_name: existing.last_name,
  user_image: existing.user_image,
  phone: existing.phone,
  company_id: existing.company_id,
  company_slug: company.slug,
  company_name: company.name,
  company_logo_url: company.logo_url || null,
  plan_code: company.plan_code,
  plan_name: company.plan_name,
  plan_features: company.plan_features || [],
  plan_max_users: company.plan_max_users,
  permissions: await getUserPermissions(existing),
});

const issueSession = async (existing, company, meta) => {
  const sessionId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const knownDevice = await db("user_sessions")
    .where({ user_id: existing.id, device_id: meta.device_id })
    .first("id");

  await db("user_sessions").insert({
    id: sessionId,
    token_jti: jti,
    company_id: existing.company_id,
    user_id: existing.id,
    device_id: meta.device_id,
    device_name: deviceName(meta.user_agent),
    user_agent: meta.user_agent || null,
    ip_address: meta.ip_address || null,
    expires_at: expiresAt,
  });

  const token = jwt.sign(
    {
      id: existing.id,
      role: existing.role,
      company_id: existing.company_id,
      company_slug: company.slug,
      jti,
      session_id: sessionId,
    },
    config.jwt.secret,
    { expiresIn: "2d" },
  );

  if (!knownDevice && existing.role === "super_admin" && existing.phone) {
    await sendSms({
      phone: existing.phone,
      message: `ZERR CRM: profilingizga yangi qurilmadan kirildi: ${deviceName(meta.user_agent)}. Agar bu siz bo'lmasangiz, boshqa qurilmalardan chiqishni bosing.`,
    });
  }

  return { token, user: await publicUser(existing, company) };
};

const findUser = (username) =>
  db("users")
    .where({ username, is_deleted: false })
    .select(
      "id",
      "username",
      "password",
      "user_image",
      "role",
      "first_name",
      "last_name",
      "phone",
      "company_id",
    )
    .first();

const login = async ({ username, password, device_id }, company, metadata = {}) => {
  const existing = await findUser(username);
  if (!existing || !(await bcrypt.compare(password, existing.password))) {
    throw new UnauthorizedError("Foydalanuvchi nomi yoki parol noto'g'ri");
  }

  const meta = { ...metadata, device_id: device_id || metadata.device_id || crypto.randomUUID() };

  if (existing.role !== "super_admin") return issueSession(existing, company, meta);
  if (!existing.phone) throw new BadRequestError("Super administrator telefon raqami kiritilmagan");

  const recent = await db("auth_challenges")
    .where({ user_id: existing.id })
    .where("created_at", ">", new Date(Date.now() - 10 * 60 * 1000))
    .count({ count: "id" })
    .first();
  if (Number(recent.count) >= 3) {
    throw new BadRequestError("Kod juda ko'p so'raldi. 10 daqiqadan keyin urinib ko'ring");
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const challengeId = crypto.randomUUID();
  await db("auth_challenges").insert({
    id: challengeId,
    company_id: existing.company_id,
    user_id: existing.id,
    code_hash: await bcrypt.hash(code, 10),
    device_id: meta.device_id,
    user_agent: meta.user_agent || null,
    ip_address: meta.ip_address || null,
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
  });
  const sentSms = await sendSms({
    phone: existing.phone,
    message: `ZERR CRM tasdiqlash kodi: ${code}. Kod 5 daqiqa amal qiladi.`,
  });

  return {
    mfa_required: true,
    challenge_id: challengeId,
    masked_phone: maskPhone(sentSms?.phone || existing.phone),
    expires_in: 300,
  };
};

login.verify = async ({ challenge_id, code }, company) => {
  const challenge = await db("auth_challenges").where({ id: challenge_id }).first();
  if (!challenge || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()) {
    throw new UnauthorizedError("Tasdiqlash kodi eskirgan");
  }
  if (challenge.attempts >= 5) throw new UnauthorizedError("Urinishlar soni tugadi");

  const valid = await bcrypt.compare(code, challenge.code_hash);
  if (!valid) {
    await db("auth_challenges").where({ id: challenge.id }).increment("attempts", 1);
    throw new UnauthorizedError("Tasdiqlash kodi noto'g'ri");
  }

  await db("auth_challenges").where({ id: challenge.id }).update({ consumed_at: db.fn.now() });
  const existing = await db("users").where({ id: challenge.user_id, is_deleted: false }).first();
  if (!existing) throw new UnauthorizedError("Foydalanuvchi topilmadi");

  return issueSession(existing, company, {
    device_id: challenge.device_id,
    user_agent: challenge.user_agent,
    ip_address: challenge.ip_address,
  });
};

module.exports = login;
