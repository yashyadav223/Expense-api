// app.js or index.js
const winston = require('winston');

// Step 1: Create logger
const logger = winston.createLogger({
  level: 'info', // default logging level
  format: winston.format.combine(
    winston.format.colorize(), // adds color to levels (info, warn, error)
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] - [${level}] : ${message}`;
    })
  ),
  transports: [
    // Logs will go to the console
    new winston.transports.Console(),

    // Logs will also be written to files
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

module.exports = logger;