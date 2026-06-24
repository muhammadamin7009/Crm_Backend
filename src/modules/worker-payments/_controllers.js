const httpValidator = require("../../shared/http-validator");
const {
  createWorkerPaymentSchema,
  updateWorkerPaymentSchema,
  showWorkerPaymentSchema,
  deleteWorkerPaymentSchema,
  listWorkerPaymentsSchema,
  workerPaymentsSummarySchema,
  workerBalanceSchema,
} = require("./_schemas");
const createWorkerPaymentService = require("./create-worker-payment");
const listWorkerPaymentsService = require("./list-worker-payments");
const showWorkerPaymentService = require("./show-worker-payment");
const updateWorkerPaymentService = require("./update-worker-payment");
const deleteWorkerPaymentService = require("./delete-worker-payment");
const summaryWorkerPaymentsService = require("./summary-worker-payments");
const getWorkerBalanceService = require("./get-worker-balance");

const createWorkerPayment = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createWorkerPaymentSchema);
    const result = await createWorkerPaymentService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getWorkerPayments = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, listWorkerPaymentsSchema);
    const result = await listWorkerPaymentsService(req.query, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getWorkerPaymentsSummary = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, workerPaymentsSummarySchema);
    const result = await summaryWorkerPaymentsService(req.query, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getWorkerBalance = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, workerBalanceSchema);
    const result = await getWorkerBalanceService(req.query, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getWorkerPayment = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, showWorkerPaymentSchema);
    const result = await showWorkerPaymentService(
      { id: Number(req.params.id) },
      req.user,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchWorkerPayment = async (req, res, next) => {
  try {
    httpValidator(
      { body: req.body, params: req.params },
      updateWorkerPaymentSchema,
    );
    const result = await updateWorkerPaymentService(req.body, {
      id: Number(req.params.id),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeWorkerPayment = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteWorkerPaymentSchema);
    const result = await deleteWorkerPaymentService({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkerPayment,
  getWorkerPayments,
  getWorkerPaymentsSummary,
  getWorkerBalance,
  getWorkerPayment,
  patchWorkerPayment,
  removeWorkerPayment,
};
