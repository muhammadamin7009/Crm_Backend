const config = require("../config");
const { BadRequestError } = require("../errors");

let cachedEskizToken = config.sms.eskiz.token || "";

const normalizePhone = (phone) => String(phone || "").replace(/\D/g, "");

const getSmsDestination = (phone) => {
  if (config.env !== "production" && config.sms.testPhone) return config.sms.testPhone;
  return phone;
};

const requestEskiz = async (path, { token, body }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${config.sms.eskiz.baseUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

const getEskizToken = async () => {
  if (cachedEskizToken) return cachedEskizToken;
  if (!config.sms.eskiz.email || !config.sms.eskiz.password) {
    throw new Error("ESKIZ_TOKEN yoki ESKIZ_EMAIL/ESKIZ_PASSWORD kiritilmagan");
  }
  const payload = await requestEskiz("/auth/login", {
    body: { email: config.sms.eskiz.email, password: config.sms.eskiz.password },
  });
  cachedEskizToken = payload.data?.token || payload.token || "";
  if (!cachedEskizToken) throw new Error("Eskiz token qaytarmadi");
  return cachedEskizToken;
};

const sendWithEskiz = async ({ phone, message }) => {
  const token = await getEskizToken();
  return requestEskiz("/message/sms/send", {
    token,
    body: {
      mobile_phone: normalizePhone(phone),
      message,
      from: config.sms.eskiz.from,
    },
  });
};

const sendSms = async ({ phone, message }) => {
  const destination = getSmsDestination(phone);
  if (!/^\+?[1-9]\d{7,14}$/.test(String(destination || ""))) {
    throw new BadRequestError("SMS qabul qiluvchi telefon raqami noto'g'ri");
  }

  if (config.sms.provider === "console" && config.env !== "production") {
    console.log(`[DEV SMS] ${destination}: ${message}`);
    return { phone: destination, provider: "console" };
  }
  if (config.sms.provider === "eskiz") {
    try {
      const result = await sendWithEskiz({ phone: destination, message });
      return { phone: destination, provider: "eskiz", result };
    } catch (error) {
      console.error("Eskiz SMS xatosi:", error.message);
      throw new BadRequestError("SMS yuborilmadi. SMS provayder sozlamalarini tekshiring");
    }
  }
  throw new BadRequestError("SMS provayder sozlanmagan. Administrator bilan bog'laning");
};

module.exports = { sendSms, getSmsDestination };
