const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { getExistingProduct } = require("./helpers");

const addProductImage = async (file, { id }) => {
  await getExistingProduct(id);

  if (!file) {
    throw new BadRequestError("Rasm fayli yuborilmadi");
  }

  const imageUrl = `/uploads/${file.filename}`;

  const [{ count }] = await db("product_images")
    .where({ product_id: id })
    .count({ count: "id" });

  const isPrimary = Number(count) === 0;

  const [image] = await db("product_images")
    .insert({
      product_id: id,
      image_url: imageUrl,
      is_primary: isPrimary,
    })
    .returning(["id", "product_id", "image_url", "is_primary", "created_at"]);

  await db("products")
    .where({ id })
    .update({ updated_at: db.fn.now() });

  return { new_image: image };
};

module.exports = addProductImage;
