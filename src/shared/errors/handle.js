const express = require("express");
const multer = require("multer");
const { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } = require("./index");

/**
 *
 * @param {Error} err
 * @param {express.Request } req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
module.exports = (err, req, res, next) => {
  let status = 500;
  let message = "Serverda ichki xatolik yuz berdi";

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Rasm hajmi 5 MB dan oshmasligi kerak" : err.message;
  } else if (err instanceof BadRequestError) {
    status = 400;
    message = err.message;
  } else if (err instanceof UnauthorizedError) {
    status = 401;
    message = err.message;
  } else if (err instanceof ForbiddenError) {
    status = 403;
    message = err.message;
  } else if (err instanceof NotFoundError) {
    status = 404;
    message = err.message;
  }

  if (status === 500 && process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  res.status(status).json({ message });
};
