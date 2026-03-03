const { customAlphabet } = require("nanoid");

const generateOrderId = () => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");

  const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
  const randomPart = nanoid();

  return `ORD-${date}-${randomPart}`;
};

module.exports = generateOrderId;
