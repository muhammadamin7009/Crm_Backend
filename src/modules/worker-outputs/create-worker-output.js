const db = require("../../db");
const { getDepartment, getPricePerUnit, getProduct, getWorker } = require("./helpers");
const { getFormattedOutput } = require("./format-output");

const createWorkerOutput = async (body, actor) => {
  const workerId = Number(body.worker_id);
  const productId = Number(body.product_id);
  const departmentId = Number(body.department_id);
  const quantity = Number(body.quantity);

  await Promise.all([getWorker(workerId), getProduct(productId), getDepartment(departmentId)]);

  const pricePerUnit = await getPricePerUnit(productId, departmentId);
  const totalAmount = Number((quantity * pricePerUnit).toFixed(2));

  const [created] = await db("worker_outputs")
    .insert({
      worker_id: workerId,
      product_id: productId,
      department_id: departmentId,
      quantity,
      price_per_unit: pricePerUnit,
      total_amount: totalAmount,
      worked_at: body.worked_at || db.fn.now(),
      note: body.note || null,
      created_by: actor.id,
    })
    .returning("id");

  const output = await getFormattedOutput(created.id || created);
  return { worker_output: output };
};

module.exports = createWorkerOutput;
