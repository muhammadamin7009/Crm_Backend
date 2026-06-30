const jwt = require("jsonwebtoken");
const db = require("../src/db");
const config = require("../src/shared/config");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3010";

const run = async () => {
  const company = await db.root("companies").where({ slug: "zerrshoes" }).first();
  const user = await db.root("users").where({ company_id: company.id, is_deleted: false }).first();
  const [other] = await db.root("companies").insert({ name: "HTTP Smoke Company", slug: "http-smoke-company" }).returning("*");
  const token = jwt.sign({ id: user.id, role: user.role, company_id: company.id, company_slug: company.slug }, config.jwt.secret, { expiresIn: "5m" });

  try {
    const headers = { Authorization: `Bearer ${token}` };
    const own = await fetch(`${baseUrl}/api/zerrshoes/users?limit=1`, { headers });
    const cross = await fetch(`${baseUrl}/api/${other.slug}/users?limit=1`, { headers });
    console.log(JSON.stringify({ own_company_status: own.status, cross_company_status: cross.status, isolated: own.status === 200 && cross.status === 401 }, null, 2));
    if (own.status !== 200 || cross.status !== 401) process.exitCode = 1;
  } finally {
    await db.root("companies").where({ id: other.id }).del();
  }
};

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.destroy());
