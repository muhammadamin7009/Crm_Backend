const validate = require("../../shared/http-validator");
const schemas = require("./_schemas");
const s = require("./_services");
const run =
  (schema, service, status = 200, mode = "body") =>
  async (req, res, next) => {
    try {
      const input = {};
      if (schema.body) input.body = req.body;
      if (schema.params) input.params = req.params;
      if (schema.query) input.query = req.query;
      validate(input, schema);
      const data = mode === "query" ? req.query : mode === "id" ? Number(req.params.id) : req.body;
      const second = req.params.id ? Number(req.params.id) : req.user;
      res.status(status).json(await service(data, second, req.user));
    } catch (error) {
      next(error);
    }
  };
module.exports = {
  listPayroll: run(schemas.list, s.listPayroll, 200, "query"),
  showPayroll: run(schemas.id, s.showPayroll, 200, "id"),
  createPayroll: run(schemas.payrollCreate, s.createPayroll, 201),
  updatePayrollLine: run(schemas.payrollLineUpdate, s.updatePayrollLine),
  closePayroll: async (req, res, next) => {
    try {
      validate({ params: req.params }, schemas.id);
      res.json(await s.closePayroll(Number(req.params.id), req.user));
    } catch (e) {
      next(e);
    }
  },
  listCategories: run({ query: JoiObject() }, s.listCategories, 200, "query"),
  createCategory: run(schemas.categoryCreate, s.createCategory, 201),
  listExpenses: run(schemas.list, s.listExpenses, 200, "query"),
  createExpense: run(schemas.expenseCreate, s.createExpense, 201),
  listAccounts: run({ query: JoiObject() }, s.listAccounts, 200, "query"),
  createAccount: run(schemas.accountCreate, s.createAccount, 201),
  listTransactions: run(schemas.list, s.listTransactions, 200, "query"),
  createTransaction: run(schemas.transactionCreate, s.createTransaction, 201),
  listReturns: run(schemas.list, s.listReturns, 200, "query"),
  createReturn: run(schemas.returnCreate, s.createReturn, 201),
  profitLoss: run(schemas.list, s.profitLoss, 200, "query"),
};
function JoiObject() {
  return require("joi").object({});
}
