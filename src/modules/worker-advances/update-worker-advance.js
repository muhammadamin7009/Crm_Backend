const db = require("../../db");
const { getExistingAdvance, getWorker } = require("./helpers");
const { getFormattedAdvance } = require("./format-advance");

const updateWorkerAdvance = async (body, { id }) => {
  const existing = await getExistingAdvance(id);
  const workerId =
    body.worker_id !== undefined ? Number(body.worker_id) : Number(existing.worker_id);
  await getWorker(workerId);
  await db("worker_advances")
    .where({ id })
    .update({
      worker_id: workerId,
      amount: body.amount !== undefined ? Number(body.amount) : Number(existing.amount),
      given_at: body.given_at || existing.given_at,
      note: body.note !== undefined ? body.note || null : existing.note,
      updated_at: db.fn.now(),
    });
  return { worker_advance: await getFormattedAdvance(id) };
};

module.exports = updateWorkerAdvance;
