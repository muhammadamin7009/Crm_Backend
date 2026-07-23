const db = require("../../db");
const { getExistingPayment } = require("./helpers");
const { removeCashTransaction } = require("../../shared/finance/cash-ledger");

const deleteClientPayment = async ({ id }) => {
  await getExistingPayment(id);

  await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      await trx("client_payments").where({ id }).update({
        is_deleted: true,
        updated_at: trx.fn.now(),
      });
      await removeCashTransaction(trx, "client_payment", id);
    }),
  );

  return { message: "Client to'lovi o'chirildi" };
};

module.exports = deleteClientPayment;
