const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");
const { getAdvanceBalance } = require("../worker-advances/helpers");

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
        await trx("worker_payments")
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
          .ignore();
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
    if (body.account_id)
      await trx("cash_transactions").insert({
        account_id: body.account_id,
        transaction_type: "expense",
        source_type: "expense",
        source_id: expense.id,
        amount: body.amount,
        transacted_at: body.spent_at || trx.fn.now(),
        description: body.title,
        created_by: actor.id,
      });
    return { expense };
  });
};

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
  const sale = await db("client_sales")
    .where({ id: body.client_sale_id, is_deleted: false })
    .first();
  if (!sale) throw new NotFoundError("Savdo topilmadi");
  const returned = await db("client_returns")
    .where({ client_sale_id: sale.id, is_deleted: false })
    .sum({ quantity: "quantity" })
    .first();
  if (n(returned.quantity) + n(body.quantity) > n(sale.quantity))
    throw new BadRequestError(
      `Qaytarish miqdori qolgan ${n(sale.quantity) - n(returned.quantity)} dan oshmasin`,
    );
  const [row] = await db("client_returns")
    .insert({
      client_sale_id: sale.id,
      client_id: sale.client_id,
      product_id: sale.product_id,
      quantity: body.quantity,
      amount: n(body.quantity) * n(sale.unit_price),
      returned_at: body.returned_at || db.fn.now(),
      reason: clean(body.reason),
      created_by: actor.id,
    })
    .returning("*");
  return { client_return: row };
};

const profitLoss = async (filters) => {
  const sum = async (table, column, dateColumn, extra = {}) =>
    n(
      (await range(db(table).where(extra), dateColumn, filters).sum({ value: column }).first())
        .value,
    );
  const [sales, returns, materials, expenses] = await Promise.all([
    sum("client_sales", "total_amount", "sold_at", { is_deleted: false }),
    sum("client_returns", "amount", "returned_at", { is_deleted: false }),
    sum("material_purchases", "subtotal", "purchased_at", { is_deleted: false }),
    sum("expenses", "amount", "spent_at", { is_deleted: false }),
  ]);
  const payrollQuery = range(
    db("payroll_lines as pl").join("payroll_periods as pp", "pp.id", "pl.period_id"),
    "pp.payment_date",
    filters,
  );
  const payrollSum = n((await payrollQuery.sum({ value: "pl.total_earned" }).first()).value);
  const netRevenue = sales - returns;
  return {
    report: {
      sales,
      returns,
      net_revenue: netRevenue,
      material_costs: materials,
      payroll_costs: payrollSum,
      other_expenses: expenses,
      operational_result: netRevenue - materials - payrollSum - expenses,
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
  listAccounts,
  createAccount,
  listTransactions,
  createTransaction,
  listReturns,
  createReturn,
  profitLoss,
};
