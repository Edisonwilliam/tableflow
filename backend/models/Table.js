const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Main Dining",
    },

    image: {
      type: String,
      default: "",
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

tableSchema.index(
  { restaurant: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model("Table", tableSchema);