const db = require("../../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../../shared/config");
const { BadRequestError, NotFoundError, UnauthorizedError } = require("../../shared/errors");

const setTenantContext = (trx, companyId) =>
  trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(companyId)]);

const login = async ({ username, password }) => {
  const admin = await db.root("platform_admins").where({ username, is_active: true }).first();
  if (!admin || !(await bcrypt.compare(password, admin.password)))
    throw new UnauthorizedError("Username yoki parol noto'g'ri");
  return {
    token: jwt.sign(
      { id: admin.id, username: admin.username, scope: "platform" },
      config.jwt.secret,
      { expiresIn: "12h" },
    ),
    admin: { id: admin.id, username: admin.username, full_name: admin.full_name },
  };
};

const listCompanies = async () => {
  const companies = await db
    .root("companies as c")
    .leftJoin("company_subscriptions as cs", "cs.company_id", "c.id")
    .leftJoin("subscription_plans as sp", "sp.id", "cs.plan_id")
    .select(
      "c.*",
      "cs.status as subscription_status",
      "cs.starts_at",
      "cs.ends_at",
      "sp.code as plan_code",
      "sp.name as plan_name",
      "sp.monthly_price",
      "sp.max_users",
      "sp.storage_mb",
      db.root.raw(
        "(SELECT COALESCE(SUM(amount),0) FROM subscription_payments pay WHERE pay.company_id=c.id) AS total_paid",
      ),
      db.root.raw(
        "(SELECT MAX(paid_at) FROM subscription_payments pay WHERE pay.company_id=c.id) AS last_paid_at",
      ),
    )
    .orderBy("c.created_at", "desc");

  const companiesWithUserCounts = await Promise.all(
    companies.map((company) =>
      db.root.transaction(async (trx) => {
        await setTenantContext(trx, company.id);
        const row = await trx("users")
          .where({ company_id: company.id, is_deleted: false })
          .count({ count: "id" })
          .first();
        return { ...company, users_count: Number(row?.count || 0) };
      }),
    ),
  );

  return { companies: companiesWithUserCounts };
};

const createCompany = async (body) => {
  const duplicate = await db.root("companies").where({ slug: body.slug }).first();
  if (duplicate) throw new BadRequestError("Bu korxona kodi band");
  const plan = await db
    .root("subscription_plans")
    .where({ code: body.plan_code, is_active: true })
    .first();
  if (!plan) throw new NotFoundError("Obuna rejasi topilmadi");
  return db.root.transaction(async (trx) => {
    const [company] = await trx("companies")
      .insert({ name: body.name, slug: body.slug, phone: body.phone || null })
      .returning("*");
    await trx("company_subscriptions").insert({
      company_id: company.id,
      plan_id: plan.id,
      status: "active",
      ends_at: body.subscription_ends_at || null,
    });
    await trx.raw("SET LOCAL ROLE crm_tenant_user");
    await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);
    const hash = await bcrypt.hash(body.super_admin.password, 10);
    const [admin] = await trx("users")
      .insert({
        company_id: company.id,
        first_name: body.super_admin.first_name,
        last_name: body.super_admin.last_name,
        username: body.super_admin.username,
        password: hash,
        phone: body.super_admin.phone || null,
        role: "super_admin",
        is_deleted: false,
      })
      .returning(["id", "first_name", "last_name", "username", "role"]);
    await trx("warehouses").insert({
      company_id: company.id,
      name: "Asosiy ombor",
      code: "MAIN",
      is_default: true,
      is_active: true,
      created_by: admin.id,
    });
    return { company, super_admin: admin };
  });
};

const updateCompany = async (body, id) =>
  db.root.transaction(async (trx) => {
    const company = await trx("companies").where({ id }).first();
    if (!company) throw new NotFoundError("Korxona topilmadi");
    const companyPatch = {};
    for (const key of ["name", "phone", "status"])
      if (body[key] !== undefined) companyPatch[key] = body[key] || null;
    if (Object.keys(companyPatch).length)
      await trx("companies")
        .where({ id })
        .update({ ...companyPatch, updated_at: trx.fn.now() });
    const subscriptionPatch = {};
    if (body.subscription_status !== undefined) subscriptionPatch.status = body.subscription_status;
    if (body.subscription_ends_at !== undefined)
      subscriptionPatch.ends_at = body.subscription_ends_at;
    if (body.plan_code !== undefined) {
      const plan = await trx("subscription_plans")
        .where({ code: body.plan_code, is_active: true })
        .first();
      if (!plan) throw new NotFoundError("Obuna rejasi topilmadi");
      subscriptionPatch.plan_id = plan.id;
    }
    if (Object.keys(subscriptionPatch).length)
      await trx("company_subscriptions")
        .where({ company_id: id })
        .update({ ...subscriptionPatch, updated_at: trx.fn.now() });
    return { message: "Korxona yangilandi" };
  });

const getCompanyManagement = async (id) => {
  return db.root.transaction(async (trx) => {
    const company = await trx("companies").where({ id }).first();
    if (!company) throw new NotFoundError("Korxona topilmadi");

    await setTenantContext(trx, id);
    const superAdmin = await trx("users")
      .where({ company_id: id, role: "super_admin", is_deleted: false })
      .select(
        "id",
        "first_name",
        "last_name",
        "username",
        "phone",
        "user_image",
        "totp_enabled",
        "totp_confirmed_at",
        "updated_at",
      )
      .first();
    if (!superAdmin) throw new NotFoundError("Korxona super administratori topilmadi");

    return { company, super_admin: superAdmin };
  });
};

const updateCompanyManagement = async (body, id) =>
  db.root.transaction(async (trx) => {
    const company = await trx("companies").where({ id }).first();
    if (!company) throw new NotFoundError("Korxona topilmadi");

    await setTenantContext(trx, id);
    const superAdmin = await trx("users")
      .where({ company_id: id, role: "super_admin", is_deleted: false })
      .first();
    if (!superAdmin) throw new NotFoundError("Korxona super administratori topilmadi");

    if (body.company) {
      const companyPatch = {};
      if (body.company.name !== undefined) companyPatch.name = body.company.name;
      if (body.company.phone !== undefined) companyPatch.phone = body.company.phone || null;
      if (Object.keys(companyPatch).length) {
        await trx("companies")
          .where({ id })
          .update({ ...companyPatch, updated_at: trx.fn.now() });
      }
    }

    if (body.super_admin) {
      const adminPatch = {};
      for (const key of ["first_name", "last_name", "username"]) {
        if (body.super_admin[key] !== undefined) adminPatch[key] = body.super_admin[key];
      }
      if (body.super_admin.phone !== undefined) adminPatch.phone = body.super_admin.phone || null;

      if (adminPatch.username && adminPatch.username !== superAdmin.username) {
        const duplicate = await trx("users")
          .where({ company_id: id, username: adminPatch.username })
          .whereNot({ id: superAdmin.id })
          .first("id");
        if (duplicate) throw new BadRequestError("Bu foydalanuvchi nomi korxonada band");
      }

      if (body.super_admin.password) {
        adminPatch.password = await bcrypt.hash(body.super_admin.password, 10);
      }
      if (Object.keys(adminPatch).length) {
        await trx("users")
          .where({ id: superAdmin.id, company_id: id })
          .update({ ...adminPatch, updated_at: trx.fn.now() });
      }
    }

    return { message: "Korxona va super administrator ma'lumotlari yangilandi" };
  });

const resetCompanyAuthenticator = async (id) =>
  db.root.transaction(async (trx) => {
    const company = await trx("companies").where({ id }).first("id");
    if (!company) throw new NotFoundError("Korxona topilmadi");

    await setTenantContext(trx, id);
    const superAdmin = await trx("users")
      .where({ company_id: id, role: "super_admin", is_deleted: false })
      .first("id");
    if (!superAdmin) throw new NotFoundError("Korxona super administratori topilmadi");

    await trx("auth_challenges").where({ user_id: superAdmin.id }).delete();
    await trx("user_recovery_codes").where({ user_id: superAdmin.id }).delete();
    await trx("user_sessions").where({ user_id: superAdmin.id }).delete();
    await trx("users").where({ id: superAdmin.id, company_id: id }).update({
      totp_secret_encrypted: null,
      totp_enabled: false,
      totp_last_counter: null,
      totp_confirmed_at: null,
      updated_at: trx.fn.now(),
    });

    return { message: "Authenticator sozlamasi tiklandi. Keyingi kirishda yangi QR-kod chiqadi" };
  });

const deleteCompany = async (id, confirmSlug) =>
  db.root.transaction(async (trx) => {
    const company = await trx("companies").where({ id }).first();
    if (!company) throw new NotFoundError("Korxona topilmadi");
    if (company.slug !== confirmSlug) {
      throw new BadRequestError("Tasdiqlash uchun korxona kodini aynan kiriting");
    }

    await setTenantContext(trx, id);
    const tables = [
      "audit_logs",
      "auth_challenges",
      "user_recovery_codes",
      "user_sessions",
      "user_permissions",
      "inventory_movements",
      "inventory_balances",
      "warehouses",
      "cash_transactions",
      "expenses",
      "client_returns",
      "client_payments",
      "client_sales",
      "supplier_payments",
      "material_purchase_items",
      "material_purchases",
      "worker_payments",
      "payroll_lines",
      "payroll_periods",
      "worker_advances",
      "worker_outputs",
      "employee_agreements",
      "employee_profiles",
      "positions",
      "product_department_prices",
      "product_images",
      "products",
      "categories",
      "departments",
      "raw_materials",
      "suppliers",
      "expense_categories",
      "financial_accounts",
      "users",
    ];

    for (const table of tables) {
      await trx(table).where({ company_id: id }).delete();
    }
    await trx("subscription_payments").where({ company_id: id }).delete();
    await trx("company_subscriptions").where({ company_id: id }).delete();
    await trx("companies").where({ id }).delete();

    return { message: `${company.name} korxonasi butunlay o'chirildi` };
  });

const createPayment = async (body) => {
  const company = await db.root("companies").where({ id: body.company_id }).first();
  if (!company) throw new NotFoundError("Korxona topilmadi");
  return db.root.transaction(async (trx) => {
    const [payment] = await trx("subscription_payments")
      .insert({ ...body, paid_at: body.paid_at || trx.fn.now(), note: body.note || null })
      .returning("*");
    const patch = { status: "active", updated_at: trx.fn.now() };
    if (body.period_to) patch.ends_at = body.period_to;
    await trx("company_subscriptions").where({ company_id: body.company_id }).update(patch);
    await trx("companies")
      .where({ id: body.company_id })
      .update({ status: "active", updated_at: trx.fn.now() });
    return { subscription_payment: payment };
  });
};

const listPayments = async (companyId) => ({
  subscription_payments: await db
    .root("subscription_payments")
    .where(companyId ? { company_id: Number(companyId) } : {})
    .orderBy("paid_at", "desc")
    .limit(200),
});

const listPlans = async () => ({
  subscription_plans: await db
    .root("subscription_plans")
    .where({ is_active: true })
    .select("id", "code", "name", "monthly_price", "max_users", "storage_mb", "features")
    .orderBy("monthly_price"),
});

module.exports = {
  login,
  listCompanies,
  createCompany,
  updateCompany,
  getCompanyManagement,
  updateCompanyManagement,
  resetCompanyAuthenticator,
  deleteCompany,
  createPayment,
  listPayments,
  listPlans,
};
