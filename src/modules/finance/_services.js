const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");
const { getAdvanceBalance } = require("../worker-advances/helpers");
const {
  syncCashTransaction,
  removeCashTransaction,
} = require("../../shared/finance/cash-ledger");
const inventory = require("../inventory/_services");

const range = (query, column, { date_from, date_to }) => {
  if (date_from) query.andWhere(column, ">=", date_from);
  if (date_to) query.andWhere(column, "<=", date_to);
  return query;
};
const clean = (value) => value || null;
const n = (value) => Number(value || 0);

const ensureActiveRecord = async (table, id, label) => {
  if (!id) return null;
  const query = db(table).where({ id: Number(id) });
  if (["expense_categories", "financial_accounts"].includes(table)) {
    query.andWhere({ is_deleted: false });
  }
  const row = await query.first();
  if (!row) throw new NotFoundError(`${label} topilmadi`);
  return row;
};

const listPayroll = async ({ limit = 50, offset = 0 }) => {
  const query = db("payroll_periods as pp");
  const [rows, count] = await Promise.all([
    query
      .clone()
      .select("pp.*")
      .select(
        db.raw(
          "(SELECT COALESCE(SUM(total_earned),0) FROM payroll_lines WHERE period_id=pp.id) AS total_earned",
        ),
        db.raw(
          "(SELECT COALESCE(SUM(cash_amount),0) FROM payroll_lines WHERE period_id=pp.id) AS cash_amount",
        ),
      )
      .orderBy("period_to", "desc")
      .limit(Number(limit))
      .offset(Number(offset)),
    query.clone().count({ count: "id" }).first(),
  ]);
  return {
    payroll_periods: rows,
    pageInfo: { total: n(count.count), limit: n(limit), offset: n(offset) },
  };
};

const showPayroll = async (id) => {
  const period = await db("payroll_periods").where({ id }).first();
  if (!period) throw new NotFoundError("Haftalik ish haqi davri topilmadi");
  const lines = await db("payroll_lines as pl")
    .join("employee_profiles as ep", "ep.id", "pl.employee_id")
    .join("users as u", "u.id", "ep.user_id")
    .leftJoin("positions as p", "p.id", "ep.position_id")
    .where("pl.period_id", id)
    .select(
      "pl.*",
      "ep.user_id",
      "u.first_name",
      "u.last_name",
      "u.username",
      "p.name as position_name",
    )
    .orderBy("u.first_name");
  return { payroll_period: period, payroll_lines: lines };
};

const createPayroll = async (body, actor) => {
  if (new Date(body.period_from) > new Date(body.period_to))
    throw new BadRequestError("Boshlanish sanasi tugash sanasidan katta bo'lmasin");
  if (new Date(body.payment_date) < new Date(body.period_to))
    throw new BadRequestError("To'lov sanasi hisob davri tugashidan oldin bo'lmasin");
  const periodDays =
    Math.floor((new Date(body.period_to) - new Date(body.period_from)) / 86400000) + 1;
  if (periodDays > 7) throw new BadRequestError("Haftalik hisob davri 7 kundan oshmasin");
  const exists = await db("payroll_periods")
    .where("period_from", "<=", body.period_to)
    .andWhere("period_to", ">=", body.period_from)
    .first();
  if (exists)
    throw new BadRequestError("Bu sanalar boshqa haftalik ish haqi davri bilan kesishadi");
  const periodId = await db.transaction(async (trx) => {
    const [period] = await trx("payroll_periods")
      .insert({ ...body, note: clean(body.note), created_by: actor.id })
      .returning("*");
    const employees = await trx("employee_profiles as ep")
      .join("users as u", "u.id", "ep.user_id")
      .where({ "ep.is_active": true, "u.is_deleted": false })
      .select("ep.id", "ep.user_id");
    for (const employee of employees) {
      const agreement = await trx("employee_agreements")
        .where("employee_id", employee.id)
        .where("effective_from", "<=", body.period_to)
        .where((qb) => qb.whereNull("effective_to").orWhere("effective_to", ">=", body.period_from))
        .orderBy("effective_from", "desc")
        .first();
      if (!agreement) continue;
      const output = await trx("worker_outputs")
        .where({ worker_id: employee.user_id, is_deleted: false })
        .whereBetween("worked_at", [body.period_from, body.period_to])
        .sum({ amount: "total_amount" })
        .countDistinct({ days: "worked_at" })
        .first();
      const sales = await trx("client_sales")
        .where({ created_by: employee.user_id, is_deleted: false })
        .whereBetween("sold_at", [body.period_from, body.period_to])
        .sum({ amount: "total_amount" })
        .first();
      const type = agreement.payment_type;
      const piece = ["piece_rate", "mixed"].includes(type) ? n(output.amount) : 0;
      const fixed = ["fixed_salary", "mixed"].includes(type)
        ? agreement.payment_period === "monthly"
          ? (n(agreement.fixed_amount) * periodDays) / 30
          : n(agreement.fixed_amount)
        : 0;
      const daily = type === "daily_rate" ? n(output.days) * n(agreement.daily_rate) : 0;
      const commission =
        type === "commission" ? (n(sales.amount) * n(agreement.commission_percent)) / 100 : 0;
      const total = piece + fixed + daily + commission;
      await trx("payroll_lines").insert({
        period_id: period.id,
        employee_id: employee.id,
        piece_earnings: piece,
        fixed_earnings: fixed,
        daily_earnings: daily,
        commission_earnings: commission,
        total_earned: total,
        cash_amount: total,
      });
    }
    return period.id;
  });
  return showPayroll(periodId);
};

const updatePayrollLine = async (body, id) => {
  const line = await db("payroll_lines as pl")
    .join("payroll_periods as pp", "pp.id", "pl.period_id")
    .join("employee_profiles as ep", "ep.id", "pl.employee_id")
    .where("pl.id", id)
    .select("pl.*", "pp.status", "ep.user_id")
    .first();
  if (!line) throw new NotFoundError("Ish haqi hisob qatori topilmadi");
  if (line.status === "closed")
    throw new BadRequestError("Yopilgan ish haqi hisobini o'zgartirib bo'lmaydi");
  const merged = { ...line, ...body };
  const total =
    n(merged.piece_earnings) +
    n(merged.fixed_earnings) +
    n(merged.daily_earnings) +
    n(merged.commission_earnings) +
    n(merged.bonus);
  const maxCash = total - n(merged.advance_deduction) - n(merged.other_deduction);
  if (n(merged.advance_deduction) > 0) {
    const advance = await getAdvanceBalance(Number(line.user_id));
    if (n(merged.advance_deduction) > advance.remaining_advance) {
      throw new BadRequestError(
        `Avansdan ushlanma qolgan avansdan oshmasin. Qolgan avans: ${advance.remaining_advance}`,
      );
    }
  }
  if (n(merged.cash_amount) > maxCash)
    throw new BadRequestError(`Naqd summa ${maxCash} dan oshmasin`);
  const [updated] = await db("payroll_lines")
    .where({ id })
    .update({
      ...body,
      note: body.note !== undefined ? clean(body.note) : line.note,
      total_earned: total,
      updated_at: db.fn.now(),
    })
    .returning("*");
  return { payroll_line: updated };
};

const closePayroll = async (id, actor) => {
  const period = await db("payroll_periods").where({ id }).first();
  if (!period) throw new NotFoundError("Haftalik ish haqi davri topilmadi");
  if (period.status === "closed")
    throw new BadRequestError("Haftalik ish haqi hisobi allaqachon yopilgan");
  await db.transaction(async (trx) => {
    const lines = await trx("payroll_lines as pl")
      .join("employee_profiles as ep", "ep.id", "pl.employee_id")
      .where("pl.period_id", id)
      .select("pl.*", "ep.user_id");

    for (const line of lines) {
      if (n(line.advance_deduction) > 0) {
        const advance = await getAdvanceBalance(Number(line.user_id));
        if (n(line.advance_deduction) > advance.remaining_advance) {
          throw new BadRequestError(
            `${line.user_id}-hodim avansidan ushlanma qolgan avansdan oshib ketgan`,
          );
        }
      }
      if (n(line.cash_amount) || n(line.advance_deduction) || n(line.other_deduction)) {
        const [payment] = await trx("worker_payments")
          .insert({
            worker_id: line.user_id,
            payroll_line_id: line.id,
            amount: n(line.cash_amount),
            advance_deduction: n(line.advance_deduction),
            other_deduction: n(line.other_deduction),
            payment_type: "salary",
            paid_at: period.payment_date,
            period_from: period.period_from,
            period_to: period.period_to,
            note: line.note || `Haftalik ish haqi #${period.id}`,
            created_by: actor.id,
          })
          .onConflict("payroll_line_id")
          .ignore()
          .returning("*");
        if (payment) {
          await syncCashTransaction(trx, {
            sourceType: "worker_payment",
            sourceId: payment.id,
            transactionType: "expense",
            amount: payment.amount,
            transactedAt: payment.paid_at,
            description: `Haftalik ish haqi #${period.id}`,
            createdBy: actor.id,
          });
        }
      }
    }

    await trx("payroll_periods")
      .where({ id })
      .update({
        status: "closed",
        closed_by: actor.id,
        closed_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
  });
  return showPayroll(id);
};

const listCategories = async () => ({
  expense_categories: await db("expense_categories").where({ is_deleted: false }).orderBy("name"),
});
const createCategory = async (body) => ({
  expense_category: (
    await db("expense_categories")
      .insert({ name: body.name, description: clean(body.description) })
      .returning("*")
  )[0],
});
const listExpenses = async (filters) => {
  const query = range(
    db("expenses as e")
      .join("expense_categories as ec", "ec.id", "e.category_id")
      .leftJoin("financial_accounts as fa", "fa.id", "e.account_id")
      .leftJoin("users as creator", "creator.id", "e.created_by")
      .where("e.is_deleted", false),
    "e.spent_at",
    filters,
  );
  const rows = await query
    .clone()
    .select(
      "e.*",
      "ec.name as category_name",
      "fa.name as account_name",
      db.raw("concat_ws(' ', creator.first_name, creator.last_name) as created_by_name"),
    )
    .orderBy("e.spent_at", "desc")
    .limit(n(filters.limit || 50))
    .offset(n(filters.offset));
  const total = await query.clone().clearSelect().sum({ amount: "e.amount" }).first();
  return { expenses: rows, total_amount: n(total.amount) };
};
const createExpense = async (body, actor) => {
  if (body.account_id) {
    await ensureActiveRecord("financial_accounts", body.account_id, "Moliyaviy hisob");
  }
  return db.transaction(async (trx) => {
    let categoryId = body.category_id ? Number(body.category_id) : null;

    if (categoryId) {
      const category = await trx("expense_categories")
        .where({ id: categoryId, is_deleted: false })
        .first();
      if (!category) throw new NotFoundError("Xarajat kategoriyasi topilmadi");
    } else {
      let defaultCategory = await trx("expense_categories")
        .where({ name: "Mayda xarajatlar" })
        .first();

      if (defaultCategory?.is_deleted) {
        [defaultCategory] = await trx("expense_categories")
          .where({ id: defaultCategory.id })
          .update({ is_deleted: false, is_active: true, updated_at: trx.fn.now() })
          .returning("*");
      }

      if (!defaultCategory) {
        [defaultCategory] = await trx("expense_categories")
          .insert({
            name: "Mayda xarajatlar",
            description: "Korxonaning kundalik mayda va xo'jalik xarajatlari",
          })
          .returning("*");
      }

      categoryId = defaultCategory.id;
    }

    const [expense] = await trx("expenses")
      .insert({
        category_id: categoryId,
        account_id: body.account_id || null,
        title: body.title,
        amount: body.amount,
        spent_at: body.spent_at || trx.fn.now(),
        note: clean(body.note),
        created_by: actor.id,
      })
      .returning("*");
    await syncCashTransaction(trx, {
      sourceType: "expense",
      sourceId: expense.id,
      transactionType: "expense",
      amount: body.amount,
      accountId: body.account_id,
      transactedAt: body.spent_at,
      description: body.title,
      createdBy: actor.id,
    });
    return { expense };
  });
};

const updateExpense = async (body, id, actor) =>
  db.transaction(async (trx) => {
    const existing = await trx("expenses").where({ id, is_deleted: false }).forUpdate().first();
    if (!existing) throw new NotFoundError("Xarajat topilmadi");

    const categoryId =
      body.category_id !== undefined ? Number(body.category_id) : Number(existing.category_id);
    const category = await trx("expense_categories")
      .where({ id: categoryId, is_deleted: false, is_active: true })
      .first();
    if (!category) throw new NotFoundError("Xarajat kategoriyasi topilmadi");

    const accountId =
      body.account_id !== undefined
        ? body.account_id
          ? Number(body.account_id)
          : null
        : existing.account_id;
    if (accountId) {
      const account = await trx("financial_accounts")
        .where({ id: accountId, is_deleted: false, is_active: true })
        .first();
      if (!account) throw new NotFoundError("Moliyaviy hisob topilmadi");
    }

    const values = {
      category_id: categoryId,
      account_id: accountId,
      title: body.title !== undefined ? body.title : existing.title,
      amount: body.amount !== undefined ? Number(body.amount) : Number(existing.amount),
      spent_at: body.spent_at || existing.spent_at,
      note: body.note !== undefined ? clean(body.note) : existing.note,
      updated_at: trx.fn.now(),
    };
    const [expense] = await trx("expenses").where({ id }).update(values).returning("*");
    await syncCashTransaction(trx, {
      sourceType: "expense",
      sourceId: id,
      transactionType: "expense",
      amount: values.amount,
      accountId,
      transactedAt: values.spent_at,
      description: values.title,
      createdBy: actor?.id || existing.created_by,
    });
    return { expense };
  });

const deleteExpense = async (id) =>
  db.transaction(async (trx) => {
    const existing = await trx("expenses").where({ id, is_deleted: false }).forUpdate().first();
    if (!existing) throw new NotFoundError("Xarajat topilmadi");
    await trx("expenses").where({ id }).update({ is_deleted: true, updated_at: trx.fn.now() });
    await removeCashTransaction(trx, "expense", id);
    return { message: "Xarajat o'chirildi va hisob balansi tiklandi" };
  });

const listAccounts = async () => {
  const accounts = await db("financial_accounts as fa")
    .where({ is_deleted: false })
    .select(
      "fa.*",
      db.raw(
        "fa.opening_balance + COALESCE((SELECT SUM(CASE WHEN transaction_type='income' THEN amount ELSE -amount END) FROM cash_transactions ct WHERE ct.account_id=fa.id AND ct.is_deleted=false),0) AS balance",
      ),
    )
    .orderBy("name");
  return { financial_accounts: accounts };
};
const createAccount = async (body) => ({
  financial_account: (await db("financial_accounts").insert(body).returning("*"))[0],
});
const listTransactions = async (filters) => ({
  cash_transactions: await range(
    db("cash_transactions as ct")
      .join("financial_accounts as fa", "fa.id", "ct.account_id")
      .where("ct.is_deleted", false),
    "ct.transacted_at",
    filters,
  )
    .select("ct.*", "fa.name as account_name")
    .orderBy("ct.transacted_at", "desc")
    .limit(n(filters.limit || 50))
    .offset(n(filters.offset)),
});
const createTransaction = async (body, actor) => {
  await ensureActiveRecord("financial_accounts", body.account_id, "Moliyaviy hisob");
  return {
    cash_transaction: (
      await db("cash_transactions")
        .insert({
          ...body,
          source_type: "manual",
          transacted_at: body.transacted_at || db.fn.now(),
          description: clean(body.description),
          created_by: actor.id,
        })
        .returning("*")
    )[0],
  };
};

const listReturns = async (filters) => {
  const query = range(
    db("client_returns as cr")
      .join("users as u", "u.id", "cr.client_id")
      .join("products as p", "p.id", "cr.product_id")
      .where("cr.is_deleted", false),
    "cr.returned_at",
    filters,
  );
  return {
    client_returns: await query
      .select(
        "cr.*",
        "p.name as product_name",
        db.raw("CONCAT(u.first_name,' ',u.last_name) as client_name"),
      )
      .orderBy("cr.returned_at", "desc")
      .limit(n(filters.limit || 50))
      .offset(n(filters.offset)),
  };
};
const createReturn = async (body, actor) => {
  const row = await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      const sale = await trx("client_sales")
        .where({ id: body.client_sale_id, is_deleted: false })
        .forUpdate()
        .first();
      if (!sale) throw new NotFoundError("Savdo topilmadi");
      const returned = await trx("client_returns")
        .where({ client_sale_id: sale.id, is_deleted: false })
        .sum({ quantity: "quantity" })
        .sum({ amount: "amount" })
        .sum({ refund_amount: "refund_amount" })
        .first();
      if (n(returned.quantity) + n(body.quantity) > n(sale.quantity))
        throw new BadRequestError(
          `Qaytarish miqdori qolgan ${n(sale.quantity) - n(returned.quantity)} dan oshmasin`,
        );
      const payments = await trx("client_payments")
        .where({ client_sale_id: sale.id, is_deleted: false })
        .sum({ amount: "amount" })
        .first();
      const returnAmount = n(body.quantity) * n(sale.unit_price);
      const totalPaid = n(sale.paid_amount) + n(payments.amount);
      const netSaleAfterReturn = n(sale.total_amount) - n(returned.amount) - returnAmount;
      const refundAmount = Math.max(
        0,
        totalPaid - netSaleAfterReturn - n(returned.refund_amount),
      );
      const [created] = await trx("client_returns")
        .insert({
          client_sale_id: sale.id,
          client_id: sale.client_id,
          product_id: sale.product_id,
          quantity: body.quantity,
          amount: returnAmount,
          refund_amount: refundAmount,
          refund_account_id: body.refund_account_id || null,
          returned_at: body.returned_at || trx.fn.now(),
          reason: clean(body.reason),
          created_by: actor.id,
        })
        .returning("*");
      await syncCashTransaction(trx, {
        sourceType: "client_return_refund",
        sourceId: created.id,
        transactionType: "expense",
        amount: refundAmount,
        accountId: body.refund_account_id,
        transactedAt: created.returned_at,
        description: `Mijoz savdosi #${sale.id} qaytarimi`,
        createdBy: actor.id,
      });
      await inventory.syncClientSaleStock(trx, sale.id, actor, {
        occurredAt: created.returned_at,
        note: `Mijoz savdosi #${sale.id} bo'yicha mahsulot qaytdi`,
      });
      return created;
    }),
  );
  return { client_return: row };
};

const profitLoss = async (filters) => {
  const sum = async (table, column, dateColumn, extra = {}) =>
    n(
      (await range(db(table).where(extra), dateColumn, filters).sum({ value: column }).first())
        .value,
    );
  const [sales, returns, materialPurchases, expenses] = await Promise.all([
    sum("client_sales", "total_amount", "sold_at", { is_deleted: false }),
    sum("client_returns", "amount", "returned_at", { is_deleted: false }),
    sum("material_purchases", "subtotal", "purchased_at", { is_deleted: false }),
    sum("expenses", "amount", "spent_at", { is_deleted: false }),
  ]);
  const averageCosts = db("material_purchase_items as mpi")
    .join("material_purchases as mp", "mp.id", "mpi.purchase_id")
    .where("mp.is_deleted", false)
    .groupBy("mpi.raw_material_id")
    .select("mpi.raw_material_id")
    .select(db.raw("SUM(mpi.total_amount) / NULLIF(SUM(mpi.quantity), 0) AS average_cost"));
  const consumptionQuery = range(
    db("inventory_movements as im")
      .leftJoin(averageCosts.as("cost"), "cost.raw_material_id", "im.item_id")
      .where({
        "im.item_type": "raw_material",
        "im.movement_type": "out",
        "im.reference_type": "worker_output_stock",
      }),
    "im.occurred_at",
    filters,
  );
  const materialConsumption = n(
    (
      await consumptionQuery
        .sum({ value: db.raw("ABS(im.quantity_delta) * COALESCE(cost.average_cost, 0)") })
        .first()
    ).value,
  );
  const payrollQuery = range(
    db("payroll_lines as pl").join("payroll_periods as pp", "pp.id", "pl.period_id"),
    "pp.payment_date",
    filters,
  ).where("pp.status", "closed");
  const payrollSum = n((await payrollQuery.sum({ value: "pl.total_earned" }).first()).value);
  const netRevenue = sales - returns;
  return {
    report: {
      sales,
      returns,
      net_revenue: netRevenue,
      material_costs: materialConsumption,
      material_purchase_costs: materialPurchases,
      payroll_costs: payrollSum,
      other_expenses: expenses,
      operational_result: netRevenue - materialConsumption - payrollSum - expenses,
      accounting_basis: "accrual_weighted_average",
    },
  };
};

module.exports = {
  listPayroll,
  showPayroll,
  createPayroll,
  updatePayrollLine,
  closePayroll,
  listCategories,
  createCategory,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  listAccounts,
  createAccount,
  listTransactions,
  createTransaction,
  listReturns,
  createReturn,
  profitLoss,
};
