const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");
const Restaurant = require("../models/Restaurant");
const cloudinary = require("../config/cloudinary");

// ==========================================
// CONSTANTS
// ==========================================

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

// ==========================================
// CLOUDINARY IMAGE UPLOAD
// ==========================================

const uploadImageToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "tableflow/menu",
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
// GET RESTAURANT FOR OWNER
// ==========================================

const getRestaurantForOwner = async (userId) => {
  return Restaurant.findOne({
    owner: userId,
  });
};

// ==========================================
// VALIDATE ANIMATION TYPE
// ==========================================

const isValidAnimationType = (animationType) => {
  return MENU_ANIMATION_TYPES.includes(animationType);
};

// ==========================================
// CREATE MENU ITEM
// ==========================================

const createMenuItem = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      animationType,
    } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        message: "Name, category and price are required.",
      });
    }

    const restaurant = await getRestaurantForOwner(
      req.user._id
    );

    if (!restaurant) {
      return res.status(404).json({
        message:
          "Restaurant profile not found. Please create your restaurant profile first.",
      });
    }

    const parsedPrice = Number(price);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number.",
      });
    }

    const selectedAnimation = animationType || "none";

    if (!isValidAnimationType(selectedAnimation)) {
      return res.status(400).json({
        message: "Invalid menu animation type.",
      });
    }

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();

    if (!trimmedName) {
      return res.status(400).json({
        message: "Menu item name is required.",
      });
    }

    if (!trimmedCategory) {
      return res.status(400).json({
        message: "Menu item category is required.",
      });
    }

    const existingItem = await MenuItem.findOne({
      restaurant: restaurant._id,
      name: trimmedName,
    });

    if (existingItem) {
      return res.status(409).json({
        message:
          "A menu item with this name already exists.",
      });
    }

    let imageUrl = "";

    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(
        req.file.buffer
      );

      imageUrl = uploadResult.secure_url;
    }

    const menuItem = await MenuItem.create({
      restaurant: restaurant._id,
      name: trimmedName,
      description: description?.trim() || "",
      category: trimmedCategory,
      price: parsedPrice,
      image: imageUrl,
      animationType: selectedAnimation,
      isAvailable: true,
    });

    return res.status(201).json({
      message: "Menu item created successfully.",
      menuItem,
    });
  } catch (error) {
    console.error("Create menu item error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "A menu item with this name already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to create menu item.",
    });
  }
};

// ==========================================
// GET MY MENU
// ==========================================

const getMyMenu = async (req, res) => {
  try {
    const restaurant = await getRestaurantForOwner(
      req.user._id
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const menuItems = await MenuItem.find({
      restaurant: restaurant._id,
    }).sort({
      category: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
      },
      menuItems,
    });
  } catch (error) {
    console.error("Get menu error:", error);

    return res.status(500).json({
      message: "Failed to fetch menu.",
    });
  }
};

// ==========================================
// GET SINGLE MENU ITEM
// ==========================================

const getMenuItem = async (req, res) => {
  try {
    const restaurant = await getRestaurantForOwner(
      req.user._id
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurant: restaurant._id,
    });

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found.",
      });
    }

    return res.status(200).json({
      menuItem,
    });
  } catch (error) {
    console.error("Get menu item error:", error);

    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
      });
    }

    return res.status(500).json({
      message: "Failed to fetch menu item.",
    });
  }
};

// ==========================================
// UPDATE MENU ITEM
// ==========================================

const updateMenuItem = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      animationType,
    } = req.body;

    const restaurant = await getRestaurantForOwner(
      req.user._id
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurant: restaurant._id,
    });

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found.",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Menu item name is required.",
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        message: "Menu item category is required.",
      });
    }

    const parsedPrice = Number(price);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number.",
      });
    }

    const selectedAnimation = animationType || "none";

    if (!isValidAnimationType(selectedAnimation)) {
      return res.status(400).json({
        message: "Invalid menu animation type.",
      });
    }

    const trimmedName = name.trim();

    const duplicateItem = await MenuItem.findOne({
      restaurant: restaurant._id,
      name: trimmedName,
      _id: {
        $ne: menuItem._id,
      },
    });

    if (duplicateItem) {
      return res.status(409).json({
        message:
          "Another menu item already uses this name.",
      });
    }

    menuItem.name = trimmedName;
    menuItem.description = description?.trim() || "";
    menuItem.category = category.trim();
    menuItem.price = parsedPrice;
    menuItem.animationType = selectedAnimation;

    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(
        req.file.buffer
      );

      menuItem.image = uploadResult.secure_url;
    }

    await menuItem.save();

    return res.status(200).json({
      message: "Menu item updated successfully.",
      menuItem,
    });
  } catch (error) {
    console.error("Update menu item error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Another menu item already uses this name.",
      });
    }

    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
      });
    }

    return res.status(500).json({
      message: "Failed to update menu item.",
    });
  }
};

// ==========================================
// DELETE MENU ITEM
// ==========================================

const deleteMenuItem = async (req, res) => {
  try {
    const restaurant = await getRestaurantForOwner(
      req.user._id
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurant: restaurant._id,
    });

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found.",
      });
    }

    await menuItem.deleteOne();

    return res.status(200).json({
      message: "Menu item deleted successfully.",
    });
  } catch (error) {
    console.error("Delete menu item error:", error);

    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
      });
    }

    return res.status(500).json({
      message: "Failed to delete menu item.",
    });
  }
};

// ==========================================
// TOGGLE AVAILABILITY
// ==========================================

const toggleMenuItemAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    const restaurant = await getRestaurantForOwner(
      req.user._id
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant profile not found.",
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurant: restaurant._id,
    });

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found.",
      });
    }

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        message: "isAvailable must be a boolean.",
      });
    }

    menuItem.isAvailable = isAvailable;

    await menuItem.save();

    return res.status(200).json({
      message:
        "Menu item availability updated successfully.",
      menuItem,
    });
  } catch (error) {
    console.error(
      "Toggle menu availability error:",
      error
    );

    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
      });
    }

    return res.status(500).json({
      message:
        "Failed to update menu availability.",
    });
  }
};

// ==========================================
// PUBLIC — GET RESTAURANT MENU
// ==========================================

const getPublicRestaurantMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        message: "Invalid restaurant ID.",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      isActive: true,
    }).select("_id name");

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    const menuItems = await MenuItem.find({
      restaurant: restaurant._id,
      isAvailable: true,
    })
      .select(
        "name description category price image animationType isAvailable"
      )
      .sort({
        category: 1,
        createdAt: -1,
      });

    return res.status(200).json({
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
      },
      menuItems,
    });
  } catch (error) {
    console.error(
      "Get public restaurant menu error:",
      error
    );

    return res.status(500).json({
      message: "Unable to load restaurant menu.",
    });
  }
};

module.exports = {
  createMenuItem,
  getMyMenu,
  getMenuItem,
  getPublicRestaurantMenu,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
};