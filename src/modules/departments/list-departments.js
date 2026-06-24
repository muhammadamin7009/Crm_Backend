const db = require("../../db");

const SORT_COLUMNS = {
  name: "name",
  code: "code",
  sort_order: "sort_order",
  created_at: "created_at",
  updated_at: "updated_at",
};

const listDepartments = async ({
  q,
  is_active,
  limit = 20,
  offset = 0,
  sort_by = "sort_order",
  sort_order = "asc",
}) => {
  const query = db("departments").where({ is_deleted: false });

  if (q) {
    query.andWhere((qb) => {
      qb.whereILike("name", `%${q}%`).orWhereILike("code", `%${q}%`);
    });
  }

  if (is_active !== undefined) {
    query.andWhere("is_active", String(is_active) === "true");
  }

  const countQuery = query
    .clone()
    .clearSelect()
    .count({ count: "id" })
    .first();

  const [departments, { count }] = await Promise.all([
    query
      .clone()
      .select(
        "id",
        "name",
        "code",
        "description",
        "sort_order",
        "is_active",
        "created_by",
        "created_at",
        "updated_at",
      )
      .orderBy(SORT_COLUMNS[sort_by], sort_order)
      .limit(Number(limit))
      .offset(Number(offset)),
    countQuery,
  ]);

  return {
    departments,
    pageInfo: {
      total: Number(count),
      offset: Number(offset),
      limit: Number(limit),
    },
  };
};

module.exports = listDepartments;
