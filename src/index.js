const express = require("express");
const config = require("./shared/config");
const usersRoute = require("./modules/users/_api");
const categoriesRoute = require("./modules/categories/_api");
const productsRoute = require("./modules/products/_api");
const departmentsRoute = require("./modules/departments/_api");
const workerOutputsRoute = require("./modules/worker-outputs/_api");
const workerPaymentsRoute = require("./modules/worker-payments/_api");
const clientSalesRoute = require("./modules/client-sales/_api");
const clientPaymentsRoute = require("./modules/client-payments/_api");
const workerAdvancesRoute = require("./modules/worker-advances/_api");
const materialPurchasesRoute = require("./modules/material-purchases/_api");
const employeesRoute = require("./modules/employees/_api");
const financeRoute = require("./modules/finance/_api");
const tenantContext = require("./shared/tenant-context");
const platformRoute = require("./modules/platform/_api");
const auditLogsRoute = require("./modules/audit-logs/_api");
const permissionsRoute = require("./modules/permissions/_api");
const auditLog = require("./shared/middlewares/audit-log");
const planAccess = require("./shared/middlewares/plan-access");
const handleError = require("./shared/errors/handle");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));
app.use("/api/platform", platformRoute);

const tenantRouter = express.Router({ mergeParams: true });
tenantRouter.use(auditLog);
tenantRouter.use(usersRoute);
tenantRouter.use(categoriesRoute);
tenantRouter.use(productsRoute);
tenantRouter.use(departmentsRoute);
tenantRouter.use(workerOutputsRoute);
tenantRouter.use(workerPaymentsRoute);
tenantRouter.use(clientSalesRoute);
tenantRouter.use(clientPaymentsRoute);
tenantRouter.use(workerAdvancesRoute);
tenantRouter.use(materialPurchasesRoute);
tenantRouter.use(employeesRoute);
tenantRouter.use(financeRoute);
tenantRouter.use(auditLogsRoute);
tenantRouter.use(permissionsRoute);

app.use("/api/:companySlug", tenantContext, planAccess, tenantRouter);

app.use(handleError);

const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});

