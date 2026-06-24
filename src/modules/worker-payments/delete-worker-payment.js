const db = require("../../db");
const { getExistingPayment } = require("./helpers");

const deleteWorkerPayment = async ({ id }) => {
  await getExistingPayment(id);

  await db("worker_payments")
    .where({ id })
    .update({
      is_deleted: true,
      updated_at: db.fn.now(),
    });

  return { message: "To'lov o'chirildi" };
};

module.exports = deleteWorkerPayment;
