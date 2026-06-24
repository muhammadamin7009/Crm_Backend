const db = require("../../db");
const { BadRequestError, ForbiddenError, NotFoundError } = require("../../shared/errors");

const MANAGER_ROLES = ["super_admin", "admin"];

const isManager = (actor) => MANAGER_ROLES.includes(actor?.role);

const applyActorScope = (query, actor) => {
  if (isManager(actor)) return query;

  if (actor?.role === "worker") {
    return query.andWhere("wp.worker_id", Number(actor.id));
  }

  return query.andWhereRaw("1 = 0");
};

const canSeePayment = (payment, actor) => {
  if (isManager(actor)) return true;
  return actor?.role === "worker" && Number(payment.worker_id) === Number(actor.id);
};

const assertCanSeePayment = (payment, actor) => {
  if (!canSeePayment(payment, actor)) {
    throw new ForbiddenError("Bu to'lovni ko'rishga ruxsatingiz yo'q");
  }
};

const getWorker = async (workerId) => {
  const worker = await db("users")
    .where({ id: workerId, is_deleted: false, role: "worker" })
    .select("id", "first_name", "last_name", "role")
    .first();

  if (!worker) throw new BadRequestError("Worker role'dagi hodim topilmadi");
  return worker;
};

const getExistingPayment = async (id) => {
  const payment = await db("worker_payments")
    .where({ id, is_deleted: false })
    .first();

  if (!payment) throw new NotFoundError("To'lov topilmadi");
  return payment;
};

module.exports = {
  applyActorScope,
  assertCanSeePayment,
  getExistingPayment,
  getWorker,
  isManager,
};
