const httpValidator = require("../../shared/http-validator");
const {
  createWorkerOutputSchema,
  createBulkWorkerOutputsSchema,
  updateWorkerOutputSchema,
  showWorkerOutputSchema,
  deleteWorkerOutputSchema,
  listWorkerOutputsSchema,
  workerOutputsSummarySchema,
} = require("./_schemas");
const createWorkerOutputService = require("./create-worker-output");
const createBulkWorkerOutputsService = require("./create-bulk-worker-outputs");
const listWorkerOutputsService = require("./list-worker-outputs");
const showWorkerOutputService = require("./show-worker-output");
const updateWorkerOutputService = require("./update-worker-output");
const deleteWorkerOutputService = require("./delete-worker-output");
const summaryWorkerOutputsService = require("./summary-worker-outputs");

const createWorkerOutput = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createWorkerOutputSchema);
    const result = await createWorkerOutputService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const createBulkWorkerOutputs = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createBulkWorkerOutputsSchema);
    const result = await createBulkWorkerOutputsService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getWorkerOutputs = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, listWorkerOutputsSchema);
    const result = await listWorkerOutputsService(req.query, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getWorkerOutputsSummary = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, workerOutputsSummarySchema);
    const result = await summaryWorkerOutputsService(req.query, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getWorkerOutput = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, showWorkerOutputSchema);
    const result = await showWorkerOutputService(
      { id: Number(req.params.id) },
      req.user,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchWorkerOutput = async (req, res, next) => {
  try {
    httpValidator(
      { body: req.body, params: req.params },
      updateWorkerOutputSchema,
    );
    const result = await updateWorkerOutputService(req.body, {
      id: Number(req.params.id),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeWorkerOutput = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteWorkerOutputSchema);
    const result = await deleteWorkerOutputService({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkerOutput,
  createBulkWorkerOutputs,
  getWorkerOutputs,
  getWorkerOutputsSummary,
  getWorkerOutput,
  patchWorkerOutput,
  removeWorkerOutput,
};
