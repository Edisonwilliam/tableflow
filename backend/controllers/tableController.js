const Table = require("../models/Table");
const Restaurant = require("../models/Restaurant");
const Reservation = require("../models/Reservation");
const cloudinary = require("../config/cloudinary");

// ==========================================
// CLOUDINARY IMAGE UPLOAD
// ==========================================

const uploadImageToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "tableflow/tables",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

// ==========================================
// CREATE TABLE
// ==========================================

const createTable = async (req, res) => {
  try {
    const { name, capacity, location } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({
        message: "Table name and capacity are required.",
      });
    }

    const restaurant = await Restaurant.findOne({
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message:
          "Restaurant profile not found. Please create your restaurant profile first.",
      });
    }

    const parsedCapacity = Number(capacity);

    if (
      !Number.isInteger(parsedCapacity) ||
      parsedCapacity < 1 ||
      parsedCapacity > 50
    ) {
      return res.status(400).json({
        message: "Capacity must be a whole number between 1 and 50.",
      });
    }

    const existingTable = await Table.findOne({
      restaurant: restaurant._id,
      name: name.trim(),
    });

    if (existingTable) {
      return res.status(409).json({
        message: "A table with this name already exists.",
      });
    }

    let imageUrl = "";

    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(
        req.file.buffer
      );

      imageUrl = uploadResult.secure_url;
    }

    const table = await Table.create({
      restaurant: restaurant._id,
      name: name.trim(),
      capacity: parsedCapacity,
      location: location?.trim() || "Main Dining",
      image: imageUrl,
    });

    return res.status(201).json({
      message: "Table created successfully.",
      table,
    });
  } catch (error) {
    console.error("Create table error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A table with this name already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to create table.",
    });
  }
};

// ==========================================
// GET MY TABLES
// ==========================================

const getMyTables = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const tables = await Table.find({
      restaurant: restaurant._id,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      tables,
    });
  } catch (error) {
    console.error("Get tables error:", error);

    return res.status(500).json({
      message: "Failed to fetch tables.",
    });
  }
};

// ==========================================
// GET SINGLE TABLE
// ==========================================

const getTable = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const table = await Table.findOne({
      _id: req.params.id,
      restaurant: restaurant._id,
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found.",
      });
    }

    return res.status(200).json({
      table,
    });
  } catch (error) {
    console.error("Get table error:", error);

    return res.status(500).json({
      message: "Failed to fetch table.",
    });
  }
};

// ==========================================
// UPDATE TABLE
// ==========================================

const updateTable = async (req, res) => {
  try {
    const { name, capacity, location } = req.body;

    const restaurant = await Restaurant.findOne({
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const table = await Table.findOne({
      _id: req.params.id,
      restaurant: restaurant._id,
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found.",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Table name is required.",
      });
    }

    const parsedCapacity = Number(capacity);

    if (
      !Number.isInteger(parsedCapacity) ||
      parsedCapacity < 1 ||
      parsedCapacity > 50
    ) {
      return res.status(400).json({
        message: "Capacity must be a whole number between 1 and 50.",
      });
    }

    const duplicateTable = await Table.findOne({
      restaurant: restaurant._id,
      name: name.trim(),
      _id: {
        $ne: table._id,
      },
    });

    if (duplicateTable) {
      return res.status(409).json({
        message: "Another table already uses this name.",
      });
    }

    table.name = name.trim();
    table.capacity = parsedCapacity;
    table.location = location?.trim() || "Main Dining";

    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(
        req.file.buffer
      );

      table.image = uploadResult.secure_url;
    }

    await table.save();

    return res.status(200).json({
      message: "Table updated successfully.",
      table,
    });
  } catch (error) {
    console.error("Update table error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Another table already uses this name.",
      });
    }

    return res.status(500).json({
      message: "Failed to update table.",
    });
  }
};

// ==========================================
// DELETE TABLE
// ==========================================

const deleteTable = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const table = await Table.findOne({
      _id: req.params.id,
      restaurant: restaurant._id,
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found.",
      });
    }

    await table.deleteOne();

    return res.status(200).json({
      message: "Table deleted successfully.",
    });
  } catch (error) {
    console.error("Delete table error:", error);

    return res.status(500).json({
      message: "Failed to delete table.",
    });
  }
};

// ==========================================
// TOGGLE TABLE AVAILABILITY
// ==========================================

const toggleTableAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    const restaurant = await Restaurant.findOne({
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const table = await Table.findOne({
      _id: req.params.id,
      restaurant: restaurant._id,
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found.",
      });
    }

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        message: "isAvailable must be a boolean.",
      });
    }

    table.isAvailable = isAvailable;

    await table.save();

    return res.status(200).json({
      message: "Table availability updated successfully.",
      table,
    });
  } catch (error) {
    console.error(
      "Toggle table availability error:",
      error
    );

    return res.status(500).json({
      message: "Failed to update table availability.",
    });
  }
};

// ==========================================
// PUBLIC — GET AVAILABLE TABLES
// ==========================================

const getAvailableTables = async (req, res) => {
  try {
    const {
      restaurantId,
      date,
      startTime,
      endTime,
      guests,
    } = req.query;

    // ------------------------------------------
    // REQUIRED FIELDS
    // ------------------------------------------

    if (
      !restaurantId ||
      !date ||
      !startTime ||
      !endTime ||
      !guests
    ) {
      return res.status(400).json({
        message:
          "restaurantId, date, startTime, endTime and guests are required.",
      });
    }

    // ------------------------------------------
    // VALIDATE GUEST COUNT
    // ------------------------------------------

    const guestCount = Number(guests);

    if (
      !Number.isInteger(guestCount) ||
      guestCount < 1 ||
      guestCount > 50
    ) {
      return res.status(400).json({
        message:
          "Guests must be a whole number between 1 and 50.",
      });
    }

    // ------------------------------------------
    // VALIDATE TIME
    // ------------------------------------------

    if (startTime >= endTime) {
      return res.status(400).json({
        message: "End time must be later than start time.",
      });
    }

    // ------------------------------------------
    // VALIDATE DATE
    // ------------------------------------------

    const reservationDate = new Date(date);

    if (Number.isNaN(reservationDate.getTime())) {
      return res.status(400).json({
        message: "Invalid reservation date.",
      });
    }

    // ------------------------------------------
    // VERIFY RESTAURANT
    // ------------------------------------------

    const restaurant = await Restaurant.findById(
      restaurantId
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    // ------------------------------------------
    // FIND TABLES THAT CAN FIT THE GUESTS
    // ------------------------------------------

    const tables = await Table.find({
      restaurant: restaurantId,
      isAvailable: true,
      capacity: {
        $gte: guestCount,
      },
    })
      .select(
        "_id name capacity location image isAvailable"
      )
      .sort({
        capacity: 1,
        name: 1,
      });

    // ------------------------------------------
    // FIND RESERVATIONS FOR THIS DATE
    // ------------------------------------------

    const existingReservations =
      await Reservation.find({
        restaurant: restaurantId,
        date: reservationDate,
        status: {
          $in: ["pending", "confirmed"],
        },
      }).select(
        "table startTime endTime"
      );

    // ------------------------------------------
    // REMOVE TABLES WITH OVERLAPPING TIMES
    // ------------------------------------------

    const availableTables = tables.filter(
      (table) => {
        const hasConflict =
          existingReservations.some(
            (reservation) => {
              // Different table = no conflict
              if (
                reservation.table.toString() !==
                table._id.toString()
              ) {
                return false;
              }

              // Time overlap:
              //
              // Existing: 7:00 - 8:30
              // New:      7:30 - 9:00
              //
              // 7:30 < 8:30 = true
              // 9:00 > 7:00 = true
              //
              // Therefore: CONFLICT
              return (
                startTime < reservation.endTime &&
                endTime > reservation.startTime
              );
            }
          );

        return !hasConflict;
      }
    );

    return res.status(200).json({
      availableTables,
    });
  } catch (error) {
    console.error(
      "Get available tables error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to check table availability.",
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  createTable,
  getMyTables,
  getAvailableTables,
  getTable,
  updateTable,
  deleteTable,
  toggleTableAvailability,
};