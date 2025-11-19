const JWT = require("jsonwebtoken");
const logger = require("../utils/logger");

exports.generateSignToken = async (id) => {
  const payload = {};
  const option = {
    expiresIn: "59m",
    issuer: "Admin",
    audience: id,
  };

  try {
    const token = await JWT.sign(
      payload,
      process.env.ACCESS_TOKEN_SECRET,
      option
    );
    logger.info("generateSignToken function is executed successfully for user");
    return token;
  } catch (err) {
    logger.info("generateSignToken function has error", err);
  }
};
