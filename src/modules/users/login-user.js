const db = require("../../db");
const { BadRequestError, UnauthorizedError } = require("../../shared/errors");
const { sendSms } = require("../../shared/sms");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const QRCode = require("qrcode");
const config = require("../../shared/config");
const {
  buildOtpAuthUri,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  normalizeRecoveryCode,
  verifyTotp,
} = require("../../shared/mfa/totp");

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
  if (!["admin", "worker"].includes(user.role)) return [];

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
  plan_max_workers: company.plan_max_workers,
  plan_max_clients: company.plan_max_clients,
  plan_max_admins: company.plan_max_admins,
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
    try {
      await sendSms({
        phone: existing.phone,
        message: `AL-AMIN CRM: profilingizga yangi qurilmadan kirildi: ${deviceName(meta.user_agent)}. Agar bu siz bo'lmasangiz, boshqa qurilmalardan chiqishni bosing.`,
      });
    } catch (error) {
      console.error("Yangi qurilma SMS ogohlantirishi yuborilmadi:", error.message);
    }
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
      "totp_secret_encrypted",
      "totp_enabled",
      "totp_last_counter",
    )
    .first();

const login = async ({ username, password, device_id }, company, metadata = {}) => {
  const existing = await findUser(username);
  if (!existing || !(await bcrypt.compare(password, existing.password))) {
    throw new UnauthorizedError("Foydalanuvchi nomi yoki parol noto'g'ri");
  }

  const meta = { ...metadata, device_id: device_id || metadata.device_id || crypto.randomUUID() };

  if (existing.role !== "super_admin") return issueSession(existing, company, meta);

  const recent = await db("auth_challenges")
    .where({ user_id: existing.id })
    .where("created_at", ">", new Date(Date.now() - 10 * 60 * 1000))
    .count({ count: "id" })
    .first();
  if (Number(recent.count) >= 3) {
    throw new BadRequestError("Kod juda ko'p so'raldi. 10 daqiqadan keyin urinib ko'ring");
  }

  let secret;
  let encryptedSecret = existing.totp_secret_encrypted;
  const setupRequired = !existing.totp_enabled;

  if (!encryptedSecret) {
    secret = generateSecret();
    encryptedSecret = encryptSecret(secret);
    await db("users").where({ id: existing.id }).update({
      totp_secret_encrypted: encryptedSecret,
      totp_enabled: false,
      totp_last_counter: null,
      totp_confirmed_at: null,
      updated_at: db.fn.now(),
    });
  } else {
    secret = decryptSecret(encryptedSecret);
  }

  const challengeId = crypto.randomUUID();
  await db("auth_challenges").insert({
    id: challengeId,
    company_id: existing.company_id,
    user_id: existing.id,
    code_hash: "totp",
    method: setupRequired ? "totp_setup" : "totp",
    device_id: meta.device_id,
    user_agent: meta.user_agent || null,
    ip_address: meta.ip_address || null,
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
  });

  const result = {
    mfa_required: true,
    mfa_method: "totp",
    setup_required: setupRequired,
    challenge_id: challengeId,
    expires_in: 300,
  };

  if (setupRequired) {
    const accountName = `${company.slug}:${existing.username}`;
    const otpAuthUri = buildOtpAuthUri({ secret, accountName });
    result.qr_code_data_url = await QRCode.toDataURL(otpAuthUri, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
    });
    result.manual_key = secret;
    result.account_name = accountName;
  }

  return result;
};

login.verify = async ({ challenge_id, code }, company) => {
  const challenge = await db("auth_challenges").where({ id: challenge_id }).first();
  if (!challenge || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()) {
    throw new UnauthorizedError("Tasdiqlash kodi eskirgan");
  }
  if (challenge.attempts >= 5) throw new UnauthorizedError("Urinishlar soni tugadi");

  const existing = await db("users").where({ id: challenge.user_id, is_deleted: false }).first();
  if (!existing) throw new UnauthorizedError("Foydalanuvchi topilmadi");

  const method = challenge.method || "sms";
  let recoveryCodes = null;

  if (method === "sms") {
    const valid = await bcrypt.compare(code, challenge.code_hash);
    if (!valid) {
      await db("auth_challenges").where({ id: challenge.id }).increment("attempts", 1);
      throw new UnauthorizedError("Tasdiqlash kodi noto'g'ri");
    }
  } else {
    if (!existing.totp_secret_encrypted) {
      throw new UnauthorizedError("Authenticator sozlamasi topilmadi");
    }

    const secret = decryptSecret(existing.totp_secret_encrypted);
    const counter = verifyTotp(secret, code, existing.totp_last_counter);
    let recoveryCodeRow = null;

    if (counter === null && method === "totp") {
      const normalizedCode = normalizeRecoveryCode(code);
      if (/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalizedCode)) {
        const rows = await db("user_recovery_codes")
          .where({ user_id: existing.id })
          .whereNull("used_at")
          .select("id", "code_hash");
        for (const row of rows) {
          if (await bcrypt.compare(normalizedCode, row.code_hash)) {
            recoveryCodeRow = row;
            break;
          }
        }
      }
    }

    if (counter === null && !recoveryCodeRow) {
      await db("auth_challenges").where({ id: challenge.id }).increment("attempts", 1);
      throw new UnauthorizedError("Authenticator kodi noto'g'ri yoki allaqachon ishlatilgan");
    }

    if (recoveryCodeRow) {
      const used = await db("user_recovery_codes")
        .where({ id: recoveryCodeRow.id, user_id: existing.id })
        .whereNull("used_at")
        .update({ used_at: db.fn.now() });
      if (!used) throw new UnauthorizedError("Tiklash kodi allaqachon ishlatilgan");
    } else {
      const updated = await db("users")
        .where({ id: existing.id })
        .where((builder) => {
          builder.whereNull("totp_last_counter").orWhere("totp_last_counter", "<", counter);
        })
        .update({
          totp_last_counter: counter,
          ...(method === "totp_setup"
            ? { totp_enabled: true, totp_confirmed_at: db.fn.now() }
            : {}),
          updated_at: db.fn.now(),
        });
      if (!updated) throw new UnauthorizedError("Authenticator kodi allaqachon ishlatilgan");
    }

    if (method === "totp_setup") {
      recoveryCodes = generateRecoveryCodes();
      const hashes = await Promise.all(
        recoveryCodes.map(async (recoveryCode) => ({
          company_id: existing.company_id,
          user_id: existing.id,
          code_hash: await bcrypt.hash(recoveryCode, 10),
        })),
      );
      await db("user_recovery_codes").where({ user_id: existing.id }).delete();
      await db("user_recovery_codes").insert(hashes);
    }
  }

  await db("auth_challenges").where({ id: challenge.id }).update({ consumed_at: db.fn.now() });

  const session = await issueSession(existing, company, {
    device_id: challenge.device_id,
    user_agent: challenge.user_agent,
    ip_address: challenge.ip_address,
  });
  return recoveryCodes ? { ...session, recovery_codes: recoveryCodes } : session;
};

module.exports = login;
