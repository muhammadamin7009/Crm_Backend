const { BadRequestError } = require("../../shared/errors");

const roundMoney = (value) => Math.round(Number(value));

const parseDate = (value, label) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) throw new BadRequestError(`${label} noto'g'ri`);
  const parts = match.slice(1).map(Number);
  const [year, month, day] = parts;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  )
    throw new BadRequestError(`${label} noto'g'ri`);
  return { year, month, day, utc };
};

const normalizedDay = ({ year, month, day }) => {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day === lastDay ? 30 : Math.min(day, 30);
};

const standardBillingDays = (fromValue, toValue) => {
  const from = parseDate(fromValue, "Boshlanish sanasi");
  const to = parseDate(toValue, "Tugash sanasi");
  if (to.utc < from.utc) throw new BadRequestError("Tugash sanasi boshlanish sanasidan oldin");
  const days =
    (to.year - from.year) * 360 +
    (to.month - from.month) * 30 +
    normalizedDay(to) -
    normalizedDay(from) +
    1;
  if (days < 1) throw new BadRequestError("Hisob davri kamida bir kun bo'lishi kerak");
  return days;
};

const calculateSubscriptionPayment = ({
  monthlyPrice,
  periodFrom,
  periodTo,
  discountType = "none",
  discountValue = 0,
  discountReason,
}) => {
  const price = Number(monthlyPrice);
  if (!Number.isFinite(price) || price < 0) throw new BadRequestError("Tarif narxi noto'g'ri");
  const billingDays = standardBillingDays(periodFrom, periodTo);
  const grossAmount = roundMoney((price * billingDays) / 30);
  const value = Number(discountValue || 0);
  if (!Number.isFinite(value) || value < 0) throw new BadRequestError("Chegirma noto'g'ri");
  if (!["none", "fixed", "percent"].includes(discountType))
    throw new BadRequestError("Chegirma turi noto'g'ri");
  if (discountType === "percent" && value > 100)
    throw new BadRequestError("Foizli chegirma 100% dan oshmasin");
  const discountAmount = roundMoney(
    discountType === "fixed" ? value : discountType === "percent" ? (grossAmount * value) / 100 : 0,
  );
  if (discountAmount > grossAmount)
    throw new BadRequestError("Chegirma hisoblangan summadan oshmasin");
  if (discountAmount > 0 && !String(discountReason || "").trim())
    throw new BadRequestError("Chegirma sababini kiriting");
  return {
    billing_days: billingDays,
    gross_amount: grossAmount,
    discount_type: discountType,
    discount_value: discountType === "none" ? 0 : value,
    discount_amount: discountAmount,
    amount: roundMoney(grossAmount - discountAmount),
  };
};

module.exports = { standardBillingDays, calculateSubscriptionPayment };

