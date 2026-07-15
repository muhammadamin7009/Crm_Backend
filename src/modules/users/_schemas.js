const Joi = require("joi");

const ROLE_ENUM = ["super_admin", "admin", "client", "customer", "worker"];

const PHONE_MESSAGE = "Telefon raqam xalqaro formatda bo'lishi kerak. Masalan: +998965001001";

const normalizePhone = (value) =>
  String(value || "")
    .trim()
    .replace(/[()\s-]/g, "");

const phoneSchema = Joi.string()
  .trim()
  .max(30)
  .allow(null, "")
  .custom((value, helpers) => {
    if (value === null || value === "") return value;

    const phone = normalizePhone(value);

    if (!phone.startsWith("+")) {
      return helpers.message("Telefon raqam + bilan boshlanishi kerak");
    }

    if (phone.startsWith("+998") && !/^\+998\d{9}$/.test(phone)) {
      return helpers.message("O'zbekiston raqami +998 dan keyin aynan 9 ta raqam bo'lishi kerak");
    }

    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      return helpers.message(PHONE_MESSAGE);
    }

    return phone;
  });

const nameSchema = Joi.string().trim().max(50);

// umumiy: id majburiy bo'lsin
const idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

exports.loginUserSchema = {
  body: Joi.object({
    username: Joi.string().required().max(30),
    password: Joi.string().required(),
    device_id: Joi.string().max(100).optional(),
  }),
};
exports.verifyLoginSchema = {
  body: Joi.object({
    challenge_id: Joi.string().guid({ version: "uuidv4" }).required(),
    code: Joi.string()
      .pattern(/^(?:\d{6}|[A-Z2-9]{4}-[A-Z2-9]{4})$/i)
      .required(),
  }),
};

exports.postUserSchema = {
  body: Joi.object({
    first_name: nameSchema.required(),
    last_name: nameSchema.required(),
    username: Joi.string().required().max(30),
    password: Joi.string().required().min(6).max(100),
    phone: phoneSchema,
    user_image: Joi.string().uri().optional().allow(null, ""),
  }),
};

exports.postUserByAdminSchema = {
  body: Joi.object({
    first_name: nameSchema.required(),
    last_name: nameSchema.required(),
    username: Joi.string().required().max(30),
    password: Joi.string().required().min(6).max(100),
    phone: phoneSchema,
    user_image: Joi.string().uri().optional().allow(null, ""),
    role: Joi.string().valid("admin", "client", "customer", "worker").required(),
    permission_preset: Joi.when("role", {
      is: "admin",
      then: Joi.string().valid("sales_admin", "production_admin", "accountant", "materials_admin"),
      otherwise: Joi.forbidden(),
    }),
  }),
};

exports.postUserByStaffSchema = {
  body: Joi.object({
    first_name: nameSchema.required(),
    last_name: nameSchema.required(),
    username: Joi.string().required().max(30),
    password: Joi.string().required().min(6).max(100),
    phone: phoneSchema,
    user_image: Joi.string().uri().optional().allow(null, ""),
    role: Joi.string().valid("client", "customer", "worker").default("customer"),
  }),
};

exports.patchUserSchema = {
  body: Joi.object({
    first_name: nameSchema,
    last_name: nameSchema,
    username: Joi.string().max(30),
    password: Joi.string().min(6).max(100),
    phone: phoneSchema,
    role: Joi.string().valid(...ROLE_ENUM),
  }).min(1), // kamida bitta field bo'lishi shart
  params: idParams,
};

exports.patchMeSchema = {
  body: Joi.object({
    first_name: nameSchema,
    last_name: nameSchema,
    username: Joi.string().max(30),
    user_image: Joi.string().uri().optional().allow(null, ""),
    password: Joi.string().min(6).max(100),
    phone: phoneSchema,
    // role YO'Q (self editda ruxsat bermaymiz)
  }).min(1),
};

exports.showUserSchema = {
  params: idParams,
};

exports.getUsersSchema = {
  query: Joi.object({
    q: Joi.string().allow(""),
    role: Joi.string()
      .valid(...ROLE_ENUM)
      .allow(""),
    is_deleted: Joi.boolean().default(false),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    sort_by: Joi.string().valid("updated_at", "created_at").default("created_at"),
    sort_order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

exports.deleteUserSchema = {
  params: idParams,
};

exports.updateUserImage = Joi.object({
  user_image: Joi.string().uri().required(),
});
