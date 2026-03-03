const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
const getDatePart = () => {
  return new Date().toISOString().slice(2, 10).replace(/-/g, "");
};

const generateOrderId = () => {
  return `ORD-${getDatePart()}-${nanoid()}`;
};

const generateProductId = () => {
  return `PROD-${getDatePart()}-${nanoid()}`;
};

module.exports = {
  generateOrderId,
  generateProductId,
};
