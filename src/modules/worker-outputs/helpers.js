const db = require("../../db");
const { BadRequestError, ForbiddenError, NotFoundError } = require("../../shared/errors");

const MANAGER_ROLES = ["super_admin", "admin"];

const isManager = (actor) => MANAGER_ROLES.includes(actor?.role);

const canSeeOutput = (output, actor) => {
  if (isManager(actor)) return true;
  return actor?.role === "worker" && Number(output.worker_id) === Number(actor.id);
};

const applyActorScope = (query, actor) => {
  if (isManager(actor)) return query;

  if (actor?.role === "worker") {
    return query.andWhere("wo.worker_id", Number(actor.id));
  }

  return query.andWhereRaw("1 = 0");
};

const getWorker = async (workerId) => {
  const worker = await db("users")
    .where({ id: workerId, is_deleted: false, role: "worker" })
    .select("id", "first_name", "last_name", "role")
    .first();

  if (!worker) throw new BadRequestError("Worker role'dagi hodim topilmadi");
  return worker;
};

const getProduct = async (productId) => {
  const product = await db("products")
    .where({ id: productId, is_deleted: false })
    .select("id", "name", "is_active")
    .first();

  if (!product) throw new NotFoundError("Mahsulot topilmadi");
  if (!product.is_active) throw new BadRequestError("Nofaol mahsulotga ish yozib bo'lmaydi");
  return product;
};

const getDepartment = async (departmentId) => {
  const department = await db("departments")
    .where({ id: departmentId, is_deleted: false })
    .select("id", "name", "code", "is_active")
    .first();

  if (!department) throw new NotFoundError("Bo'lim topilmadi");
  if (!department.is_active) throw new BadRequestError("Nofaol bo'limga ish yozib bo'lmaydi");
  return department;
};

const getPricePerUnit = async (productId, departmentId) => {
  const price = await db("product_department_prices")
    .where({
      product_id: productId,
      department_id: departmentId,
      is_active: true,
    })
    .select("price_per_unit")
    .first();

  if (!price) {
    throw new BadRequestError("Bu mahsulot uchun tanlangan bo'lim narxi kiritilmagan");
  }

  return Number(price.price_per_unit);
};

const getExistingOutput = async (id) => {
  const output = await db("worker_outputs").where({ id, is_deleted: false }).first();

  if (!output) throw new NotFoundError("Ish yozuvi topilmadi");
  return output;
};

const assertCanSeeOutput = (output, actor) => {
  if (!canSeeOutput(output, actor)) {
    throw new ForbiddenError("Bu ish yozuvini ko'rishga ruxsatingiz yo'q");
  }
};

module.exports = {
  applyActorScope,
  assertCanSeeOutput,
  getDepartment,
  getExistingOutput,
  getPricePerUnit,
  getProduct,
  getWorker,
  isManager,
};
