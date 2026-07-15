const db = require("../../db");
const { getExistingSale } = require("./helpers");
const inventory = require("../inventory/_services");
const { BadRequestError } = require("../../shared/errors");

const deleteClientSale = async ({ id }, actor) => {
  await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      const existing = await getExistingSale(id);
      const [payment, returned] = await Promise.all([
        trx("client_payments").where({ client_sale_id: id, is_deleted: false }).first("id"),
        trx("client_returns").where({ client_sale_id: id, is_deleted: false }).first("id"),
      ]);
      if (Number(existing.paid_amount || 0) > 0 || payment || returned) {
        throw new BadRequestError(
          "To'lov yoki qaytarish amali bor savdoni o'chirib bo'lmaydi. Qaytarish/refund orqali yoping",
        );
      }
      await trx("client_sales").where({ id }).update({
        is_deleted: true,
        updated_at: trx.fn.now(),
      });
      await inventory.syncClientSaleStock(trx, id, actor, {
        occurredAt: trx.fn.now(),
        note: `Mijoz savdosi #${id} bekor qilindi`,
      });
    }),
  );

  return { message: "Savdo yozuvi o'chirildi va mahsulot qoldig'i tiklandi" };
};

module.exports = deleteClientSale;
