const jwt = require("jsonwebtoken");
const db = require("../src/db");
const config = require("../src/shared/config");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3001";
const tokenFor = (user, company) => jwt.sign({ id: user.id, role: user.role, company_id: company.id, company_slug: company.slug }, config.jwt.secret, { expiresIn: "5m" });

const run = async () => {
  const company = await db.root("companies").where({ slug: "zerrshoes" }).first();
  const [client, worker, manager] = await Promise.all([
    db.root("users").where({ company_id: company.id, role: "client", is_deleted: false }).first(),
    db.root("users").where({ company_id: company.id, role: "worker", is_deleted: false }).first(),
    db.root("users").where({ company_id: company.id, role: "super_admin", is_deleted: false }).first(),
  ]);
  const request = (path, user) => fetch(`${baseUrl}/api/${company.slug}${path}`, { headers: { Authorization: `Bearer ${tokenFor(user, company)}` } });
  const [clientUsers, clientPayments, clientOwn, workerUsers, workerBalance, managerFinance] = await Promise.all([
    request("/users?limit=1", client), request("/worker-payments?limit=1", client), request("/client-sales/me?limit=1", client), request("/users?limit=100", worker), request("/worker-payments/balance", worker), request("/reports/profit-loss", manager),
  ]);
  const workerBody = await workerUsers.json();
  const privateLeak = (workerBody.users || []).some((user) => "username" in user || "phone" in user);
  const result = { client_users: clientUsers.status, client_worker_payments: clientPayments.status, client_own_dashboard: clientOwn.status, worker_users: workerUsers.status, worker_balance: workerBalance.status, manager_finance: managerFinance.status, worker_private_fields_hidden: !privateLeak };
  result.passed = result.client_users === 403 && result.client_worker_payments === 403 && result.client_own_dashboard === 200 && result.worker_users === 200 && result.worker_balance === 200 && result.manager_finance === 200 && !privateLeak;
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
};

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.destroy());
