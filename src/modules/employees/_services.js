const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");
const clean = (value) => value || null;

const ensurePosition = async (id) => {
  const position = await db("positions")
    .where({ id: Number(id), is_deleted: false, is_active: true })
    .first();
  if (!position) throw new NotFoundError("Faol lavozim topilmadi");
  return position;
};

const ensureDepartment = async (id) => {
  if (!id) return null;
  const department = await db("departments")
    .where({ id: Number(id), is_deleted: false, is_active: true })
    .first();
  if (!department) throw new NotFoundError("Faol bo'lim topilmadi");
  return department;
};

const listPositions = async ({
  q = "",
  is_active,
  limit = 100,
  offset = 0,
}) => {
  const query = db("positions as p")
    .leftJoin("departments as d", "d.id", "p.department_id")
    .where("p.is_deleted", false);
  if (q) query.andWhereILike("p.name", `%${q}%`);
  if (is_active !== undefined) query.andWhere("p.is_active", is_active);
  const [rows, count] = await Promise.all([
    query
      .clone()
      .select("p.*", "d.name as department_name")
      .orderBy("p.name")
      .limit(Number(limit))
      .offset(Number(offset)),
    query.clone().clearSelect().count({ count: "p.id" }).first(),
  ]);
  return {
    positions: rows,
    pageInfo: {
      total: Number(count.count),
      limit: Number(limit),
      offset: Number(offset),
    },
  };
};
const createPosition = async (body) => {
  await ensureDepartment(body.department_id);
  return { position: (
    await db("positions")
      .insert({
        name: body.name,
        department_id: body.department_id ? Number(body.department_id) : null,
        description: clean(body.description),
        is_active: body.is_active ?? true,
      })
      .returning("*")
  )[0] };
};
const updatePosition = async (body, id) => {
  const row = await db("positions").where({ id, is_deleted: false }).first();
  if (!row) throw new NotFoundError("Lavozim topilmadi");
  if (body.department_id !== undefined) await ensureDepartment(body.department_id);
  const [updated] = await db("positions")
    .where({ id })
    .update({
      ...body,
      department_id: body.department_id ? Number(body.department_id) : null,
      description:
        body.description !== undefined
          ? clean(body.description)
          : row.description,
      updated_at: db.fn.now(),
    })
    .returning("*");
  return { position: updated };
};

const formatProfiles = () =>
  db("employee_profiles as ep")
    .join("users as u", "u.id", "ep.user_id")
    .join("positions as p", "p.id", "ep.position_id")
    .leftJoin("departments as d", "d.id", "p.department_id")
    .where("u.is_deleted", false);
const listProfiles = async ({ q = "", is_active, limit = 100, offset = 0 }) => {
  const query = formatProfiles();
  if (q)
    query.andWhere((qb) =>
      qb
        .whereILike("u.first_name", `%${q}%`)
        .orWhereILike("u.last_name", `%${q}%`)
        .orWhereILike("p.name", `%${q}%`),
    );
  if (is_active !== undefined) query.andWhere("ep.is_active", is_active);
  const [rows, count] = await Promise.all([
    query
      .clone()
      .select(
        "ep.*",
        "u.first_name",
        "u.last_name",
        "u.username",
        "u.role",
        "p.name as position_name",
        "d.name as department_name",
      )
      .orderBy("u.first_name")
      .limit(Number(limit))
      .offset(Number(offset)),
    query.clone().clearSelect().count({ count: "ep.id" }).first(),
  ]);
  for (const row of rows)
    row.agreement = await db("employee_agreements")
      .where({ employee_id: row.id, is_active: true })
      .orderBy("effective_from", "desc")
      .first();
  return {
    employees: rows,
    pageInfo: {
      total: Number(count.count),
      limit: Number(limit),
      offset: Number(offset),
    },
  };
};
const createProfile = async (body) => {
  const user = await db("users")
    .where({ id: body.user_id, is_deleted: false })
    .first();
  if (!user) throw new NotFoundError("User topilmadi");
  if (!["super_admin", "admin", "worker"].includes(user.role))
    throw new BadRequestError("Faqat korxona hodimini employee qilish mumkin");
  await ensurePosition(body.position_id);
  const [row] = await db("employee_profiles")
    .insert({
      user_id: Number(body.user_id),
      position_id: Number(body.position_id),
      hired_at: body.hired_at || db.fn.now(),
      terminated_at: body.terminated_at || null,
      is_active: body.is_active ?? true,
      note: clean(body.note),
    })
    .returning("*");
  return { employee: row };
};
const updateProfile = async (body, id) => {
  const row = await db("employee_profiles").where({ id }).first();
  if (!row) throw new NotFoundError("Hodim profili topilmadi");
  if (body.position_id !== undefined) await ensurePosition(body.position_id);
  const [updated] = await db("employee_profiles")
    .where({ id })
    .update({
      ...body,
      note: body.note !== undefined ? clean(body.note) : row.note,
      updated_at: db.fn.now(),
    })
    .returning("*");
  return { employee: updated };
};

const createAgreement = async (body, actor) => {
  const employee = await db("employee_profiles")
    .where({ id: body.employee_id })
    .first();
  if (!employee) throw new NotFoundError("Hodim profili topilmadi");
  const from = new Date(body.effective_from);
  if (body.effective_to && from > new Date(body.effective_to))
    throw new BadRequestError(
      "Kelishuv boshlanish sanasi tugash sanasidan katta bo'lmasin",
    );
  const previousTo = new Date(from);
  previousTo.setDate(previousTo.getDate() - 1);
  await db("employee_agreements")
    .where({ employee_id: body.employee_id, is_active: true })
    .update({
      is_active: false,
      effective_to: previousTo.toISOString().slice(0, 10),
      updated_at: db.fn.now(),
    });
  const [row] = await db("employee_agreements")
    .insert({
      employee_id: Number(body.employee_id),
      payment_type: body.payment_type,
      fixed_amount: Number(body.fixed_amount || 0),
      daily_rate: Number(body.daily_rate || 0),
      commission_percent: Number(body.commission_percent || 0),
      payment_period: body.payment_period || "weekly",
      effective_from: body.effective_from,
      effective_to: body.effective_to || null,
      is_active: true,
      note: clean(body.note),
      created_by: actor.id,
    })
    .returning("*");
  return { agreement: row };
};
const agreementHistory = async (employeeId) => ({
  agreements: await db("employee_agreements")
    .where({ employee_id: employeeId })
    .orderBy("effective_from", "desc"),
});

module.exports = {
  listPositions,
  createPosition,
  updatePosition,
  listProfiles,
  createProfile,
  updateProfile,
  createAgreement,
  agreementHistory,
};
