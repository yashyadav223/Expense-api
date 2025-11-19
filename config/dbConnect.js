const mongoose = require("mongoose");
const logger = require("../utils/logger");

const dbUrl = process.env.DB_URI;

const dbConnection = async () => {
  mongoose
    .connect(dbUrl, {})
    .then(() => {
      logger.info("Database connected successfully");
      return "Connection established successfully";
    })
    .catch((err) => {
      logger.error("Could not connect with database, Exiting now ...", err);
      process.exit(1);
    });
};

module.exports = { dbConnection };