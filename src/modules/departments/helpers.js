const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value;
};

const getExistingDepartment = async (id) => {
  const department = await db("departments")
    .where({ id, is_deleted: false })
    .first();

  if (!department) throw new NotFoundError("Bo'lim topilmadi");

  return department;
};

const ensureUniqueDepartment = async ({ name, code, ignoreId }) => {
  if (!name && !code) return;

  const query = db("departments").where({ is_deleted: false });

  query.andWhere((qb) => {
    if (name) qb.orWhereRaw("LOWER(name) = LOWER(?)", [name]);
    if (code) qb.orWhereRaw("LOWER(code) = LOWER(?)", [code]);
  });

  if (ignoreId) query.whereNot({ id: ignoreId });

  const existing = await query.first();

  if (existing) throw new BadRequestError("Bu bo'lim mavjud");
};

module.exports = {
  emptyToNull,
  getExistingDepartment,
  ensureUniqueDepartment,
};
