const db = require("../../db");
const { calculateSaleAmounts, getClient, getProduct } = require("./helpers");
const { getFormattedSale } = require("./format-sale");

const createClientSale = async (body, actor) => {
  await getClient(Number(body.client_id));
  const product = await getProduct(Number(body.product_id));

  const quantity = Number(body.quantity);
  const unitPrice =
    body.unit_price !== undefined ? Number(body.unit_price) : Number(product.sale_price);
  const amounts = calculateSaleAmounts({
    quantity,
    unitPrice,
    paidAmount: body.paid_amount,
  });

  const [created] = await db("client_sales")
    .insert({
      client_id: Number(body.client_id),
      product_id: Number(body.product_id),
      quantity,
      unit_price: unitPrice,
      ...amounts,
      sold_at: body.sold_at || db.fn.now(),
      note: body.note || null,
      created_by: actor.id,
    })
    .returning("id");

  const sale = await getFormattedSale(created.id || created);
  return { client_sale: sale };
};

module.exports = createClientSale;
