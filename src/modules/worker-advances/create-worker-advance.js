const db = require("../../db");
const { getWorker } = require("./helpers");
const { getFormattedAdvance } = require("./format-advance");

const createWorkerAdvance = async (body, actor) => {
  await getWorker(Number(body.worker_id));
  const [created] = await db("worker_advances").insert({
    worker_id: Number(body.worker_id),
    amount: Number(body.amount),
    given_at: body.given_at || db.fn.now(),
    note: body.note || null,
    created_by: actor.id,
  }).returning("id");
  return { worker_advance: await getFormattedAdvance(created.id || created) };
};

module.exports = createWorkerAdvance;
