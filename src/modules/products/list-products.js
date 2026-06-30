const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");

const SORT_COLUMNS = {
  name: "p.name",
  sale_price: "p.sale_price",
  purchase_price: "p.purchase_price",
  created_at: "p.created_at",
  updated_at: "p.updated_at",
};

const listProducts = async ({
  q,
  category_id,
  color,
  model,
  is_active,
  min_price,
  max_price,
  limit = 20,
  offset = 0,
  sort_by = "created_at",
  sort_order = "desc",
}, actor) => {
  if (
    min_price !== undefined &&
    max_price !== undefined &&
    Number(min_price) > Number(max_price)
  ) {
    throw new BadRequestError("min_price max_price dan katta bo'lmasligi kerak");
  }

  const query = db("products as p")
    .leftJoin("categories as c", "c.id", "p.category_id")
    .where("p.is_deleted", false);

  if (q) {
    query.andWhere((qb) => {
      qb.whereILike("p.name", `%${q}%`)
        .orWhereILike("p.model", `%${q}%`)
        .orWhereILike("p.sku", `%${q}%`)
        .orWhereILike("p.color", `%${q}%`);
    });
  }
  if (category_id) query.andWhere("p.category_id", Number(category_id));
  if (color) query.andWhereILike("p.color", `%${color}%`);
  if (model) query.andWhereILike("p.model", `%${model}%`);
  if (is_active !== undefined) {
    query.andWhere("p.is_active", String(is_active) === "true");
  }
  if (min_price !== undefined) query.andWhere("p.sale_price", ">=", min_price);
  if (max_price !== undefined) query.andWhere("p.sale_price", "<=", max_price);

  const countQuery = query
    .clone()
    .clearSelect()
    .countDistinct({ count: "p.id" })
    .first();

  const [products, { count }] = await Promise.all([
    query
      .clone()
      .select(
        "p.id",
        "p.category_id",
        "c.name as category_name",
        "p.name",
        "p.model",
        "p.sku",
        "p.color",
        "p.unit",
        "p.description",
        "p.purchase_price",
        "p.sale_price",
        "p.is_active",
        "p.created_by",
        "p.created_at",
        "p.updated_at",
        db.raw(`(
          SELECT image_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, id ASC
          LIMIT 1
        ) AS product_image`),
      )
      .orderBy(SORT_COLUMNS[sort_by], sort_order)
      .limit(Number(limit))
      .offset(Number(offset)),
    countQuery,
  ]);

  const canSeePurchasePrice = ["super_admin", "admin"].includes(actor?.role);

  return {
    products: canSeePurchasePrice
      ? products
      : products.map(({ purchase_price, ...product }) => product),
    pageInfo: {
      total: Number(count),
      offset: Number(offset),
      limit: Number(limit),
    },
  };
};

module.exports = listProducts;
