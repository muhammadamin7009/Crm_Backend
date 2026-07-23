const db = require("../../db");
const { getExistingPayment } = require("./helpers");
const { removeCashTransaction } = require("../../shared/finance/cash-ledger");

const deleteWorkerPayment = async ({ id }) => {
  await getExistingPayment(id);

  await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      await trx("worker_payments").where({ id }).update({
        is_deleted: true,
        updated_at: trx.fn.now(),
      });
      await removeCashTransaction(trx, "worker_payment", id);
    }),
  );

  return { message: "To'lov o'chirildi" };
};

module.exports = deleteWorkerPayment;
