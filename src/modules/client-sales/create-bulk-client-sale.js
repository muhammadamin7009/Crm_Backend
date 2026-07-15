const crypto = require("crypto");
const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { getClient, getProduct } = require("./helpers");
const { getFormattedSale } = require("./format-sale");
const inventory = require("../inventory/_services");

const createBulkClientSale = async (body, actor) => {
  const result = await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      await getClient(Number(body.client_id));
      const warehouse = await inventory.resolveWarehouse(trx, body.warehouse_id, "product");
      const prepared = [];
      for (const item of body.items) {
        const product = await getProduct(Number(item.product_id));
        const quantity = Number(item.quantity);
        const unitPrice =
          item.unit_price !== undefined ? Number(item.unit_price) : Number(product.sale_price);
        const totalAmount = Number((quantity * unitPrice).toFixed(2));
        prepared.push({
          product_id: Number(item.product_id),
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
        });
      }

      const totalAmount = prepared.reduce((sum, item) => sum + item.total_amount, 0);
      const paidAmount = Number(body.paid_amount || 0);
      if (paidAmount > totalAmount) {
        throw new BadRequestError("To'langan summa umumiy savdo summasidan oshmasin");
      }

      const batchId = crypto.randomUUID();
      let remainingPaid = paidAmount;
      const rows = prepared.map((item) => {
        const itemPaid = Math.min(remainingPaid, item.total_amount);
        remainingPaid = Number((remainingPaid - itemPaid).toFixed(2));
        return {
          client_id: Number(body.client_id),
          warehouse_id: warehouse.id,
          inventory_tracked_at: trx.fn.now(),
          batch_id: batchId,
          ...item,
          paid_amount: itemPaid,
          debt_amount: Number((item.total_amount - itemPaid).toFixed(2)),
          sold_at: body.sold_at || trx.fn.now(),
          note: body.note || null,
          created_by: actor.id,
        };
      });

      const inserted = await trx("client_sales").insert(rows).returning(["id", "product_id"]);
      const ids = inserted.map((row) => row.id || row);
      const stockOrder = [...inserted].sort(
        (a, b) => Number(a.product_id) - Number(b.product_id) || Number(a.id) - Number(b.id),
      );
      for (const row of stockOrder) {
        await inventory.syncClientSaleStock(trx, row.id, actor, {
          occurredAt: body.sold_at || trx.fn.now(),
          note: `Mijozga yangi savdo #${row.id}`,
        });
      }
      return { ids, batchId, totalAmount, paidAmount };
    }),
  );

  const sales = await Promise.all(result.ids.map((id) => getFormattedSale(id)));
  return {
    batch_id: result.batchId,
    client_sales: sales,
    totals: {
      total_amount: result.totalAmount,
      paid_amount: result.paidAmount,
      debt_amount: result.totalAmount - result.paidAmount,
    },
  };
};

module.exports = createBulkClientSale;
