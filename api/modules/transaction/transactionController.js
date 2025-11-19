const logger = require('../../../utils/logger');
const Transaction = require('./transactionModel');
const User = require('../user/userModel');
const moment = require('moment');

exports.addTransaction = async (req, res) => {
  try {
    const { title, amount, description, date, category, userId, transactionType } = req.body;

    // Validate required fields
    if (!title || amount == null || !description || !date || !category || !transactionType) {
      logger.warn('addTransaction: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields',
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      logger.error('addTransaction: User not found', { userId });
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Create transaction
    const newTransaction = await Transaction.create({
      title,
      amount,
      description,
      date,
      category,
      user: userId,
      transactionType,
    });

    // Add transaction to user's transactions array
    // Use an atomic update to avoid concurrency issues
    await User.findByIdAndUpdate(
      userId,
      { $push: { transactions: newTransaction._id } },
      { new: true }
    );

    logger.info('addTransaction: Transaction added successfully');

    return res.status(201).json({
      success: true,
      message: 'Transaction added successfully',
      transaction: newTransaction, // optionally return the created transaction
    });
  } catch (err) {
    logger.error('addTransaction error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { title, amount, description, date, category, transactionType, userId } = req.body;

    // Validate required data minimally
    if (!transactionId) {
      logger.warn('updateTransaction: Missing transactionId in params');
      return res.status(400).json({ success: false, message: 'Transaction id is required' });
    }

    // Build update object only with fields provided
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (amount !== undefined) updates.amount = amount;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (category !== undefined) updates.category = category;
    if (transactionType !== undefined) updates.transactionType = transactionType;
    if (userId !== undefined) updates.user = userId;

    if (Object.keys(updates).length === 0) {
      logger.warn('updateTransaction: No updatable fields provided for transaction');
      return res.status(400).json({ success: false, message: 'No fields provided to update' });
    }

    // Optionally: verify that the user (if changed) exists
    if (updates.user) {
      const user = await User.findById(updates.user);
      if (!user) {
        logger.error(
          `updateTransaction: User not found with id ${updates.user} when updating transaction ${transactionId}`
        );
        return res.status(404).json({ success: false, message: 'User not found' });
      }
    }

    // Find and update the transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      logger.error(`updateTransaction: Transaction not found with id ${transactionId}`);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    logger.info(`updateTransaction: Transaction updated successfully ${transactionId}`, {
      updates,
      transactionId,
    });

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: updatedTransaction,
    });
  } catch (err) {
    logger.error(`updateTransaction error for transaction ${req.params.transactionId}`, err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    if (!transactionId) {
      logger.warn('deleteTransaction: No transactionId provided in params');
      return res.status(400).json({
        success: false,
        message: 'Transaction id is required',
      });
    }

    // Find the transaction to get the user reference (if needed)
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      logger.error(`deleteTransaction: Transaction not found with id ${transactionId}`);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const userId = transaction.user;

    // Delete transaction
    const deletedTransaction = await Transaction.findByIdAndDelete(transactionId);
    // (Mongoose docs: `findByIdAndDelete()` finds a document by its _id and removes it from the collection. :contentReference[oaicite:0]{index=0})

    if (!deletedTransaction) {
      // This case might be redundant since we already checked existence, but safe to keep
      logger.error(`deleteTransaction: Failed to delete transaction with id ${transactionId}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete transaction',
      });
    }

    // Remove reference from the User’s transactions array if you maintain that relationship
    await User.findByIdAndUpdate(userId, { $pull: { transactions: transactionId } });

    logger.info(`deleteTransaction: Transaction deleted successfully ${transactionId}`, {
      userId,
      transactionId,
    });

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      transaction: deletedTransaction,
    });
  } catch (err) {
    logger.error('deleteTransaction function has error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// exports.getAllTransaction = async (req, res) => {
//   try {
//     const { userId, type, frequency, startDate, endDate } = req.body;

//     // --- Validate userId ---
//     if (!userId) {
//       logger.warn('getAllTransaction: Missing userId in request body');
//       return res.status(400).json({
//         success: false,
//         message: 'User ID is required',
//       });
//     }

//     // --- Check if user exists ---
//     const user = await User.findById(userId);
//     if (!user) {
//       logger.error(`getAllTransaction: User not found with id ${userId}`);
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     // --- Build query dynamically ---
//     const query = { user: userId };

//     // Filter by transaction type (optional)
//     if (type && type !== 'all') {
//       query.transactionType = type;
//     }

//     // Filter by frequency (e.g., last X days)
//     if (frequency && frequency !== 'custom') {
//       const days = Number(frequency);
//       if (isNaN(days) || days < 0) {
//         logger.warn(`getAllTransaction: Invalid frequency "${frequency}" for user ${userId}`);
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid frequency value',
//         });
//       }
//       query.date = { $gte: moment().subtract(days, 'days').toDate() };
//     }

//     // Filter by custom date range
//     if (startDate && endDate) {
//       const start = moment(startDate).startOf('day').toDate();
//       const end = moment(endDate).endOf('day').toDate();
//       if (start > end) {
//         logger.warn(`getAllTransaction: startDate > endDate for user ${userId}`, {
//           startDate,
//           endDate,
//         });
//         return res.status(400).json({
//           success: false,
//           message: 'Start date must be earlier than end date',
//         });
//       }
//       query.date = { $gte: start, $lte: end };
//     }

//     logger.info(`getAllTransaction: Query built for user ${userId}`, { query });

//     // --- Fetch transactions ---
//     const transactions = await Transaction.find(query).sort({ date: -1 });

//     logger.info(
//       `getAllTransaction: Retrieved ${transactions.length} transactions for user ${userId}`
//     );

//     return res.status(200).json({
//       success: true,
//       transactions,
//     });
//   } catch (err) {
//     logger.error(`getAllTransaction error for user ${req.body.userId}`, err);
//     return res.status(500).json({
//       success: false,
//       message: err.message || 'Server error',
//     });
//   }
// };

exports.getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    if (!transactionId) {
      logger.warn('getTransactionById: Missing transactionId in params');
      return res.status(400).json({
        success: false,
        message: 'Transaction id is required',
      });
    }

    const transaction = await Transaction.findById(transactionId)
      .populate('user', 'name email') // optional: include user info
      .exec();

    if (!transaction) {
      logger.error(`getTransactionById: Transaction not found with id ${transactionId}`);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    logger.info(`getTransactionById: Retrieved transaction ${transactionId} successfully`, {
      transactionId,
    });

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (err) {
    logger.error(`getTransactionById error for transaction ${req.params.transactionId}`, err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

exports.getAllTransaction = async (req, res) => {
  try {
    const { userId, type, frequency, startDate, endDate } = req.body;

    if (!userId) {
      logger.warn('getAllTransaction: Missing userId in request body');
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.error(`getAllTransaction: User not found with id ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const query = { user: userId };

    if (type && type !== 'all') {
      query.transactionType = type;
    }

    if (frequency && frequency !== 'custom') {
      const days = Number(frequency);
      if (isNaN(days) || days < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid frequency value',
        });
      }
      query.date = { $gte: moment().subtract(days, 'days').toDate() };
    }

    if (startDate && endDate) {
      const start = moment(startDate).startOf('day').toDate();
      const end = moment(endDate).endOf('day').toDate();
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be earlier than end date',
        });
      }
      query.date = { $gte: start, $lte: end };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    // --------------------------
    // SINGLE FUNCTION TO SPLIT TYPES
    // --------------------------
    const splitByType = (list) => {
      const result = { expenses: [], income: [] };
      list.forEach((txn) => {
        if (txn.transactionType === 'expense') result.expenses.push(txn);
        else if (txn.transactionType === 'income') result.income.push(txn);
      });
      return result;
    };

    const { expenses, income } = splitByType(transactions);

    return res.status(200).json({
      success: true,
      transactions,
      expenses,
      income,
    });
  } catch (err) {
    logger.error(`getAllTransaction error for user ${req.body.userId}`, err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};
