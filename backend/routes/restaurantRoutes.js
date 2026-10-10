const express = require("express");

const {
  createRestaurant,
  getMyRestaurant,
  updateMyRestaurant,
  getPublicRestaurants,
  getPublicRestaurant,
} = require("../controllers/restaurantController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// ==========================================
// PUBLIC
// ==========================================

router.get(
  "/",
  getPublicRestaurants
);

// ==========================================
// PROTECTED — MY RESTAURANT
// ==========================================

router.get(
  "/my",
  protect,
  getMyRestaurant
);

router.post(
  "/",
  protect,
  upload.single("image"),
  createRestaurant
);

router.put(
  "/my",
  protect,
  upload.single("image"),
  updateMyRestaurant
);

// ==========================================
// PUBLIC — SINGLE RESTAURANT
// ==========================================

router.get(
  "/:id",
  getPublicRestaurant
);

module.exports = router;