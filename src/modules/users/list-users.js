const db = require("../../db");

const listUsers = async ({
  q,
  role,
  limit = 20,
  offset = 0,
  sort_by = "created_at",
  sort_order = "desc",
}) => {
  const query = db("users")
    .where({ is_deleted: false })
    .select(
      "id",
      "first_name",
      "last_name",
      "user_image",
      "username",
      "role",
      "phone",
      "created_by",
      "created_at",
      "updated_at",
    );

  if (q) {
    query.andWhere((qb) => {
      qb.whereILike("first_name", `%${q}%`)
        .orWhereILike("last_name", `%${q}%`)
        .orWhereILike("username", `%${q}%`)
        .orWhereILike("phone", `%${q}%`);
    });
  }

  if (role) query.andWhere("role", role);

  const countQuery = query
    .clone()
    .clearSelect()
    .count({ count: "id" })
    .first();

  const [users, { count }] = await Promise.all([
    query
      .orderBy(sort_by, sort_order)
      .limit(Number(limit))
      .offset(Number(offset)),
    countQuery,
  ]);

  return {
    users,
    pageInfo: {
      total: Number(count),
      offset: Number(offset),
      limit: Number(limit),
    },
  };
};

module.exports = listUsers;
