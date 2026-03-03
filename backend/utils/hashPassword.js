const bcrypt = require("bcrypt");
const saltRounds = 10;

const hashPassword = async (password) => {
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

const comparePassword = async (password, hashPassword) => {
  return await bcrypt.compare(password, hashPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
