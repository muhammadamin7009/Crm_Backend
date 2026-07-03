const db = require("../../db");
const { getExistingSale } = require("./helpers");

const deleteClientSale = async ({ id }) => {
  await getExistingSale(id);

  await db("client_sales").where({ id }).update({
    is_deleted: true,
    updated_at: db.fn.now(),
  });

  return { message: "Savdo yozuvi o'chirildi" };
};

module.exports = deleteClientSale;
