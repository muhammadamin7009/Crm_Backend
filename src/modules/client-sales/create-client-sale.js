const db = require("../../db");
const { calculateSaleAmounts, getClient, getProduct } = require("./helpers");
const { getFormattedSale } = require("./format-sale");
const inventory = require("../inventory/_services");

const createClientSale = async (body, actor) => {
  const id = await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      await getClient(Number(body.client_id));
      const product = await getProduct(Number(body.product_id));
      const warehouse = await inventory.resolveWarehouse(trx, body.warehouse_id, "product");
      const quantity = Number(body.quantity);
      const unitPrice =
        body.unit_price !== undefined ? Number(body.unit_price) : Number(product.sale_price);
      const amounts = calculateSaleAmounts({
        quantity,
        unitPrice,
        paidAmount: body.paid_amount,
      });

      const [created] = await trx("client_sales")
        .insert({
          client_id: Number(body.client_id),
          product_id: Number(body.product_id),
          warehouse_id: warehouse.id,
          inventory_tracked_at: trx.fn.now(),
          quantity,
          unit_price: unitPrice,
          ...amounts,
          sold_at: body.sold_at || trx.fn.now(),
          note: body.note || null,
          created_by: actor.id,
        })
        .returning("id");
      const createdId = created.id || created;
      await inventory.syncClientSaleStock(trx, createdId, actor, {
        occurredAt: body.sold_at || trx.fn.now(),
        note: `Mijozga yangi savdo #${createdId}`,
      });
      return createdId;
    }),
  );

  const sale = await getFormattedSale(id);
  return { client_sale: sale };
};

module.exports = createClientSale;
