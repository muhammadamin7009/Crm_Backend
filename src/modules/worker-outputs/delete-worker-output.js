const db = require("../../db");
const { getExistingOutput } = require("./helpers");

const deleteWorkerOutput = async ({ id }) => {
  await getExistingOutput(id);

  await db("worker_outputs").where({ id }).update({
    is_deleted: true,
    updated_at: db.fn.now(),
  });

  return { message: "Ish yozuvi o'chirildi" };
};

module.exports = deleteWorkerOutput;
