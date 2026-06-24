const db = require("../../db");
const { getExistingDepartment } = require("./helpers");

const deleteDepartment = async ({ id }) => {
  await getExistingDepartment(id);

  const [deleted] = await db("departments")
    .where({ id })
    .update({
      is_deleted: true,
      is_active: false,
      updated_at: db.fn.now(),
    })
    .returning(["id"]);

  return { deleted_department: deleted };
};

module.exports = deleteDepartment;
