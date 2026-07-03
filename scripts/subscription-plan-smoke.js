const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../src/db");
const config = require("../src/shared/config");
const platform = require("../src/modules/platform/_services");

const slug = "plan-smoke-company";
const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3013";

const run = async () => {
  let company;
  try {
    const created = await platform.createCompany({
      name: "Plan Smoke Company",
      slug,
      plan_code: "plus",
      subscription_ends_at: null,
      super_admin: {
        first_name: "Plan",
        last_name: "Admin",
        username: "planadmin",
        password: "test12345",
      },
    });
    company = created.company;
    const hash = await bcrypt.hash("test12345", 4);
    await db.root.transaction(async (trx) => {
      await trx.raw("SET LOCAL ROLE crm_tenant_user");
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);
      for (let index = 1; index <= 9; index += 1) {
        await trx("users").insert({
          first_name: "Limit",
          last_name: String(index),
          username: `limit${index}`,
          password: hash,
          role: "worker",
          is_deleted: false,
        });
      }
    });

    const admin = await db
      .root("users")
      .where({ company_id: company.id, role: "super_admin" })
      .first();
    const token = jwt.sign(
      { id: admin.id, role: admin.role, company_id: company.id, company_slug: slug },
      config.jwt.secret,
      { expiresIn: "5m" },
    );
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const [products, clientSales, extraUser] = await Promise.all([
      fetch(`${baseUrl}/api/${slug}/products?limit=1`, { headers }),
      fetch(`${baseUrl}/api/${slug}/client-sales?limit=1`, { headers }),
      fetch(`${baseUrl}/api/${slug}/users/staff`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          first_name: "Extra",
          last_name: "User",
          username: "extrauser",
          password: "test12345",
          role: "worker",
        }),
      }),
    ]);

    const result = {
      plus_core_allowed: products.status === 200,
      plus_client_accounting_blocked: clientSales.status === 403,
      plus_user_limit_enforced: extraUser.status === 400,
    };
    result.passed = Object.values(result).every(Boolean);
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } finally {
    const found = company || (await db.root("companies").where({ slug }).first());
    if (found) {
      await db.root("users").where({ company_id: found.id }).delete();
      await db.root("companies").where({ id: found.id }).delete();
    }
  }
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
