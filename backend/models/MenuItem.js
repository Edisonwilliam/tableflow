const mongoose = require("mongoose");

const MENU_ANIMATION_TYPES = [
  "none",
  "drink",
  "pasta",
  "burger",
  "pizza",
  "dessert",
  "salad",
  "chicken",
];

const menuItemSchema = new mongoose.Schema(
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
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    image: {
      type: String,
      default: "",
    },

    // Determines which visual experience
    // will be shown on the customer menu
    // item detail page.
    animationType: {
      type: String,
      enum: MENU_ANIMATION_TYPES,
      default: "none",
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

// Prevent duplicate menu item names
// within the same restaurant.
menuItemSchema.index(
  {
    restaurant: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "MenuItem",
  menuItemSchema
);