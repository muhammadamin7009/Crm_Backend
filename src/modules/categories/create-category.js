const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");

const createCategory = async (body, actor) => {
  const existing = await db("categories")
    .whereRaw("LOWER(name) = LOWER(?)", [body.name])
    .where({ is_deleted: false })
    .first();

  if (existing) throw new BadRequestError("Bu kategoriya mavjud");

  const [category] = await db("categories")
    .insert({
      name: body.name,
      description: body.description || null,
      is_active: body.is_active ?? true,
      is_deleted: false,
      created_by: actor.id,
    })
    .returning([
      "id",
      "name",
      "description",
      "is_active",
      "created_by",
      "created_at",
      "updated_at",
    ]);

  return { new_category: category };
};

module.exports = createCategory;
