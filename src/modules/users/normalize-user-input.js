const { BadRequestError } = require("../../shared/errors");

const formatName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => {
      const lower = part.toLocaleLowerCase("uz-UZ");
      return lower ? `${lower[0].toLocaleUpperCase("uz-UZ")}${lower.slice(1)}` : "";
    })
    .join(" ");

const normalizePhone = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const phone = String(value).trim().replace(/[()\s-]/g, "");

  if (!phone) return null;

  if (!phone.startsWith("+")) {
    throw new BadRequestError("Telefon raqam + bilan boshlanishi kerak");
  }

  if (phone.startsWith("+998") && !/^\+998\d{9}$/.test(phone)) {
    throw new BadRequestError(
      "O'zbekiston raqami +998 dan keyin aynan 9 ta raqam bo'lishi kerak",
    );
  }

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new BadRequestError(
      "Telefon raqam xalqaro formatda bo'lishi kerak. Masalan: +998965001001",
    );
  }

  return phone;
};

const normalizeUserInput = (payload) => {
  const next = { ...payload };

  if (Object.prototype.hasOwnProperty.call(next, "first_name")) {
    next.first_name = formatName(next.first_name);
  }

  if (Object.prototype.hasOwnProperty.call(next, "last_name")) {
    next.last_name = formatName(next.last_name);
  }

  if (Object.prototype.hasOwnProperty.call(next, "phone")) {
    next.phone = normalizePhone(next.phone);
  }

  return next;
};

module.exports = {
  formatName,
  normalizePhone,
  normalizeUserInput,
};
