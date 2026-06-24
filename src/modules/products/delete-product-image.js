const path = require("path");
const fs = require("fs/promises");
const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");
const { getExistingProduct } = require("./helpers");

const deleteProductImage = async ({ id, imageId }) => {
  await getExistingProduct(id);

  const image = await db("product_images")
    .where({ id: imageId, product_id: id })
    .first();

  if (!image) throw new NotFoundError("Mahsulot rasmi topilmadi");

  await db.transaction(async (trx) => {
    await trx("product_images")
      .where({ id: imageId, product_id: id })
      .delete();

    if (image.is_primary) {
      const nextImage = await trx("product_images")
        .where({ product_id: id })
        .orderBy("id", "asc")
        .first();

      if (nextImage) {
        await trx("product_images")
          .where({ id: nextImage.id })
          .update({ is_primary: true });
      }
    }

    await trx("products")
      .where({ id })
      .update({ updated_at: trx.fn.now() });
  });

  if (image.image_url?.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), image.image_url);
    await fs.unlink(filePath).catch(() => undefined);
  }

  return { deleted_image: { id: image.id } };
};

module.exports = deleteProductImage;
