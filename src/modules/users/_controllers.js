const express = require("express");
const httpValidator = require("../../shared/http-validator");
const {
  showUserSchema,
  getUsersSchema,
  loginUserSchema,
  verifyLoginSchema,
  postUserSchema,
  postUserByAdminSchema,
  postUserByStaffSchema,
  patchUserSchema,
  patchMeSchema,
  deleteUserSchema,
} = require("./_schemas");
const listUsers = require("./list-users");
const showUser = require("./show-user");
const login = require("./login-user");
const registration = require("./post-user");
const editUser = require("./edit-user");
const removeUser = require("./delete-user");
const createByAdmin = require("./post-user-by-admin");
const createByStaff = require("./post-user-by-staff");
const getMeService = require("./get-me");
const updateUserImage = require("./update-user-image");
const {
  restoreUser: restoreDeletedUser,
  permanentlyDeleteUser: permanentlyRemoveDeletedUser,
} = require("./deleted-user-actions");

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const loginUser = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, loginUserSchema);

    const result = await login(req.body, req.company, {
      device_id: req.headers["x-device-id"],
      user_agent: req.headers["user-agent"],
      ip_address: req.ip,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const verifyLogin = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, verifyLoginSchema);
    res.status(200).json(await login.verify(req.body, req.company));
  } catch (error) {
    next(error);
  }
};

const sessionsService = require("./user-sessions");
const getSessions = async (req, res, next) => {
  try {
    res.json(await sessionsService.listSessions(req.user));
  } catch (error) {
    next(error);
  }
};
const removeSession = async (req, res, next) => {
  try {
    res.json(await sessionsService.revokeSession(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
};
const removeOtherSessions = async (req, res, next) => {
  try {
    res.json(await sessionsService.revokeOtherSessions(req.user));
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const postUserByAdmin = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, postUserByAdminSchema);

    const result = await createByAdmin(req.body);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const postUserByStaff = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, postUserByStaffSchema);

    const result = await createByStaff(req.body, req.user);

    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const postUser = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, postUserSchema);

    const result = await registration(req.body, req.company);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const patchUser = async (req, res, next) => {
  try {
    httpValidator({ body: req.body, params: req.params }, patchUserSchema);

    const params = { ...req.params, id: Number(req.params.id) };
    const result = await editUser(req.body, params, req.user);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const patchMe = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, patchMeSchema);

    // req.user isLoggedIn middleware’dan keladi
    const result = await editUser(req.body, { id: req.user.id }, req.user);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchUserImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Rasm yuklanmadi" });
    }

    const user_image = `/uploads/${req.file.filename}`;

    const result = await updateUserImage({
      id: req.user.id,
      user_image,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const getUsers = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, getUsersSchema);

    const result = await listUsers(req.query, req.user);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const getMe = async (req, res, next) => {
  try {
    // isLoggedIn middleware req.user ni beradi
    const result = await getMeService(req.user);

    res.status(200).json(result.me);
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const getUser = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, showUserSchema);

    const result = await showUser({ id: req.params.id });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const deleteUser = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteUserSchema);

    const result = await removeUser({ id: req.params.id });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const restoreUser = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteUserSchema);
    const result = await restoreDeletedUser({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const permanentlyDeleteUser = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteUserSchema);
    const result = await permanentlyRemoveDeletedUser({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginUser,
  verifyLogin,
  getSessions,
  removeSession,
  removeOtherSessions,
  postUser,
  patchUser,
  patchMe,
  patchUserImage,
  getMe,
  getUser,
  getUsers,
  deleteUser,
  restoreUser,
  permanentlyDeleteUser,
  postUserByAdmin,
  postUserByStaff,
};
