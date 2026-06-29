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
const handleError = require("./shared/errors/handle");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

app.use(usersRoute);
app.use(categoriesRoute);
app.use(productsRoute);
app.use(departmentsRoute);
app.use(workerOutputsRoute);
app.use(workerPaymentsRoute);
app.use(clientSalesRoute);
app.use(clientPaymentsRoute);
app.use(workerAdvancesRoute);
app.use(materialPurchasesRoute);
app.use(employeesRoute);

app.use(handleError);

const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
