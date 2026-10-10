const express = require("express");

const {
  createTable,
  getMyTables,
  getTable,
  updateTable,
  deleteTable,
  toggleTableAvailability,
  getAvailableTables,
} = require("../controllers/tableController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// ==========================================
// PUBLIC
// ==========================================

router.get(
  "/availability",
  getAvailableTables
);

// ==========================================
// PROTECTED
// ==========================================

router.use(protect);

router.post(
  "/",
  upload.single("image"),
  createTable
);

router.get(
  "/",
  getMyTables
);

router.get(
  "/:id",
  getTable
);

router.put(
  "/:id",
  upload.single("image"),
  updateTable
);

router.delete(
  "/:id",
  deleteTable
);

router.put(
  "/:id/availability",
  toggleTableAvailability
);

module.exports = router;