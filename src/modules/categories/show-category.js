const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

const showCategory = async ({ id }) => {
  const category = await db("categories")
    .where({ id, is_deleted: false })
    .select("id", "name", "description", "is_active", "created_by", "created_at", "updated_at")
    .first();

  if (!category) throw new NotFoundError("Kategoriya topilmadi");

  return { category };
};

module.exports = showCategory;
