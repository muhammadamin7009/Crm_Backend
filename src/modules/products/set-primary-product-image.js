const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");
const { getExistingProduct } = require("./helpers");

const setPrimaryProductImage = async ({ id, imageId }) => {
  await getExistingProduct(id);

  const image = await db("product_images").where({ id: imageId, product_id: id }).first();

  if (!image) throw new NotFoundError("Mahsulot rasmi topilmadi");

  await db.transaction(async (trx) => {
    await trx("product_images").where({ product_id: id }).update({ is_primary: false });

    await trx("product_images").where({ id: imageId, product_id: id }).update({ is_primary: true });

    await trx("products").where({ id }).update({ updated_at: trx.fn.now() });
  });

  const [updatedImage] = await db("product_images")
    .where({ id: imageId, product_id: id })
    .select("id", "product_id", "image_url", "is_primary", "created_at");

  return { primary_image: updatedImage };
};

module.exports = setPrimaryProductImage;
