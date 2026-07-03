const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const updateCategory = async (body, { id }) => {
  const existing = await db("categories").where({ id, is_deleted: false }).first();

  if (!existing) throw new NotFoundError("Kategoriya topilmadi");

  if (body.name && body.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await db("categories")
      .whereRaw("LOWER(name) = LOWER(?)", [body.name])
      .where({ is_deleted: false })
      .whereNot({ id })
      .first();

    if (duplicate) throw new BadRequestError("Bu kategoriya mavjud");
  }

  const patch = {
    ...body,
    updated_at: db.fn.now(),
  };

  if (body.description !== undefined) {
    patch.description = body.description === "" ? null : body.description;
  }

  const [category] = await db("categories")
    .where({ id })
    .update(patch)
    .returning([
      "id",
      "name",
      "description",
      "is_active",
      "created_by",
      "created_at",
      "updated_at",
    ]);

  return { updated_category: category };
};

module.exports = updateCategory;
