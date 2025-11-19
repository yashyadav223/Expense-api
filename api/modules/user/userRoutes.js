const express = require("express");
const router = express.Router();
const userController = require("./userController");

router.post("/register", userController.register);
router.patch("/update/:id", userController.updateUser);
router.delete("/delete/:id", userController.deleteUser);
router.get("/profile/:id", userController.getUserById);
router.get("/list", userController.getAllUsers);
router.get("/filter-by-period", userController.getUsersByPeriod);

module.exports = router;
