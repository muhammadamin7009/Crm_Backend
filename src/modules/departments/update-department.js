const db = require("../../db");
const { emptyToNull, getExistingDepartment, ensureUniqueDepartment } = require("./helpers");

const updateDepartment = async (body, { id }) => {
  const existing = await getExistingDepartment(id);

  const nameChanged = body.name && body.name.toLowerCase() !== existing.name.toLowerCase();
  const codeChanged = body.code && body.code.toLowerCase() !== existing.code.toLowerCase();

  if (nameChanged || codeChanged) {
    await ensureUniqueDepartment({
      name: nameChanged ? body.name : undefined,
      code: codeChanged ? body.code : undefined,
      ignoreId: id,
    });
  }

  const patch = {
    ...body,
    updated_at: db.fn.now(),
  };

  if (body.description !== undefined) {
    patch.description = emptyToNull(body.description);
  }

  const [department] = await db("departments")
    .where({ id })
    .update(patch)
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

  return { updated_department: department };
};

module.exports = updateDepartment;
