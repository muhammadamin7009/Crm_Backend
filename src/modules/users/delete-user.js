const db = require("../../db");
const { NotFoundError, BadRequestError } = require("../../shared/errors");

const formatMoney = (value) => new Intl.NumberFormat("uz-UZ").format(Number(value || 0));

const getWorkerBalance = async (workerId) => {
  const [earned, paid] = await Promise.all([
    db("worker_outputs")
      .where({ worker_id: workerId, is_deleted: false })
      .sum({ total_earned: "total_amount" })
      .first(),
    db("worker_payments")
      .where({ worker_id: workerId, is_deleted: false })
      .sum({ cash_paid: "amount" })
      .sum({ advance_deducted: "advance_deduction" })
      .sum({ other_deducted: "other_deduction" })
      .first(),
  ]);

  const totalEarned = Number(earned.total_earned || 0);
  const totalPaid =
    Number(paid.cash_paid || 0) +
    Number(paid.advance_deducted || 0) +
    Number(paid.other_deducted || 0);

  return {
    total_earned: totalEarned,
    total_paid: totalPaid,
    remaining: totalEarned - totalPaid,
  };
};

const removeUser = async ({ id }) => {
  const existing = await db("users")
    .where({ id, is_deleted: false })
    .select("id", "role", "first_name", "last_name")
    .first();

  if (!existing) throw new NotFoundError("User topilmadi");
  if (existing.role === "super_admin") {
    throw new BadRequestError("super_admin o'chirib bo'lmaydi");
  }

  if (existing.role === "worker") {
    const balance = await getWorkerBalance(existing.id);

    if (balance.remaining > 0) {
      const fullName = `${existing.first_name || ""} ${existing.last_name || ""}`.trim();

      throw new BadRequestError(
        `${fullName || "Ishchi"}ning ${formatMoney(balance.remaining)} so'm oyligi qolgan. Avval shu summani to'lov qilib kiriting, keyin o'chirishingiz mumkin.`,
      );
    }
  }

  const [deleted] = await db("users")
    .where({ id })
    .update({ is_deleted: true, updated_at: db.fn.now() })
    .returning(["id"]);

  return { deleted_user: deleted };
};

module.exports = removeUser;
