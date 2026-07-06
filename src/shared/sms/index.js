const config = require("../config");
const { BadRequestError } = require("../errors");

const sendSms = async ({ phone, message }) => {
  if (config.sms.provider === "console" && config.env !== "production") {
    console.log(`[DEV SMS] ${phone}: ${message}`);
    return;
  }
  throw new BadRequestError("SMS provayder sozlanmagan. Administrator bilan bog'laning");
};

module.exports = { sendSms };
