const express = require("express");

const {
  createReservation,
  getMyReservations,
  getMyReservation,
  cancelMyReservation,
  getRestaurantReservations,
  updateReservationStatus,
} = require("../controllers/reservationController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// All reservation routes require authentication
router.use(protect);

// =========================
// CUSTOMER ROUTES
// =========================

// Create a reservation
router.post("/", createReservation);

// Get my reservations
router.get("/my", getMyReservations);

// Get one of my reservations
router.get("/my/:id", getMyReservation);

// Cancel one of my reservations
router.put("/my/:id/cancel", cancelMyReservation);

// =========================
// RESTAURANT OWNER ROUTES
// =========================

// Get reservations belonging to my restaurant
router.get("/restaurant", getRestaurantReservations);

// Update reservation status
router.put(
  "/restaurant/:id/status",
  updateReservationStatus
);

module.exports = router;