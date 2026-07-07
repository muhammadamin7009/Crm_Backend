const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const c = require("./_controllers");

const viewManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("finance.view")];
const manageManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("finance.manage")];

router.get("/payroll-periods", ...viewManager, c.listPayroll);
router.get("/payroll-periods/:id", ...viewManager, c.showPayroll);
router.post("/payroll-periods", ...manageManager, c.createPayroll);
router.patch("/payroll-lines/:id", ...manageManager, c.updatePayrollLine);
router.post("/payroll-periods/:id/close", ...manageManager, c.closePayroll);
router.get("/expense-categories", ...viewManager, c.listCategories);
router.post("/expense-categories", ...manageManager, c.createCategory);
router.get("/expenses", ...viewManager, c.listExpenses);
router.post("/expenses", ...manageManager, c.createExpense);
router.get("/financial-accounts", ...viewManager, c.listAccounts);
router.post("/financial-accounts", ...manageManager, c.createAccount);
router.get("/cash-transactions", ...viewManager, c.listTransactions);
router.post("/cash-transactions", ...manageManager, c.createTransaction);
router.get("/client-returns", ...viewManager, c.listReturns);
router.post("/client-returns", ...manageManager, c.createReturn);
router.get("/reports/profit-loss", ...viewManager, c.profitLoss);

module.exports = router;
