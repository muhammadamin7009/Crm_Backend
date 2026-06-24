const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const deleteCategory = async ({ id }) => {
  const category = await db("categories")
    .where({ id, is_deleted: false })
    .first();

  if (!category) throw new NotFoundError("Kategoriya topilmadi");

  const product = await db("products")
    .where({ category_id: id, is_deleted: false })
    .first();

  if (product) {
    throw new BadRequestError(
      "Kategoriyada mahsulotlar bor, avval ularni boshqa kategoriyaga o'tkazing",
    );
  }

  const [deleted] = await db("categories")
    .where({ id })
    .update({ is_deleted: true, updated_at: db.fn.now() })
    .returning(["id"]);

  return { deleted_category: deleted };
};

module.exports = deleteCategory;
