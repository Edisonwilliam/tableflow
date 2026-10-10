const mongoose = require("mongoose");

const Reservation = require("../models/Reservation");
const Restaurant = require("../models/Restaurant");
const Table = require("../models/Table");
const MenuItem = require("../models/MenuItem");

// =========================
// HELPER: CONVERT TIME TO MINUTES
// =========================

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

// =========================
// HELPER: VALIDATE TIME FORMAT
// =========================

const isValidTime = (time) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
};

// =========================
// HELPER: VALIDATE DATE
// =========================

const createReservationDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const reservationDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(reservationDate.getTime())) {
    return null;
  }

  reservationDate.setHours(0, 0, 0, 0);

  return reservationDate;
};

// =========================
// CREATE RESERVATION
// =========================

const createReservation = async (req, res) => {
  try {
    const {
      restaurantId,
      tableId,
      date,
      startTime,
      endTime,
      guests,
      notes,
      preOrder,
    } = req.body;

    // -------------------------
    // BASIC VALIDATION
    // -------------------------

    if (
      !restaurantId ||
      !tableId ||
      !date ||
      !startTime ||
      !endTime ||
      guests === undefined
    ) {
      return res.status(400).json({
        message:
          "Restaurant, table, date, start time, end time and guests are required.",
      });
    }

    // -------------------------
    // VALIDATE OBJECT IDS
    // -------------------------

    if (
      !mongoose.Types.ObjectId.isValid(restaurantId) ||
      !mongoose.Types.ObjectId.isValid(tableId)
    ) {
      return res.status(400).json({
        message: "Invalid restaurant or table ID.",
      });
    }

    // -------------------------
    // VALIDATE GUESTS
    // -------------------------

    const numericGuests = Number(guests);

    if (
      !Number.isInteger(numericGuests) ||
      numericGuests < 1 ||
      numericGuests > 50
    ) {
      return res.status(400).json({
        message: "Guests must be a whole number between 1 and 50.",
      });
    }

    // -------------------------
    // VALIDATE TIME FORMAT
    // -------------------------

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return res.status(400).json({
        message: "Invalid start or end time.",
      });
    }

    // -------------------------
    // VALIDATE TIME RANGE
    // -------------------------

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      return res.status(400).json({
        message: "End time must be later than start time.",
      });
    }

    // -------------------------
    // NORMALIZE DATE
    // -------------------------

    const reservationDate = createReservationDate(date);

    if (!reservationDate) {
      return res.status(400).json({
        message: "Invalid reservation date.",
      });
    }

    // -------------------------
    // FIND RESTAURANT
    // -------------------------

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({
        message: "Restaurant not found or is currently inactive.",
      });
    }

    // -------------------------
    // FIND TABLE
    // -------------------------

    const table = await Table.findOne({
      _id: tableId,
      restaurant: restaurant._id,
      isAvailable: true,
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found or is currently unavailable.",
      });
    }

    // -------------------------
    // CHECK TABLE CAPACITY
    // -------------------------

    if (numericGuests > table.capacity) {
      return res.status(400).json({
        message: `This table can only accommodate ${table.capacity} guests.`,
      });
    }

    // =====================================================
    // VALIDATE PRE-ORDER
    // =====================================================

    let preOrderSnapshot = [];

    if (preOrder !== undefined && preOrder !== null) {
      if (!Array.isArray(preOrder)) {
        return res.status(400).json({
          message: "Pre-order must be an array.",
        });
      }

      // Empty pre-order is valid
      if (preOrder.length > 0) {
        // -------------------------
        // MERGE DUPLICATE ITEMS
        // -------------------------

        const quantities = new Map();

        for (const entry of preOrder) {
          if (!entry || !entry.menuItem) {
            return res.status(400).json({
              message: "Each pre-order item must have a menu item.",
            });
          }

          if (
            !mongoose.Types.ObjectId.isValid(
              entry.menuItem
            )
          ) {
            return res.status(400).json({
              message: "Invalid menu item ID in pre-order.",
            });
          }

          const quantity = Number(entry.quantity);

          if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 50
          ) {
            return res.status(400).json({
              message:
                "Each pre-order quantity must be a whole number between 1 and 50.",
            });
          }

          const menuItemId = entry.menuItem.toString();

          quantities.set(
            menuItemId,
            (quantities.get(menuItemId) || 0) + quantity
          );
        }

        // -------------------------
        // CHECK TOTAL QUANTITY
        // -------------------------

        for (const quantity of quantities.values()) {
          if (quantity > 100) {
            return res.status(400).json({
              message:
                "The quantity of a single menu item cannot exceed 100.",
            });
          }
        }

        // -------------------------
        // GET MENU ITEMS
        // IMPORTANT:
        // ONLY ITEMS FROM THIS
        // RESTAURANT ARE ALLOWED
        // -------------------------

        const menuItemIds = Array.from(
          quantities.keys()
        );

        const menuItems = await MenuItem.find({
          _id: {
            $in: menuItemIds,
          },
          restaurant: restaurant._id,
          isAvailable: true,
        }).select(
          "_id name price restaurant isAvailable"
        );

        // -------------------------
        // MAKE LOOKUP MAP
        // -------------------------

        const menuItemMap = new Map(
          menuItems.map((item) => [
            item._id.toString(),
            item,
          ])
        );

        // -------------------------
        // VERIFY EVERY ITEM
        // -------------------------

        for (const menuItemId of menuItemIds) {
          if (!menuItemMap.has(menuItemId)) {
            return res.status(400).json({
              message:
                "One or more selected menu items are unavailable or do not belong to this restaurant.",
            });
          }
        }

        // -------------------------
        // CREATE PRICE/NAME SNAPSHOTS
        // -------------------------

        preOrderSnapshot = menuItemIds.map(
          (menuItemId) => {
            const menuItem =
              menuItemMap.get(menuItemId);

            return {
              menuItem: menuItem._id,
              name: menuItem.name,
              price: menuItem.price,
              quantity:
                quantities.get(menuItemId),
            };
          }
        );
      }
    }

    // -------------------------
    // GET NEXT DAY
    // -------------------------

    const nextDate = new Date(reservationDate);

    nextDate.setDate(
      nextDate.getDate() + 1
    );

    // -------------------------
    // CHECK FOR OVERLAPPING
    // RESERVATIONS
    // -------------------------

    const existingReservations =
      await Reservation.find({
        restaurant: restaurant._id,
        table: table._id,
        date: {
          $gte: reservationDate,
          $lt: nextDate,
        },
        status: {
          $in: ["pending", "confirmed"],
        },
      }).select("startTime endTime");

    const hasConflict =
      existingReservations.some(
        (reservation) => {
          const existingStart =
            timeToMinutes(
              reservation.startTime
            );

          const existingEnd =
            timeToMinutes(
              reservation.endTime
            );

          return (
            startMinutes < existingEnd &&
            endMinutes > existingStart
          );
        }
      );

    if (hasConflict) {
      return res.status(409).json({
        message:
          "This table is already reserved during the selected time.",
      });
    }

    // -------------------------
    // CREATE RESERVATION
    // -------------------------

    const reservation =
      await Reservation.create({
        customer: req.user._id,
        restaurant: restaurant._id,
        table: table._id,
        date: reservationDate,
        startTime,
        endTime,
        guests: numericGuests,
        notes:
          typeof notes === "string"
            ? notes.trim()
            : "",
        preOrder: preOrderSnapshot,
      });

    // -------------------------
    // POPULATE RESPONSE
    // -------------------------

    const populatedReservation =
      await Reservation.findById(
        reservation._id
      )
        .populate(
          "customer",
          "name email"
        )
        .populate(
          "restaurant",
          "name address phone image"
        )
        .populate(
          "table",
          "name capacity location image"
        );

    return res.status(201).json({
      message:
        "Reservation created successfully.",
      reservation:
        populatedReservation,
    });
  } catch (error) {
    console.error(
      "Create reservation error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while creating reservation.",
    });
  }
};

// =========================
// GET MY RESERVATIONS
// =========================

const getMyReservations = async (req, res) => {
  try {
    const reservations =
      await Reservation.find({
        customer: req.user._id,
      })
        .populate(
          "restaurant",
          "name address image"
        )
        .populate(
          "table",
          "name capacity location image"
        )
        .sort({
          date: 1,
          startTime: 1,
        });

    return res.status(200).json({
      reservations,
    });
  } catch (error) {
    console.error(
      "Get my reservations error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching reservations.",
    });
  }
};

// =========================
// GET SINGLE MY RESERVATION
// =========================

const getMyReservation = async (req, res) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    const reservation =
      await Reservation.findOne({
        _id: req.params.id,
        customer: req.user._id,
      })
        .populate(
          "restaurant",
          "name address phone email image"
        )
        .populate(
          "table",
          "name capacity location image"
        );

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found.",
      });
    }

    return res.status(200).json({
      reservation,
    });
  } catch (error) {
    console.error(
      "Get reservation error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching reservation.",
    });
  }
};

// =========================
// CANCEL MY RESERVATION
// =========================

const cancelMyReservation = async (req, res) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    const reservation =
      await Reservation.findOne({
        _id: req.params.id,
        customer: req.user._id,
      });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found.",
      });
    }

    if (reservation.status === "cancelled") {
      return res.status(400).json({
        message:
          "Reservation is already cancelled.",
      });
    }

    if (reservation.status === "completed") {
      return res.status(400).json({
        message:
          "A completed reservation cannot be cancelled.",
      });
    }

    reservation.status = "cancelled";

    await reservation.save();

    return res.status(200).json({
      message:
        "Reservation cancelled successfully.",
      reservation,
    });
  } catch (error) {
    console.error(
      "Cancel reservation error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while cancelling reservation.",
    });
  }
};

// =========================
// GET RESTAURANT RESERVATIONS
// =========================

const getRestaurantReservations = async (
  req,
  res
) => {
  try {
    const restaurant =
      await Restaurant.findOne({
        owner: req.user._id,
      });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    const reservations =
      await Reservation.find({
        restaurant: restaurant._id,
      })
        .populate(
          "customer",
          "name email"
        )
        .populate(
          "table",
          "name capacity location image"
        )
        .sort({
          date: 1,
          startTime: 1,
        });

    return res.status(200).json({
      reservations,
    });
  } catch (error) {
    console.error(
      "Get restaurant reservations error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching restaurant reservations.",
    });
  }
};

// =========================
// UPDATE RESERVATION STATUS
// =========================

const updateReservationStatus = async (
  req,
  res
) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "cancelled",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid reservation status.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    // -------------------------
    // FIND RESTAURANT OWNER
    // -------------------------

    const restaurant =
      await Restaurant.findOne({
        owner: req.user._id,
      });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    // -------------------------
    // FIND RESERVATION
    // -------------------------

    const reservation =
      await Reservation.findOne({
        _id: req.params.id,
        restaurant: restaurant._id,
      });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found.",
      });
    }

    // -------------------------
    // PREVENT INVALID TRANSITIONS
    // -------------------------

    if (
      reservation.status === "cancelled" &&
      status !== "cancelled"
    ) {
      return res.status(400).json({
        message:
          "A cancelled reservation cannot be changed.",
      });
    }

    if (
      reservation.status === "completed" &&
      status !== "completed"
    ) {
      return res.status(400).json({
        message:
          "A completed reservation cannot be changed.",
      });
    }

    // -------------------------
    // CHECK CONFLICT WHEN
    // CONFIRMING RESERVATION
    // -------------------------

    if (
      status === "confirmed" &&
      reservation.status !== "confirmed"
    ) {
      const reservationDate =
        new Date(reservation.date);

      reservationDate.setHours(
        0,
        0,
        0,
        0
      );

      const nextDate = new Date(
        reservationDate
      );

      nextDate.setDate(
        nextDate.getDate() + 1
      );

      const existingReservations =
        await Reservation.find({
          _id: {
            $ne: reservation._id,
          },
          restaurant: restaurant._id,
          table: reservation.table,
          date: {
            $gte: reservationDate,
            $lt: nextDate,
          },
          status: {
            $in: [
              "pending",
              "confirmed",
            ],
          },
        }).select(
          "startTime endTime"
        );

      const startMinutes =
        timeToMinutes(
          reservation.startTime
        );

      const endMinutes =
        timeToMinutes(
          reservation.endTime
        );

      const hasConflict =
        existingReservations.some(
          (existingReservation) => {
            const existingStart =
              timeToMinutes(
                existingReservation.startTime
              );

            const existingEnd =
              timeToMinutes(
                existingReservation.endTime
              );

            return (
              startMinutes <
                existingEnd &&
              endMinutes >
                existingStart
            );
          }
        );

      if (hasConflict) {
        return res.status(409).json({
          message:
            "This table is already reserved during the selected time.",
        });
      }
    }

    // -------------------------
    // UPDATE STATUS
    // -------------------------

    reservation.status = status;

    await reservation.save();

    // -------------------------
    // POPULATE RESPONSE
    // -------------------------

    const populatedReservation =
      await Reservation.findById(
        reservation._id
      )
        .populate(
          "customer",
          "name email"
        )
        .populate(
          "restaurant",
          "name address phone image"
        )
        .populate(
          "table",
          "name capacity location image"
        );

    return res.status(200).json({
      message:
        "Reservation status updated successfully.",
      reservation:
        populatedReservation,
    });
  } catch (error) {
    console.error(
      "Update reservation status error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while updating reservation status.",
    });
  }
};

// =========================
// EXPORTS
// =========================

module.exports = {
  createReservation,
  getMyReservations,
  getMyReservation,
  cancelMyReservation,
  getRestaurantReservations,
  updateReservationStatus,
};