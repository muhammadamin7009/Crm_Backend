const db = require("../../db");
const { calculateSaleAmounts, getClient, getExistingSale, getProduct } = require("./helpers");
const { getFormattedSale } = require("./format-sale");
const inventory = require("../inventory/_services");
const { BadRequestError } = require("../../shared/errors");
const { syncCashTransaction } = require("../../shared/finance/cash-ledger");

const updateClientSale = async (body, { id }, actor) => {
  await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      const existing = await getExistingSale(id);
      const clientId =
        body.client_id !== undefined ? Number(body.client_id) : Number(existing.client_id);
      const productId =
        body.product_id !== undefined ? Number(body.product_id) : Number(existing.product_id);
      const quantity =
        body.quantity !== undefined ? Number(body.quantity) : Number(existing.quantity);

      await getClient(clientId);
      const product = await getProduct(productId);
      let warehouseId = existing.warehouse_id;
      if (existing.inventory_tracked_at) {
        const warehouse = await inventory.resolveWarehouse(
          trx,
          body.warehouse_id !== undefined ? body.warehouse_id : existing.warehouse_id,
          "product",
        );
        warehouseId = warehouse.id;
      }

      const returned = await trx("client_returns")
        .where({ client_sale_id: id, is_deleted: false })
        .sum({ quantity: "quantity" })
        .sum({ amount: "amount" })
        .sum({ refund_amount: "refund_amount" })
        .first();
      const returnedQuantity = Number(returned?.quantity || 0);
      const returnedAmount = Number(returned?.amount || 0);
      const refundedAmount = Number(returned?.refund_amount || 0);
      const linkedPayments = await trx("client_payments")
        .where({ client_sale_id: id, is_deleted: false })
        .sum({ amount: "amount" })
        .first();
      const linkedPaidAmount = Number(linkedPayments?.amount || 0);
      if (
        clientId !== Number(existing.client_id) &&
        (linkedPaidAmount > 0 || returnedQuantity > 0)
      ) {
        throw new BadRequestError(
          "To'lov yoki qaytarish amali bor savdoning mijozini o'zgartirib bo'lmaydi",
        );
      }
      if (returnedQuantity > 0) {
        if (
          productId !== Number(existing.product_id) ||
          Number(warehouseId) !== Number(existing.warehouse_id)
        ) {
          throw new BadRequestError(
            "Qaytarilgan mahsuloti bor savdoning mahsuloti yoki omborini o'zgartirib bo'lmaydi",
          );
        }
        if (quantity < returnedQuantity) {
          throw new BadRequestError(
            `Savdo miqdori qaytarilgan ${returnedQuantity} dan kam bo'lmasin`,
          );
        }
      }

      const unitPrice =
        body.unit_price !== undefined
          ? Number(body.unit_price)
          : Number(existing.unit_price || product.sale_price);
      const paidAmount =
        body.paid_amount !== undefined ? Number(body.paid_amount) : Number(existing.paid_amount);
      const amounts = calculateSaleAmounts({ quantity, unitPrice, paidAmount });
      const netTotal = Math.max(0, amounts.total_amount - returnedAmount);
      const netPaidAmount = amounts.paid_amount + linkedPaidAmount - refundedAmount;
      if (netPaidAmount > netTotal) {
        throw new BadRequestError(
          `Savdoni kamaytirib bo'lmaydi: qaytarilgan puldan keyingi to'lov ${netPaidAmount}, qaytarishdan keyingi savdo ${netTotal}`,
        );
      }

      await trx("client_sales")
        .where({ id })
        .update({
          client_id: clientId,
          product_id: productId,
          warehouse_id: warehouseId,
          quantity,
          unit_price: unitPrice,
          ...amounts,
          sold_at: body.sold_at || existing.sold_at,
          note: body.note !== undefined ? body.note || null : existing.note,
          updated_at: trx.fn.now(),
        });

      await inventory.syncClientSaleStock(trx, id, actor, {
        occurredAt: trx.fn.now(),
        note: `Mijoz savdosi #${id} o'zgartirildi`,
      });
      await syncCashTransaction(trx, {
        sourceType: "client_sale",
        sourceId: id,
        transactionType: "income",
        amount: amounts.paid_amount,
        accountId: body.account_id,
        transactedAt: body.sold_at || existing.sold_at,
        description: `Savdodagi boshlang'ich to'lov #${id}`,
        createdBy: actor.id,
      });
    }),
  );

  const sale = await getFormattedSale(id);
  return { client_sale: sale };
};

module.exports = updateClientSale;
