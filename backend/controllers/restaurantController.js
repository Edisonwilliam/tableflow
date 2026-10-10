const Restaurant = require("../models/Restaurant");
const cloudinary = require("../config/cloudinary");

// ==========================================
// CLOUDINARY IMAGE UPLOAD
// ==========================================

const uploadImageToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder: "tableflow/restaurants",
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
// CREATE RESTAURANT
// ==========================================

const createRestaurant = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      phone,
      email,
      cuisine,
    } = req.body;

    if (!name || !address || !phone) {
      return res.status(400).json({
        message:
          "Restaurant name, address and phone are required.",
      });
    }

    const existingRestaurant =
      await Restaurant.findOne({
        owner: req.user._id,
      });

    if (existingRestaurant) {
      return res.status(400).json({
        message:
          "You already have a restaurant.",
      });
    }

    let image = "";

    if (req.file) {
      const uploadResult =
        await uploadImageToCloudinary(
          req.file.buffer
        );

      image = uploadResult.secure_url;
    }

    const restaurant =
      await Restaurant.create({
        name: name.trim(),
        description:
          description?.trim() || "",
        address: address.trim(),
        phone: phone.trim(),
        email: email?.trim() || "",
        cuisine: cuisine?.trim() || "",
        image,
        owner: req.user._id,
      });

    return res.status(201).json({
      message:
        "Restaurant created successfully.",
      restaurant,
    });
  } catch (error) {
    console.error(
      "Create restaurant error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to create restaurant.",
    });
  }
};

// ==========================================
// GET MY RESTAURANT
// ==========================================

const getMyRestaurant = async (req, res) => {
  try {
    const restaurant =
      await Restaurant.findOne({
        owner: req.user._id,
      });

    if (!restaurant) {
      return res.status(404).json({
        message:
          "Restaurant profile not found.",
      });
    }

    return res.status(200).json({
      restaurant,
    });
  } catch (error) {
    console.error(
      "Get my restaurant error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load restaurant.",
    });
  }
};

// ==========================================
// UPDATE MY RESTAURANT
// ==========================================

const updateMyRestaurant = async (req, res) => {
  try {
    const restaurant =
      await Restaurant.findOne({
        owner: req.user._id,
      });

    if (!restaurant) {
      return res.status(404).json({
        message:
          "Restaurant profile not found.",
      });
    }

    const {
      name,
      description,
      address,
      phone,
      email,
      cuisine,
    } = req.body;

    if (name !== undefined) {
      restaurant.name = name.trim();
    }

    if (description !== undefined) {
      restaurant.description =
        description.trim();
    }

    if (address !== undefined) {
      restaurant.address =
        address.trim();
    }

    if (phone !== undefined) {
      restaurant.phone =
        phone.trim();
    }

    if (email !== undefined) {
      restaurant.email =
        email.trim();
    }

    if (cuisine !== undefined) {
      restaurant.cuisine =
        cuisine.trim();
    }

    if (req.file) {
      const uploadResult =
        await uploadImageToCloudinary(
          req.file.buffer
        );

      restaurant.image =
        uploadResult.secure_url;
    }

    await restaurant.save();

    return res.status(200).json({
      message:
        "Restaurant updated successfully.",
      restaurant,
    });
  } catch (error) {
    console.error(
      "Update restaurant error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to update restaurant.",
    });
  }
};

// ==========================================
// PUBLIC — GET ALL ACTIVE RESTAURANTS
// ==========================================

const getPublicRestaurants = async (
  req,
  res
) => {
  try {
    const restaurants =
      await Restaurant.find({
        isActive: true,
      })
        .select(
          "name description address phone email cuisine image"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      restaurants,
    });
  } catch (error) {
    console.error(
      "Get public restaurants error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load restaurants.",
    });
  }
};

// ==========================================
// PUBLIC — GET ONE RESTAURANT
// ==========================================

const getPublicRestaurant = async (
  req,
  res
) => {
  try {
    const restaurant =
      await Restaurant.findOne({
        _id: req.params.id,
        isActive: true,
      }).select(
        "name description address phone email cuisine image"
      );

    if (!restaurant) {
      return res.status(404).json({
        message:
          "Restaurant not found.",
      });
    }

    return res.status(200).json({
      restaurant,
    });
  } catch (error) {
    console.error(
      "Get public restaurant error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load restaurant.",
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  createRestaurant,
  getMyRestaurant,
  updateMyRestaurant,
  getPublicRestaurants,
  getPublicRestaurant,
};