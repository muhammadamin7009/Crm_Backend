const db = require("../../db");
const { getExistingProduct } = require("./helpers");

const deleteProduct = async ({ id }) => {
  await getExistingProduct(id);

  const [deleted] = await db("products")
    .where({ id })
    .update({
      is_deleted: true,
      is_active: false,
      updated_at: db.fn.now(),
    })
    .returning(["id"]);

  return { deleted_product: deleted };
};

module.exports = deleteProduct;
