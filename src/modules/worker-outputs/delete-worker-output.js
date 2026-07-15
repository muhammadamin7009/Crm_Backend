const db = require("../../db");
const { getExistingOutput } = require("./helpers");
const inventory = require("../inventory/_services");

const deleteWorkerOutput = async ({ id }, actor) => {
  await db.transaction(async (trx) =>
    db.runWithDatabase(trx, async () => {
      await getExistingOutput(id);

      await trx("worker_outputs").where({ id }).update({
        is_deleted: true,
        updated_at: trx.fn.now(),
      });
      await inventory.syncProductionOutput(trx, id, actor);
    }),
  );

  return { message: "Ish yozuvi o'chirildi" };
};

module.exports = deleteWorkerOutput;
