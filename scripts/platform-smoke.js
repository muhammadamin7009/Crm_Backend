const db = require("../src/db");
const platform = require("../src/modules/platform/_services");

const slug = "platform-smoke-company";

const run = async () => {
  let company;
  try {
    const created = await platform.createCompany({
      name: "Platform Smoke Company",
      slug,
      phone: null,
      subscription_ends_at: null,
      super_admin: {
        first_name: "Test",
        last_name: "Admin",
        username: "muhammad",
        password: "test12345",
        phone: null,
      },
    });
    company = created.company;
    const listed = await platform.listCompanies();
    const row = listed.companies.find((item) => item.slug === slug);
    console.log(JSON.stringify({ created: Boolean(company), super_admin_created: Boolean(created.super_admin), listed: Boolean(row), users_count: Number(row?.users_count || 0) }, null, 2));
  } finally {
    const found = company || (await db.root("companies").where({ slug }).first());
    if (found) {
      await db.root("users").where({ company_id: found.id }).del();
      await db.root("companies").where({ id: found.id }).del();
    }
  }
};

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.destroy());
