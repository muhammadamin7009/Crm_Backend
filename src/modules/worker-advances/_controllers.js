const httpValidator = require("../../shared/http-validator");
const schemas = require("./_schemas");
const createService = require("./create-worker-advance");
const listService = require("./list-worker-advances");
const balanceService = require("./get-worker-advance-balance");
const updateService = require("./update-worker-advance");
const deleteService = require("./delete-worker-advance");
const { getFormattedAdvance } = require("./format-advance");
const { isManager } = require("./helpers");
const { ForbiddenError } = require("../../shared/errors");

const createWorkerAdvance = async (req, res, next) => { try { httpValidator({ body: req.body }, schemas.createWorkerAdvanceSchema); res.status(201).json(await createService(req.body, req.user)); } catch (error) { next(error); } };
const getWorkerAdvances = async (req, res, next) => { try { httpValidator({ query: req.query }, schemas.listWorkerAdvancesSchema); res.json(await listService(req.query, req.user)); } catch (error) { next(error); } };
const getWorkerAdvanceBalance = async (req, res, next) => { try { httpValidator({ query: req.query }, schemas.workerAdvanceBalanceSchema); res.json(await balanceService(req.query, req.user)); } catch (error) { next(error); } };
const getWorkerAdvance = async (req, res, next) => { try {
  httpValidator({ params: req.params }, schemas.showWorkerAdvanceSchema);
  const advance = await getFormattedAdvance(Number(req.params.id));
  if (!isManager(req.user) && Number(advance.worker_id) !== Number(req.user?.id)) {
    throw new ForbiddenError("Boshqa ishchi avansini ko'ra olmaysiz");
  }
  res.json({ worker_advance: advance });
} catch (error) { next(error); } };
const patchWorkerAdvance = async (req, res, next) => { try { httpValidator({ body: req.body, params: req.params }, schemas.updateWorkerAdvanceSchema); res.json(await updateService(req.body, { id: Number(req.params.id) })); } catch (error) { next(error); } };
const removeWorkerAdvance = async (req, res, next) => { try { httpValidator({ params: req.params }, schemas.deleteWorkerAdvanceSchema); res.json(await deleteService({ id: Number(req.params.id) })); } catch (error) { next(error); } };

module.exports = { createWorkerAdvance, getWorkerAdvances, getWorkerAdvanceBalance, getWorkerAdvance, patchWorkerAdvance, removeWorkerAdvance };
