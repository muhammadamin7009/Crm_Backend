const validate = require("../../shared/http-validator");
const schemas = require("./_schemas");
const s = require("./_services");
exports.login = async (req, res, next) => {
  try {
    validate({ body: req.body }, schemas.login);
    res.json(await s.login(req.body));
  } catch (e) {
    next(e);
  }
};
exports.listCompanies = async (_req, res, next) => {
  try {
    res.json(await s.listCompanies());
  } catch (e) {
    next(e);
  }
};
exports.createCompany = async (req, res, next) => {
  try {
    validate({ body: req.body }, schemas.companyCreate);
    res.status(201).json(await s.createCompany(req.body));
  } catch (e) {
    next(e);
  }
};
exports.updateCompany = async (req, res, next) => {
  try {
    validate({ body: req.body, params: req.params }, schemas.companyUpdate);
    res.json(await s.updateCompany(req.body, Number(req.params.id)));
  } catch (e) {
    next(e);
  }
};
exports.getCompanyManagement = async (req, res, next) => {
  try {
    validate({ params: req.params }, schemas.companyManagementGet);
    res.json(await s.getCompanyManagement(Number(req.params.id)));
  } catch (e) {
    next(e);
  }
};
exports.updateCompanyManagement = async (req, res, next) => {
  try {
    validate({ body: req.body, params: req.params }, schemas.companyManagementUpdate);
    res.json(await s.updateCompanyManagement(req.body, Number(req.params.id)));
  } catch (e) {
    next(e);
  }
};
exports.resetCompanyAuthenticator = async (req, res, next) => {
  try {
    validate({ params: req.params }, schemas.companyManagementGet);
    res.json(await s.resetCompanyAuthenticator(Number(req.params.id)));
  } catch (e) {
    next(e);
  }
};
exports.deleteCompany = async (req, res, next) => {
  try {
    validate({ body: req.body, params: req.params }, schemas.companyDelete);
    res.json(await s.deleteCompany(Number(req.params.id), req.body.confirm_slug));
  } catch (e) {
    next(e);
  }
};
exports.createPayment = async (req, res, next) => {
  try {
    validate({ body: req.body }, schemas.paymentCreate);
    res.status(201).json(await s.createPayment(req.body, req.platformAdmin));
  } catch (e) {
    next(e);
  }
};
exports.listPayments = async (req, res, next) => {
  try {
    res.json(await s.listPayments(req.query.company_id));
  } catch (e) {
    next(e);
  }
};
exports.listPlans = async (_req, res, next) => {
  try {
    res.json(await s.listPlans());
  } catch (e) {
    next(e);
  }
};
