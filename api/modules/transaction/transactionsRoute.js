const express = require('express');
const router = express.Router();
const transactionController = require('./transactionController');

router.post('/create', transactionController.addTransaction);
router.put('/update/:transactionId', transactionController.updateTransaction);
router.delete('/delete/:transactionId', transactionController.deleteTransaction);
router.get('/get/:transactionId', transactionController.getTransactionById);
router.post('/getAll', transactionController.getAllTransaction);

module.exports = router;