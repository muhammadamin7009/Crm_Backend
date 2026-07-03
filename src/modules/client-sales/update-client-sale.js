const db = require("../../db");
const { calculateSaleAmounts, getClient, getExistingSale, getProduct } = require("./helpers");
const { getFormattedSale } = require("./format-sale");

const updateClientSale = async (body, { id }) => {
  const existing = await getExistingSale(id);

  const clientId =
    body.client_id !== undefined ? Number(body.client_id) : Number(existing.client_id);
  const productId =
    body.product_id !== undefined ? Number(body.product_id) : Number(existing.product_id);
  const quantity = body.quantity !== undefined ? Number(body.quantity) : Number(existing.quantity);

  await getClient(clientId);
  const product = await getProduct(productId);

  const unitPrice =
    body.unit_price !== undefined
      ? Number(body.unit_price)
      : Number(existing.unit_price || product.sale_price);
  const paidAmount =
    body.paid_amount !== undefined ? Number(body.paid_amount) : Number(existing.paid_amount);
  const amounts = calculateSaleAmounts({ quantity, unitPrice, paidAmount });

  await db("client_sales")
    .where({ id })
    .update({
      client_id: clientId,
      product_id: productId,
      quantity,
      unit_price: unitPrice,
      ...amounts,
      sold_at: body.sold_at || existing.sold_at,
      note: body.note !== undefined ? body.note || null : existing.note,
      updated_at: db.fn.now(),
    });

  const sale = await getFormattedSale(id);
  return { client_sale: sale };
};

module.exports = updateClientSale;
