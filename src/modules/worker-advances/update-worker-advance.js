const db = require("../../db");
const { getExistingAdvance, getWorker } = require("./helpers");
const { getFormattedAdvance } = require("./format-advance");
const { syncCashTransaction } = require("../../shared/finance/cash-ledger");

const updateWorkerAdvance = async (body, { id }, actor) => {
  const existing = await getExistingAdvance(id);
  const workerId =
    body.worker_id !== undefined ? Number(body.worker_id) : Number(existing.worker_id);
  await getWorker(workerId);
  const amount = body.amount !== undefined ? Number(body.amount) : Number(existing.amount);
  const givenAt = body.given_at || existing.given_at;
  await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      await trx("worker_advances").where({ id }).update({
        worker_id: workerId,
        amount,
        accountId: body.account_id,
        given_at: givenAt,
        note: body.note !== undefined ? body.note || null : existing.note,
        updated_at: trx.fn.now(),
      });
      await syncCashTransaction(trx, {
        sourceType: "worker_advance",
        sourceId: id,
        transactionType: "expense",
        amount,
        transactedAt: givenAt,
        description: `Ishchi avansi #${id}`,
        createdBy: actor?.id || existing.created_by,
      });
    }),
  );
  return { worker_advance: await getFormattedAdvance(id) };
};

module.exports = updateWorkerAdvance;
