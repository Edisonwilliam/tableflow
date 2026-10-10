const express = require("express");

const {
  createMenuItem,
  getMyMenu,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getPublicRestaurantMenu,
} = require("../controllers/menuController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// ==========================================
// PUBLIC
// ==========================================

router.get(
  "/restaurant/:restaurantId",
  getPublicRestaurantMenu
);

// ==========================================
// PROTECTED
// ==========================================

router.use(protect);

router.post(
  "/",
  upload.single("image"),
  createMenuItem
);

router.get(
  "/",
  getMyMenu
);

router.get(
  "/:id",
  getMenuItem
);

router.put(
  "/:id",
  upload.single("image"),
  updateMenuItem
);

router.delete(
  "/:id",
  deleteMenuItem
);

router.put(
  "/:id/availability",
  toggleMenuItemAvailability
);

module.exports = router;