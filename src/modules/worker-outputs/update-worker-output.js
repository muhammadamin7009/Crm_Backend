const db = require("../../db");
const {
  getDepartment,
  getExistingOutput,
  getPricePerUnit,
  getProduct,
  getWorker,
} = require("./helpers");
const { getFormattedOutput } = require("./format-output");

const updateWorkerOutput = async (body, { id }) => {
  const existing = await getExistingOutput(id);

  const workerId =
    body.worker_id !== undefined ? Number(body.worker_id) : Number(existing.worker_id);
  const productId =
    body.product_id !== undefined ? Number(body.product_id) : Number(existing.product_id);
  const departmentId =
    body.department_id !== undefined
      ? Number(body.department_id)
      : Number(existing.department_id);
  const quantity =
    body.quantity !== undefined ? Number(body.quantity) : Number(existing.quantity);

  await Promise.all([
    getWorker(workerId),
    getProduct(productId),
    getDepartment(departmentId),
  ]);

  const shouldRefreshPrice =
    body.product_id !== undefined || body.department_id !== undefined;
  const pricePerUnit = shouldRefreshPrice
    ? await getPricePerUnit(productId, departmentId)
    : Number(existing.price_per_unit);
  const totalAmount = Number((quantity * pricePerUnit).toFixed(2));

  await db("worker_outputs")
    .where({ id })
    .update({
      worker_id: workerId,
      product_id: productId,
      department_id: departmentId,
      quantity,
      price_per_unit: pricePerUnit,
      total_amount: totalAmount,
      worked_at: body.worked_at || existing.worked_at,
      note: body.note !== undefined ? body.note || null : existing.note,
      updated_at: db.fn.now(),
    });

  const output = await getFormattedOutput(id);
  return { worker_output: output };
};

module.exports = updateWorkerOutput;
