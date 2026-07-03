const jwt = require("jsonwebtoken");
const db = require("../src/db");
const config = require("../src/shared/config");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3011";
const marker = `__audit_smoke_${Date.now()}__`;

const run = async () => {
  const company = await db.root("companies").where({ slug: "zerrshoes" }).first();
  const [manager, client] = await Promise.all([
    db
      .root("users")
      .where({ company_id: company.id, role: "super_admin", is_deleted: false })
      .first(),
    db.root("users").where({ company_id: company.id, role: "client", is_deleted: false }).first(),
  ]);
  const tokenFor = (user) =>
    jwt.sign(
      { id: user.id, role: user.role, company_id: company.id, company_slug: company.slug },
      config.jwt.secret,
      { expiresIn: "5m" },
    );
  const request = (path, user, options = {}) =>
    fetch(`${baseUrl}/api/${company.slug}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenFor(user)}`,
        ...options.headers,
      },
    });

  let categoryId;
  let auditId;
  try {
    const [managerList, clientList] = await Promise.all([
      request("/audit-logs?limit=1", manager),
      request("/audit-logs?limit=1", client),
    ]);
    const created = await request("/expense-categories", manager, {
      method: "POST",
      body: JSON.stringify({ name: marker, description: "audit smoke" }),
    });
    const createdBody = await created.json();
    categoryId = createdBody.expense_category?.id;
    await new Promise((resolve) => setTimeout(resolve, 300));
    const audit = await db
      .root("audit_logs")
      .where({ company_id: company.id, actor_user_id: manager.id, action: "POST" })
      .where("path", "like", "%/expense-categories")
      .orderBy("id", "desc")
      .first();
    auditId = audit?.id;

    const result = {
      manager_can_view: managerList.status === 200,
      client_is_blocked: clientList.status === 403,
      mutation_logged: created.ok && Boolean(audit),
      tenant_recorded: Number(audit?.company_id) === Number(company.id),
    };
    result.passed = Object.values(result).every(Boolean);
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } finally {
    if (categoryId) await db.root("expense_categories").where({ id: categoryId }).delete();
    if (auditId) await db.root("audit_logs").where({ id: auditId }).delete();
  }
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
