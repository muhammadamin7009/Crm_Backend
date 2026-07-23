const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { getAdvanceBalance, getExistingAdvance } = require("./helpers");
const { removeCashTransaction } = require("../../shared/finance/cash-ledger");

const deleteWorkerAdvance = async ({ id }) => {
  const advance = await getExistingAdvance(id);
  const balanceWithout = await getAdvanceBalance(Number(advance.worker_id), id);
  if (balanceWithout.remaining_advance < 0) {
    throw new BadRequestError(
      "Bu avansdan oylikda ushlab qolingan. Avval oylik yozuvini to'g'rilang",
    );
  }
  await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      await trx("worker_advances")
        .where({ id })
        .update({ is_deleted: true, updated_at: trx.fn.now() });
      await removeCashTransaction(trx, "worker_advance", id);
    }),
  );
  return { message: "Avans o'chirildi" };
};

module.exports = deleteWorkerAdvance;
