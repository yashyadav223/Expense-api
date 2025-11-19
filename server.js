'use strict';
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '.env' });

const logger = require('./utils/logger');
const dbConnect = require('./config/dbConnect');
const authRoutes = require('./api/modules/auth/authRoutes');
const userRoutes = require('./api/modules/user/userRoutes');
const transactionsRoute = require('./api/modules/transaction/transactionsRoute');

const app = express();

const port = process.env.SERVER_PORT;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Welcome to Digital Ready 1.0 API');
});

app.listen(port, () => {
  logger.info(`Server is running on port : ${port}`);
  dbConnect.dbConnection();
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/transactions', transactionsRoute);

process
  .on('unhandledRejection', (reason, p) => {
    logger.info(`${reason} Unhandled Rejection error ${p}`);
  })
  .on('uncaughtException', (err) => {
    logger.info('Uncaught Exception thrown - ', err);
    process.exit(1);
  });

module.exports = app;
