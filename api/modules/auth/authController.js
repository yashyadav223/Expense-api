const JWT = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const logger = require('../../../utils/logger');
const User = require('../user/userModel');
const accessToken = require('../../../config/generateToken');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Check required fields
    if (!email || !password) {
      logger.warn('login: Missing email or password', { email });
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // 2) Find user by email and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.warn('login: Invalid credentials - user not found', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 3) Check if password is correct
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      logger.warn('login: Invalid credentials - wrong password', { userId: user._id });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 4) Create token
    if (!process.env.ACCESS_TOKEN_SECRET) {
      logger.error('login: ACCESS_TOKEN_SECRET not defined in environment');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    const token = await accessToken.generateSignToken(user._id.toString());

    // 5) Remove password before sending response
    user.password = undefined;

    logger.info('login: Login successful', { userId: user._id });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user,
      token,
    });
  } catch (err) {
    logger.error('login error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Something went wrong during login, please try again later.',
    });
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const dbUser = await User.findOne({ email });
    if (!dbUser) {
      logger.error('forgetPassword function has error - user not found', email);
      return res.status(404).json({ message: `User not found with this email ${email}` });
    }

    const getToken = await accessToken.generateSignToken(dbUser._doc._id.toString());

    const link = `${process.env.CLIENT_RESET_URL}/api/auth/reset-password/${dbUser._id}/${getToken}`;

    logger.info('forgetPassword function is executed successfully');
    return res.status(200).json({ resetPasswordLink: link });
  } catch (err) {
    logger.error('forgetPassword function has error', err);
    return res
      .status(err.status || 500)
      .json({ message: err.message || 'Something went wrong, please try again' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { id, token } = req.params;
    const { password, confirmPassword } = req.body;

    // 1. Validate input
    if (!id || !token) {
      logger.warn('resetPassword: Missing id or token in params', { id, token });
      return res.status(400).json({ success: false, message: 'User ID and token are required' });
    }
    if (!password || !confirmPassword) {
      logger.warn('resetPassword: Missing password or confirmPassword for userId', { id });
      return res
        .status(400)
        .json({ success: false, message: 'Password and confirm password are required' });
    }
    if (password !== confirmPassword) {
      logger.warn('resetPassword: Passwords do not match for userId', { id });
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // 2. Find user
    const user = await User.findById(id).select('+password');
    if (!user) {
      logger.error('resetPassword: User not found', { userId: id });
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 3. Verify token
    let decoded;
    try {
      decoded = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      logger.error('resetPassword: Invalid or expired token', { userId: id, error: err });
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    if (decoded.aud !== id) {
      logger.error('resetPassword: Token userId mismatch', {
        tokenUserId: decoded.aud,
        requestUserId: id,
      });
      return res.status(400).json({ success: false, message: 'Invalid token for this user' });
    }

    // 4. Hash new password and update
    const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
    const hashedPW = await bcrypt.hash(password, saltRounds);

    user.password = hashedPW;
    await user.save();

    logger.info('resetPassword: Password updated successfully', { userId: id });
    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    logger.error('resetPassword error:', err);
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message || 'Something went wrong, please try again' });
  }
};
