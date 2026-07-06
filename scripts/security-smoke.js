const db = require("../src/db");
const jwt = require("jsonwebtoken");
const sms = require("../src/shared/sms");

let otp = "";
sms.sendSms = async ({ message }) => {
  const match = message.match(/(\d{6})/);
  if (match) otp = match[1];
};

const login = require("../src/modules/users/login-user");
const sessions = require("../src/modules/users/user-sessions");
const platform = require("../src/modules/platform/_services");

const run = async () => {
  const slug = "security-smoke-company";
  const leftover = await db.root("companies").where({ slug }).first();
  if (leftover) await platform.deleteCompany(leftover.id, slug);
  const created = await platform.createCompany({
    name: "Security Smoke",
    slug,
    phone: null,
    plan_code: "enterprise",
    subscription_ends_at: null,
    super_admin: {
      first_name: "Security",
      last_name: "Admin",
      username: "securityadmin",
      password: "Test12345",
      phone: "+998900000001",
    },
  });
  const company = await db.root("companies").where({ id: created.company.id }).first();
  try {
    await db.root.transaction(async (trx) => {
    await trx.raw("SET LOCAL ROLE crm_tenant_user");
    await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);
    await db.runWithDatabase(trx, async () => {
      const step1 = await login(
        { username: "securityadmin", password: "Test12345", device_id: "codex-smoke-device" },
        company,
        { user_agent: "Codex Security Smoke / Windows", ip_address: "127.0.0.1" },
      );
      if (!step1.mfa_required || !otp) throw new Error("MFA challenge yaralmadi");

      const step2 = await login.verify({ challenge_id: step1.challenge_id, code: otp }, company);
      const decoded = jwt.decode(step2.token);
      const actor = { id: step2.user.id, session_id: decoded.session_id };
      const listed = await sessions.listSessions(actor);
      await sessions.revokeSession(actor.session_id, actor);
      const revoked = await trx("user_sessions").where({ id: actor.session_id }).first("revoked_at");

      await trx("user_sessions").where({ device_id: "codex-smoke-device" }).delete();
      await trx("auth_challenges").where({ id: step1.challenge_id }).delete();

      console.log(JSON.stringify({
        mfa_required: true,
        token_has_session: Boolean(actor.session_id),
        session_listed: listed.sessions.length > 0,
        revoke_verified: Boolean(revoked.revoked_at),
      }, null, 2));
    });
    });
  } finally {
    await platform.deleteCompany(company.id, slug);
  }
};

run()
  .then(() => db.root.destroy())
  .catch(async (error) => {
    console.error(error);
    await db.root.destroy();
    process.exit(1);
  });
