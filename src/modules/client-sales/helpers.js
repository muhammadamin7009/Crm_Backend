const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const getClient = async (clientId) => {
  const client = await db("users")
    .where({ id: clientId, is_deleted: false, role: "client" })
    .select("id", "first_name", "last_name", "username", "role")
    .first();

  if (!client) throw new BadRequestError("Client role'dagi user topilmadi");
  return client;
};

const getProduct = async (productId) => {
  const product = await db("products")
    .where({ id: productId, is_deleted: false })
    .select("id", "name", "sale_price", "is_active")
    .first();

  if (!product) throw new NotFoundError("Mahsulot topilmadi");
  if (!product.is_active) throw new BadRequestError("Nofaol mahsulot sotib bo'lmaydi");

  return product;
};

const getExistingSale = async (id) => {
  const sale = await db("client_sales")
    .where({ id, is_deleted: false })
    .first();

  if (!sale) throw new NotFoundError("Savdo yozuvi topilmadi");
  return sale;
};

const calculateSaleAmounts = ({ quantity, unitPrice, paidAmount = 0 }) => {
  const totalAmount = Number((Number(quantity) * Number(unitPrice)).toFixed(2));
  const paid = Number(paidAmount || 0);

  if (paid > totalAmount) {
    throw new BadRequestError("To'langan summa umumiy savdo summasidan oshmasin");
  }

  return {
    total_amount: totalAmount,
    paid_amount: paid,
    debt_amount: Number((totalAmount - paid).toFixed(2)),
  };
};

module.exports = {
  calculateSaleAmounts,
  getClient,
  getExistingSale,
  getProduct,
};
