const db = require("../../db");
const { emptyToNull, ensureUniqueDepartment } = require("./helpers");

const createDepartment = async (body, actor) => {
  await ensureUniqueDepartment({ name: body.name, code: body.code });

  const [department] = await db("departments")
    .insert({
      name: body.name,
      code: body.code,
      description: emptyToNull(body.description),
      sort_order: body.sort_order ?? 0,
      is_active: body.is_active ?? true,
      is_deleted: false,
      created_by: actor.id,
    })
    .returning([
      "id",
      "name",
      "code",
      "description",
      "sort_order",
      "is_active",
      "created_by",
      "created_at",
      "updated_at",
    ]);

  return { new_department: department };
};

module.exports = createDepartment;
