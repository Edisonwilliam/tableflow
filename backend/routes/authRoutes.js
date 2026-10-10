const express = require("express");
const {
  register,
  login,
  googleLogin,
  prepareGoogleRegistration,
  completeGoogleRegistration,
  getMe,
} = require("../controllers/authController.js");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.post("/google/login", googleLogin);
router.post("/google/register/prepare", prepareGoogleRegistration);
router.post("/google/register/complete", completeGoogleRegistration);

router.get("/me", protect, getMe);

module.exports = router;