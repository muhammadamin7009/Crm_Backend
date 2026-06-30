const listClientSales = require("./list-client-sales");
const getClientBalance = require("./get-client-balance");
const listClientPayments = require("../client-payments/list-client-payments");

const getMyClientAccount = async (actor, filters = {}) => {
  const clientId = Number(actor.id);
  const commonFilters = {
    client_id: clientId,
    date_from: filters.date_from,
    date_to: filters.date_to,
    limit: filters.limit || 10,
    offset: filters.offset || 0,
    sort_order: "desc",
  };

  const [sales, payments, balance] = await Promise.all([
    listClientSales({ ...commonFilters, sort_by: "sold_at" }),
    listClientPayments({ ...commonFilters, sort_by: "paid_at" }),
    getClientBalance({ client_id: clientId }),
  ]);

  return {
    balance: balance.balance,
    client_sales: sales.client_sales,
    sales_page_info: sales.pageInfo,
    client_payments: payments.client_payments,
    payments_page_info: payments.pageInfo,
  };
};

module.exports = getMyClientAccount;
