const { BadRequestError, NotFoundError } = require("../errors");

const number = (value) => Number(value || 0);

const resolveAccount = async (trx, accountId) => {
  if (accountId) {
    const account = await trx("financial_accounts")
      .where({ id: Number(accountId), is_deleted: false, is_active: true })
      .first();
    if (!account) throw new NotFoundError("Moliyaviy hisob topilmadi");
    return account;
  }

  let account = await trx("financial_accounts")
    .where({ is_deleted: false, is_active: true })
    .orderByRaw("CASE WHEN account_type = 'cash' THEN 0 ELSE 1 END")
    .orderBy("id")
    .first();

  if (!account) {
    [account] = await trx("financial_accounts")
      .insert({ name: "Asosiy kassa", account_type: "cash", opening_balance: 0 })
      .returning("*");
  }
  return account;
};

const syncCashTransaction = async (
  trx,
  {
    sourceType,
    sourceId,
    transactionType,
    amount,
    accountId,
    transactedAt,
    description,
    createdBy,
  },
) => {
  const normalizedAmount = number(amount);
  const existing = await trx("cash_transactions")
    .where({ source_type: sourceType, source_id: Number(sourceId), is_deleted: false })
    .orderBy("id")
    .forUpdate()
    .first();

  if (normalizedAmount <= 0) {
    if (existing) {
      await trx("cash_transactions").where({ id: existing.id }).update({
        is_deleted: true,
        updated_at: trx.fn.now(),
      });
    }
    return null;
  }

  if (!["income", "expense"].includes(transactionType)) {
    throw new BadRequestError("Pul harakati turi noto'g'ri");
  }

  const account = await resolveAccount(trx, accountId || existing?.account_id);
  const values = {
    account_id: account.id,
    transaction_type: transactionType,
    amount: normalizedAmount,
    transacted_at: transactedAt || trx.fn.now(),
    description: description || null,
    is_deleted: false,
    updated_at: trx.fn.now(),
  };

  if (existing) {
    const [updated] = await trx("cash_transactions")
      .where({ id: existing.id })
      .update(values)
      .returning("*");
    return updated;
  }

  const [created] = await trx("cash_transactions")
    .insert({
      ...values,
      source_type: sourceType,
      source_id: Number(sourceId),
      created_by: createdBy || null,
    })
    .returning("*");
  return created;
};

const removeCashTransaction = (trx, sourceType, sourceId) =>
  trx("cash_transactions")
    .where({ source_type: sourceType, source_id: Number(sourceId), is_deleted: false })
    .update({ is_deleted: true, updated_at: trx.fn.now() });

module.exports = { resolveAccount, syncCashTransaction, removeCashTransaction };
