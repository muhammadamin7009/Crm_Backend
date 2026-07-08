const httpValidator = require("../../shared/http-validator");
const {
  createClientSaleSchema,
  updateClientSaleSchema,
  showClientSaleSchema,
  deleteClientSaleSchema,
  listClientSalesSchema,
  clientSalesSummarySchema,
  clientBalanceSchema,
  createBulkClientSaleSchema,
} = require("./_schemas");
const createClientSaleService = require("./create-client-sale");
const createBulkClientSaleService = require("./create-bulk-client-sale");
const listClientSalesService = require("./list-client-sales");
const updateClientSaleService = require("./update-client-sale");
const deleteClientSaleService = require("./delete-client-sale");
const summaryClientSalesService = require("./summary-client-sales");
const getClientBalanceService = require("./get-client-balance");
const getMyClientAccountService = require("./get-my-client-account");
const { getFormattedSale } = require("./format-sale");
const { ForbiddenError } = require("../../shared/errors");

const createClientSale = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createClientSaleSchema);
    const result = await createClientSaleService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const createBulkClientSale = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createBulkClientSaleSchema);
    const result = await createBulkClientSaleService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getClientSales = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, listClientSalesSchema);
    const result = await listClientSalesService(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getClientSale = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, showClientSaleSchema);
    const sale = await getFormattedSale(Number(req.params.id));
    res.status(200).json({ client_sale: sale });
  } catch (error) {
    next(error);
  }
};

const getClientSalesSummary = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, clientSalesSummarySchema);
    const result = await summaryClientSalesService(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getClientBalance = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, clientBalanceSchema);

    if (req.user?.role !== "super_admin" && !req.query.client_id) {
      throw new ForbiddenError("Umumiy mijoz balansi faqat super_admin uchun.");
    }

    const result = await getClientBalanceService(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getMyClientAccount = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, listClientSalesSchema);
    const result = await getMyClientAccountService(req.user, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchClientSale = async (req, res, next) => {
  try {
    httpValidator({ body: req.body, params: req.params }, updateClientSaleSchema);
    const result = await updateClientSaleService(req.body, {
      id: Number(req.params.id),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeClientSale = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteClientSaleSchema);
    const result = await deleteClientSaleService({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClientSale,
  createBulkClientSale,
  getClientSales,
  getClientSale,
  getClientSalesSummary,
  getClientBalance,
  getMyClientAccount,
  patchClientSale,
  removeClientSale,
};
