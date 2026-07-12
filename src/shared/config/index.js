require("dotenv/config");

module.exports = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  sms: {
    provider: process.env.SMS_PROVIDER || "console",
    testPhone: process.env.SMS_TEST_PHONE || "",
    eskiz: {
      baseUrl: process.env.ESKIZ_BASE_URL || "https://notify.eskiz.uz/api",
      token: process.env.ESKIZ_TOKEN || "",
      email: process.env.ESKIZ_EMAIL || "",
      password: process.env.ESKIZ_PASSWORD || "",
      from: process.env.ESKIZ_FROM || "4546",
    },
  },
};
