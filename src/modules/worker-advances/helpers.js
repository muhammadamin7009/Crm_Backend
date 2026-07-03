const db = require("../../db");
const { BadRequestError, ForbiddenError, NotFoundError } = require("../../shared/errors");

const isManager = (actor) => ["super_admin", "admin"].includes(actor?.role);

const getWorker = async (workerId) => {
  const worker = await db("users")
    .where({ id: workerId, is_deleted: false, role: "worker" })
    .first();
  if (!worker) throw new BadRequestError("Worker role'dagi hodim topilmadi");
  return worker;
};

const getExistingAdvance = async (id) => {
  const advance = await db("worker_advances").where({ id, is_deleted: false }).first();
  if (!advance) throw new NotFoundError("Avans topilmadi");
  return advance;
};

const resolveWorkerId = async (requestedWorkerId, actor) => {
  if (isManager(actor)) {
    const workerId = requestedWorkerId ? Number(requestedWorkerId) : null;
    if (workerId) await getWorker(workerId);
    return workerId;
  }
  if (actor?.role !== "worker")
    throw new ForbiddenError("Avans ma'lumotini ko'rishga ruxsatingiz yo'q");
  if (requestedWorkerId && Number(requestedWorkerId) !== Number(actor.id)) {
    throw new ForbiddenError("Boshqa ishchi avansini ko'ra olmaysiz");
  }
  return Number(actor.id);
};

const getAdvanceBalance = async (workerId, excludeAdvanceId = null) => {
  const advancesQuery = db("worker_advances").where({ is_deleted: false });
  const deductionsQuery = db("worker_payments").where({ is_deleted: false });
  if (workerId) {
    advancesQuery.andWhere("worker_id", workerId);
    deductionsQuery.andWhere("worker_id", workerId);
  }
  if (excludeAdvanceId) advancesQuery.andWhereNot("id", excludeAdvanceId);

  const [advances, deductions] = await Promise.all([
    advancesQuery.sum({ total_advance: "amount" }).first(),
    deductionsQuery.sum({ total_deducted: "advance_deduction" }).first(),
  ]);
  const totalAdvance = Number(advances.total_advance || 0);
  const totalDeducted = Number(deductions.total_deducted || 0);
  return {
    total_advance: totalAdvance,
    total_deducted: totalDeducted,
    remaining_advance: totalAdvance - totalDeducted,
  };
};

module.exports = { getAdvanceBalance, getExistingAdvance, getWorker, isManager, resolveWorkerId };
