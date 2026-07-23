const db = require("../../db");
const { getWorker } = require("./helpers");
const { getFormattedAdvance } = require("./format-advance");
const { syncCashTransaction } = require("../../shared/finance/cash-ledger");

const createWorkerAdvance = async (body, actor) => {
  await getWorker(Number(body.worker_id));
  const id = await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      const [created] = await trx("worker_advances")
        .insert({
          worker_id: Number(body.worker_id),
          amount: Number(body.amount),
          given_at: body.given_at || trx.fn.now(),
          note: body.note || null,
          created_by: actor.id,
        })
        .returning("id");
      const advanceId = created.id || created;
      await syncCashTransaction(trx, {
        sourceType: "worker_advance",
        sourceId: advanceId,
        transactionType: "expense",
        amount: body.amount,
        accountId: body.account_id,
        transactedAt: body.given_at,
        description: `Ishchi avansi #${advanceId}`,
        createdBy: actor.id,
      });
      return advanceId;
    }),
  );
  return { worker_advance: await getFormattedAdvance(id) };
};

module.exports = createWorkerAdvance;
