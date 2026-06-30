const db = require("../../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../../shared/config");
const { BadRequestError, NotFoundError, UnauthorizedError } = require("../../shared/errors");

const login = async ({ username, password }) => {
  const admin = await db.root("platform_admins").where({ username, is_active: true }).first();
  if (!admin || !(await bcrypt.compare(password, admin.password))) throw new UnauthorizedError("Username yoki parol noto'g'ri");
  return { token: jwt.sign({ id: admin.id, username: admin.username, scope: "platform" }, config.jwt.secret, { expiresIn: "12h" }), admin: { id: admin.id, username: admin.username, full_name: admin.full_name } };
};

const listCompanies = async () => ({
  companies: await db.root("companies as c")
    .leftJoin("company_subscriptions as cs", "cs.company_id", "c.id")
    .select("c.*", "cs.status as subscription_status", "cs.starts_at", "cs.ends_at", db.root.raw("(SELECT COUNT(*) FROM users u WHERE u.company_id=c.id AND u.is_deleted=false) AS users_count"), db.root.raw("(SELECT COALESCE(SUM(amount),0) FROM subscription_payments sp WHERE sp.company_id=c.id) AS total_paid"), db.root.raw("(SELECT MAX(paid_at) FROM subscription_payments sp WHERE sp.company_id=c.id) AS last_paid_at"))
    .orderBy("c.created_at", "desc"),
});

const createCompany = async (body) => {
  const duplicate = await db.root("companies").where({ slug: body.slug }).first();
  if (duplicate) throw new BadRequestError("Bu korxona kodi band");
  return db.root.transaction(async (trx) => {
    const [company] = await trx("companies").insert({ name: body.name, slug: body.slug, phone: body.phone || null }).returning("*");
    await trx("company_subscriptions").insert({ company_id: company.id, status: "active", ends_at: body.subscription_ends_at || null });
    await trx.raw("SET LOCAL ROLE crm_tenant_user");
    await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);
    const hash = await bcrypt.hash(body.super_admin.password, 10);
    const [admin] = await trx("users").insert({ company_id: company.id, first_name: body.super_admin.first_name, last_name: body.super_admin.last_name, username: body.super_admin.username, password: hash, phone: body.super_admin.phone || null, role: "super_admin", is_deleted: false }).returning(["id", "first_name", "last_name", "username", "role"]);
    return { company, super_admin: admin };
  });
};

const updateCompany = async (body, id) => db.root.transaction(async (trx) => {
  const company = await trx("companies").where({ id }).first();
  if (!company) throw new NotFoundError("Korxona topilmadi");
  const companyPatch = {};
  for (const key of ["name", "phone", "status"]) if (body[key] !== undefined) companyPatch[key] = body[key] || null;
  if (Object.keys(companyPatch).length) await trx("companies").where({ id }).update({ ...companyPatch, updated_at: trx.fn.now() });
  const subscriptionPatch = {};
  if (body.subscription_status !== undefined) subscriptionPatch.status = body.subscription_status;
  if (body.subscription_ends_at !== undefined) subscriptionPatch.ends_at = body.subscription_ends_at;
  if (Object.keys(subscriptionPatch).length) await trx("company_subscriptions").where({ company_id: id }).update({ ...subscriptionPatch, updated_at: trx.fn.now() });
  return { message: "Korxona yangilandi" };
});

const createPayment = async (body) => {
  const company = await db.root("companies").where({ id: body.company_id }).first();
  if (!company) throw new NotFoundError("Korxona topilmadi");
  return db.root.transaction(async (trx) => {
    const [payment] = await trx("subscription_payments").insert({ ...body, paid_at: body.paid_at || trx.fn.now(), note: body.note || null }).returning("*");
    const patch = { status: "active", updated_at: trx.fn.now() };
    if (body.period_to) patch.ends_at = body.period_to;
    await trx("company_subscriptions").where({ company_id: body.company_id }).update(patch);
    await trx("companies").where({ id: body.company_id }).update({ status: "active", updated_at: trx.fn.now() });
    return { subscription_payment: payment };
  });
};

const listPayments = async (companyId) => ({ subscription_payments: await db.root("subscription_payments").where(companyId ? { company_id: Number(companyId) } : {}).orderBy("paid_at", "desc").limit(200) });

module.exports = { login, listCompanies, createCompany, updateCompany, createPayment, listPayments };
