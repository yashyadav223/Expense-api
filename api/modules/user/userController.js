const logger = require("../../../utils/logger");
const User = require("./userModel");
const tokenGenerator = require("../../../config/generateToken");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.error("create function has error - user already exist", email);
      return res
        .status(400)
        .json({ message: "User already exists", statusCode: 400 });
    }

    const newUser = new User({ name, email, password });
    const savedUser = await newUser.save();

    const token = await tokenGenerator.generateSignToken(
      savedUser._id.toString()
    );

    if (!token) {
      logger.error("Token generation failed for user", savedUser._id);
      return res.status(500).json({ message: "Token generation failed" });
    }

    logger.info("User registered successfully", savedUser._id);
    res.status(201).json({
      message: "User registered successfully",
      user: savedUser.toObject(),
      token: token,
    });
  } catch (err) {
    logger.error("Error registering user:", err);
    res.status(500).json({ message: err.message, statusCode: 500 });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id; // or however you identify the user (e.g. from req.user.id)
    const updates = { ...req.body };

    // Prevent password updating via this route
    if ("password" in updates) {
      delete updates.password;
      logger.warn(`Attempt to update password was ignored for user ${userId}`);
      return res.status(400).json({
        statusCode: 400,
        message: "Password cannot be updated via this route",
      });
    }

    // Optionally: prevent updating email too, if that has special flow
    if ("email" in updates) {
      delete updates.email;
      logger.warn(`Attempt to update email was ignored for user ${userId}`);
      return res.status(400).json({
        statusCode: 400,
        message: "Email cannot be updated via this route",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password"); // exclude password hash from returned user

    if (!updatedUser) {
      logger.error(`updateUser: user not found with id ${userId}`);
      return res
        .status(404)
        .json({ message: "User not found", statusCode: 404 });
    }

    logger.info(`User updated successfully: ${userId}`);
    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser.toObject(),
    });
  } catch (err) {
    logger.error(`updateUser error for user ${req.params.id}`, err);
    return res.status(500).json({ message: err.message, statusCode: 500 });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (!req?.params?.id) {
      logger.error("deleteUser: User ID parameter is missing");
      return res
        .status(400)
        .json({ message: "User ID is required", statusCode: 400 });
    }

    const userId = req.params.id;

    const checkUserExists = await User.findById(userId);
    if (!checkUserExists) {
      logger.error(`deleteUser: User not found with id ${userId}`);
      return res
        .status(404)
        .json({ message: "User not found", statusCode: 404 });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      logger.error(`deleteUser: User not found with id ${userId}`);
      return res
        .status(404)
        .json({ message: "User not found", statusCode: 404 });
    }

    logger.info(`User deleted successfully: ${userId}`);
    return res.status(200).json({
      message: "User deleted successfully",
      user: deletedUser.toObject(),
    });
  } catch (err) {
    logger.error(`deleteUser error for user ${req.params.id}`, err);
    return res.status(500).json({ message: err.message, statusCode: 500 });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    if (users.length > 0) {
      logger.info("getAllUsers function has executed successfully");
      return res.status(200).json({
        message: "Users retrieved successfully",
        users: users.map((user) => user.toObject()),
      });
    } else {
      logger.warn("getAllUsers: No users found in the database");
      return res.status(404).json({
        message: "No users found",
        statusCode: 404,
      });
    }
  } catch (err) {
    logger.error("getAllUsers error:", err);
    return res.status(500).json({ message: err.message, statusCode: 500 });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      logger.error(`getUserById: User not found with id ${userId}`);
      return res
        .status(404)
        .json({ message: "User not found", statusCode: 404 });
    }

    logger.info(`User retrieved successfully: ${userId}`);
    return res.status(200).json({
      message: "User retrieved successfully",
      user: user.toObject(),
    });
  } catch (err) {
    logger.error(`getUserById error for user ${req.params.id}`, err);
    return res.status(500).json({ message: err.message, statusCode: 500 });
  }
};

exports.getUsersByPeriod = async (req, res) => {
  try {
    const { filter } = req.query;
    if (!["day", "week", "month", "year"].includes(filter)) {
      logger.error(`getUsersByPeriod: invalid filter param "${filter}"`);
      return res
        .status(400)
        .json({ message: "Invalid filter parameter", statusCode: 400 });
    }

    const now = new Date();
    let matchDate;

    switch (filter) {
      case "day":
        // start of today
        matchDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        // assuming week starts on Sunday; get last Sunday
        const dayOfWeek = now.getDay(); // 0 = Sunday
        matchDate = new Date(now);
        matchDate.setHours(0, 0, 0, 0);
        matchDate.setDate(now.getDate() - dayOfWeek);
        break;
      case "month":
        matchDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        matchDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const users = await User.find({ createdAt: { $gte: matchDate } }).select(
      "-password"
    );

    logger.info(`getUsersByPeriod succeeded for filter "${filter}", count: ${users.length}`);
    return res.status(200).json({
      message: `Users created since ${filter} retrieved`,
      users: users.map((u) => u.toObject()),
    });
  } catch (err) {
    logger.error(`getUsersByPeriod error for filter ${req.query.filter}`, err);
    return res.status(500).json({ message: err.message, statusCode: 500 });
  }
};
