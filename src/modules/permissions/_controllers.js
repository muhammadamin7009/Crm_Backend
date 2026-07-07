const httpValidator = require("../../shared/http-validator");
const { updateUserPermissionsSchema } = require("./_schemas");
const service = require("./_services");

const listPermissions = async (_req, res, next) => {
  try {
    res.status(200).json(await service.listPermissionSettings());
  } catch (error) {
    next(error);
  }
};

const getUserPermissions = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, { params: updateUserPermissionsSchema.params });
    res.status(200).json(await service.getUserPermissionSettings(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
};

const updateUserPermissions = async (req, res, next) => {
  try {
    httpValidator({ params: req.params, body: req.body }, updateUserPermissionsSchema);
    res.status(200).json(
      await service.updateUserPermissions(Number(req.params.id), req.body.permissions, req.user),
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPermissions,
  getUserPermissions,
  updateUserPermissions,
};
