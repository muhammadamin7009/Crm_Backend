const db = require("../../db");
const { getDepartment, getPricePerUnit, getProduct, getWorker } = require("./helpers");
const { getFormattedOutput } = require("./format-output");
const inventory = require("../inventory/_services");

const createBulkWorkerOutputs = async (body, actor) => {
  const workerId = Number(body.worker_id);
  const departmentId = Number(body.department_id);

  await Promise.all([getWorker(workerId), getDepartment(departmentId)]);

  const ids = await db.transaction(async (trx) =>
    db.runWithDatabase(trx, async () => {
      const createdIds = [];

      for (const item of body.items) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity);
        await getProduct(productId);
        const pricePerUnit = await getPricePerUnit(productId, departmentId);
        const totalAmount = Number((quantity * pricePerUnit).toFixed(2));

        const [created] = await trx("worker_outputs")
          .insert({
            worker_id: workerId,
            product_id: productId,
            department_id: departmentId,
            quantity,
            price_per_unit: pricePerUnit,
            total_amount: totalAmount,
            worked_at: body.worked_at || trx.fn.now(),
            note: body.note || null,
            created_by: actor.id,
            inventory_tracked_at: trx.fn.now(),
          })
          .returning("id");
        const id = created.id || created;
        await inventory.syncProductionOutput(trx, id, actor);
        createdIds.push(id);
      }

      return createdIds;
    }),
  );

  return {
    worker_outputs: await Promise.all(ids.map((id) => getFormattedOutput(id))),
    created_count: ids.length,
  };
};

module.exports = createBulkWorkerOutputs;
