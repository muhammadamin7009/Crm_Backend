const db = require("../../db");
const { getExistingPayment } = require("./helpers");

const deleteClientPayment = async ({ id }) => {
  await getExistingPayment(id);

  await db("client_payments").where({ id }).update({
    is_deleted: true,
    updated_at: db.fn.now(),
  });

  return { message: "Client to'lovi o'chirildi" };
};

module.exports = deleteClientPayment;
