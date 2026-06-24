const httpValidator = require("../../shared/http-validator");
const {
  createClientSaleSchema,
  updateClientSaleSchema,
  showClientSaleSchema,
  deleteClientSaleSchema,
  listClientSalesSchema,
  clientSalesSummarySchema,
  clientBalanceSchema,
} = require("./_schemas");
const createClientSaleService = require("./create-client-sale");
const listClientSalesService = require("./list-client-sales");
const updateClientSaleService = require("./update-client-sale");
const deleteClientSaleService = require("./delete-client-sale");
const summaryClientSalesService = require("./summary-client-sales");
const getClientBalanceService = require("./get-client-balance");
const { getFormattedSale } = require("./format-sale");

const createClientSale = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createClientSaleSchema);
    const result = await createClientSaleService(req.body, req.user);
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
    const result = await getClientBalanceService(req.query);
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
  getClientSales,
  getClientSale,
  getClientSalesSummary,
  getClientBalance,
  patchClientSale,
  removeClientSale,
};
