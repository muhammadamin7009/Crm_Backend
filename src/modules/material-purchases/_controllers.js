const httpValidator = require("../../shared/http-validator");
const schemas = require("./_schemas");
const s = require("./_services");

const handler = (schema, service, status = 200, source = "body") => async (req, res, next) => {
  try {
    const input = {};
    if (schema.body) input.body = req.body;
    if (schema.params) input.params = req.params;
    if (schema.query) input.query = req.query;
    httpValidator(input, schema);
    const data = source === "query" ? req.query : source === "params" ? Number(req.params.id) : req.body;
    const result = await service(data, source === "body" && req.params.id ? Number(req.params.id) : req.user, req.user);
    res.status(status).json(result);
  } catch (error) { next(error); }
};

module.exports = {
  listSuppliers: handler(schemas.listSchema, s.listSuppliers, 200, "query"),
  createSupplier: handler(schemas.createSupplierSchema, s.createSupplier, 201),
  updateSupplier: handler(schemas.updateSupplierSchema, s.updateSupplier),
  deleteSupplier: handler(schemas.idSchema, s.deleteSupplier, 200, "params"),
  listMaterials: handler(schemas.listSchema, s.listMaterials, 200, "query"),
  createMaterial: handler(schemas.createMaterialSchema, s.createMaterial, 201),
  updateMaterial: handler(schemas.updateMaterialSchema, s.updateMaterial),
  deleteMaterial: handler(schemas.idSchema, s.deleteMaterial, 200, "params"),
  listPurchases: handler(schemas.listSchema, s.listPurchases, 200, "query"),
  createPurchase: handler(schemas.createPurchaseSchema, s.createPurchase, 201),
  updatePurchase: handler(schemas.updatePurchaseSchema, s.updatePurchase),
  deletePurchase: handler(schemas.idSchema, s.deletePurchase, 200, "params"),
  supplierBalance: handler(schemas.balanceSchema, s.supplierBalance, 200, "query"),
  listSupplierPayments: handler(schemas.listSchema, s.listSupplierPayments, 200, "query"),
  createSupplierPayment: handler(schemas.createSupplierPaymentSchema, s.createSupplierPayment, 201),
};
