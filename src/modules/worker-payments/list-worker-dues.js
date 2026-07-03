const db = require("../../db");

const listWorkerDues = async () => {
  const earned = db("worker_outputs")
    .where({ is_deleted: false })
    .groupBy("worker_id")
    .select("worker_id")
    .sum({ total_earned: "total_amount" })
    .as("earned");

  const paid = db("worker_payments")
    .where({ is_deleted: false })
    .groupBy("worker_id")
    .select("worker_id")
    .sum({ cash_paid: "amount" })
    .sum({ advance_deducted: "advance_deduction" })
    .sum({ other_deducted: "other_deduction" })
    .as("paid");

  const advances = db("worker_advances")
    .where({ is_deleted: false })
    .groupBy("worker_id")
    .select("worker_id")
    .sum({ total_advance: "amount" })
    .as("advances");

  const remainingSql = `
    COALESCE(earned.total_earned, 0)
    - COALESCE(paid.cash_paid, 0)
    - COALESCE(paid.advance_deducted, 0)
    - COALESCE(paid.other_deducted, 0)
  `;

  const rows = await db("users as u")
    .leftJoin(earned, "earned.worker_id", "u.id")
    .leftJoin(paid, "paid.worker_id", "u.id")
    .leftJoin(advances, "advances.worker_id", "u.id")
    .where({ "u.role": "worker", "u.is_deleted": false })
    .whereRaw(`(${remainingSql}) > 0`)
    .select(
      "u.id as worker_id",
      "u.first_name",
      "u.last_name",
      "u.user_image",
      db.raw("COALESCE(earned.total_earned, 0) as total_earned"),
      db.raw(
        "COALESCE(paid.cash_paid, 0) + COALESCE(paid.advance_deducted, 0) + COALESCE(paid.other_deducted, 0) as total_paid",
      ),
      db.raw(`${remainingSql} as remaining`),
      db.raw(
        "GREATEST(COALESCE(advances.total_advance, 0) - COALESCE(paid.advance_deducted, 0), 0) as remaining_advance",
      ),
    )
    .orderByRaw(`${remainingSql} DESC`);

  return {
    worker_dues: rows.map((row) => ({
      ...row,
      total_earned: Number(row.total_earned || 0),
      total_paid: Number(row.total_paid || 0),
      remaining: Number(row.remaining || 0),
      remaining_advance: Number(row.remaining_advance || 0),
    })),
  };
};

module.exports = listWorkerDues;
