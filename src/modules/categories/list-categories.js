const db = require("../../db");

const listCategories = async ({
  q,
  is_active,
  limit = 20,
  offset = 0,
  sort_by = "created_at",
  sort_order = "desc",
}) => {
  const query = db("categories").where({ is_deleted: false });

  if (q) query.andWhereILike("name", `%${q}%`);
  if (is_active !== undefined) {
    query.andWhere("is_active", String(is_active) === "true");
  }

  const countQuery = query
    .clone()
    .clearSelect()
    .count({ count: "id" })
    .first();

  const [categories, { count }] = await Promise.all([
    query
      .clone()
      .select(
        "id",
        "name",
        "description",
        "is_active",
        "created_by",
        "created_at",
        "updated_at",
      )
      .orderBy(sort_by, sort_order)
      .limit(Number(limit))
      .offset(Number(offset)),
    countQuery,
  ]);

  return {
    categories,
    pageInfo: {
      total: Number(count),
      offset: Number(offset),
      limit: Number(limit),
    },
  };
};

module.exports = listCategories;
