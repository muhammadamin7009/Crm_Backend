const db = require("../db");
const { BadRequestError } = require("./errors");

const ROLE_GROUPS = {
  worker: {
    roles: ["worker"],
    limitField: "plan_max_workers",
    label: "ishchi",
    lockKey: 1,
  },
  client: {
    roles: ["client", "customer"],
    limitField: "plan_max_clients",
    label: "mijoz",
    lockKey: 2,
  },
  admin: {
    roles: ["admin"],
    limitField: "plan_max_admins",
    label: "admin",
    lockKey: 3,
  },
};

const groupForRole = (role) => {
  if (role === "worker") return ROLE_GROUPS.worker;
  if (role === "client" || role === "customer") return ROLE_GROUPS.client;
  if (role === "admin") return ROLE_GROUPS.admin;
  return null;
};

const countRoleGroup = async (group, companyId) => {
  const query = db("users")
    .where({ is_deleted: false })
    .whereIn("role", group.roles);
  if (companyId) query.andWhere("company_id", Number(companyId));
  const row = await query.count({ count: "id" }).first();
  return Number(row?.count || 0);
};

const assertRoleLimit = async (role, company, { lock = true } = {}) => {
  const group = groupForRole(role);
  if (!group) return;

  const limit = Number(company?.[group.limitField] || 0);
  if (!limit) return;

  if (lock) {
    await db.raw("SELECT pg_advisory_xact_lock(?, ?)", [Number(company.id), group.lockKey]);
  }

  const count = await countRoleGroup(group, company?.id);
  if (count >= limit) {
    throw new BadRequestError(
      `${company.plan_name || "Joriy"} tarifida maksimum ${limit} ta ${group.label} mumkin`,
    );
  }
};

const roleCounts = async (database = db, companyId = null) => {
  const query = database("users")
    .where({ is_deleted: false })
    .whereIn("role", ["worker", "client", "customer", "admin"]);
  if (companyId) query.andWhere("company_id", Number(companyId));
  const rows = await query
    .groupBy("role")
    .select("role")
    .count({ count: "id" });

  const counts = { workers: 0, clients: 0, admins: 0 };
  for (const row of rows) {
    if (row.role === "worker") counts.workers += Number(row.count);
    if (row.role === "client" || row.role === "customer") counts.clients += Number(row.count);
    if (row.role === "admin") counts.admins += Number(row.count);
  }
  return counts;
};

const assertPlanCanFitCounts = (plan, counts) => {
  const checks = [
    ["workers", "max_workers", "ishchi"],
    ["clients", "max_clients", "mijoz"],
    ["admins", "max_admins", "admin"],
  ];
  for (const [countField, limitField, label] of checks) {
    const limit = Number(plan[limitField] || 0);
    if (limit && counts[countField] > limit) {
      throw new BadRequestError(
        `Tarifni almashtirib bo'lmaydi: ${counts[countField]} ta ${label} mavjud, yangi limit ${limit} ta`,
      );
    }
  }
};

module.exports = {
  assertPlanCanFitCounts,
  assertRoleLimit,
  groupForRole,
  roleCounts,
};
