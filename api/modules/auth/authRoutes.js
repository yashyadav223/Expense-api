const express = require('express');
const router = express.Router();
const authController = require('./authController');

router.post('/login', authController.login);
router.post('/forget-password', authController.forgetPassword);
router.post('/reset-password/:id/:token', authController.resetPassword);

module.exports = router;
