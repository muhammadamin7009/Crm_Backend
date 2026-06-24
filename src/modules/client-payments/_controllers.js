const httpValidator = require("../../shared/http-validator");
const {
  createClientPaymentSchema,
  updateClientPaymentSchema,
  showClientPaymentSchema,
  deleteClientPaymentSchema,
  listClientPaymentsSchema,
  clientPaymentsSummarySchema,
} = require("./_schemas");
const createClientPaymentService = require("./create-client-payment");
const listClientPaymentsService = require("./list-client-payments");
const updateClientPaymentService = require("./update-client-payment");
const deleteClientPaymentService = require("./delete-client-payment");
const summaryClientPaymentsService = require("./summary-client-payments");
const { getFormattedPayment } = require("./format-payment");

const createClientPayment = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createClientPaymentSchema);
    const result = await createClientPaymentService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getClientPayments = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, listClientPaymentsSchema);
    const result = await listClientPaymentsService(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getClientPayment = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, showClientPaymentSchema);
    const payment = await getFormattedPayment(Number(req.params.id));
    res.status(200).json({ client_payment: payment });
  } catch (error) {
    next(error);
  }
};

const getClientPaymentsSummary = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, clientPaymentsSummarySchema);
    const result = await summaryClientPaymentsService(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchClientPayment = async (req, res, next) => {
  try {
    httpValidator({ body: req.body, params: req.params }, updateClientPaymentSchema);
    const result = await updateClientPaymentService(req.body, {
      id: Number(req.params.id),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeClientPayment = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteClientPaymentSchema);
    const result = await deleteClientPaymentService({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClientPayment,
  getClientPayments,
  getClientPayment,
  getClientPaymentsSummary,
  patchClientPayment,
  removeClientPayment,
};
