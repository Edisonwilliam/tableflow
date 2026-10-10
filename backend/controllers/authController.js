const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

const generateToken = (userId) =>
  jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const createRegistrationToken = (googleUser) =>
  jwt.sign(
    {
      purpose: "google_registration",
      googleId: googleUser.googleId,
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.avatar,
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

const sendAuthenticatedUser = (res, user, message) => {
  const token = generateToken(user._id);

  return res.status(200).json({
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || "",
    },
  });
};

const verifyGoogleCredential = async (credential) => {
  if (!credential) {
    const error = new Error("Google credential is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    const error = new Error(
      "Google authentication is not configured on the server."
    );
    error.statusCode = 500;
    throw error;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (
    !payload ||
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    const error = new Error(
      "Google could not verify your account. Please try again."
    );
    error.statusCode = 401;
    throw error;
  }

  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: payload.name || payload.email.split("@")[0],
    avatar: payload.picture || "",
  };
};

// =========================
// REGISTER WITH EMAIL/PASSWORD
// =========================

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    if (
      role !== "customer" &&
      role !== "restaurant"
    ) {
      return res.status(400).json({
        message: "Please select a valid account type.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message: "An account with this email already exists. Please log in.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    return sendAuthenticatedUser(
      res,
      user,
      "Registration successful."
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message: "An account with this email already exists. Please log in.",
      });
    }

    console.error("Registration error:", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "Unable to register right now. Please try again.",
    });
  }
};

// =========================
// LOGIN WITH EMAIL/PASSWORD
// =========================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        code: "GOOGLE_ACCOUNT",
        message: "This account uses Google sign-in. Please continue with Google.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    return sendAuthenticatedUser(
      res,
      user,
      "Login successful."
    );
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to log in right now. Please try again.",
    });
  }
};

// =========================
// GOOGLE LOGIN — EXISTING ACCOUNTS ONLY
// =========================

const googleLogin = async (req, res) => {
  try {
    const googleUser = await verifyGoogleCredential(
      req.body.credential
    );

    const user = await User.findOne({
      googleId: googleUser.googleId,
    });

    if (user) {
      return sendAuthenticatedUser(
        res,
        user,
        "Google login successful."
      );
    }

    const emailUser = await User.findOne({
      email: googleUser.email,
    });

    if (emailUser) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS_USE_EXISTING_LOGIN",
        message:
          "An account already exists with this email. Please log in using your existing sign-in method.",
        redirectTo: "/login",
      });
    }

    return res.status(404).json({
      code: "ACCOUNT_NOT_FOUND",
      message: "No TableFlow account was found. Please register first.",
      redirectTo: "/register",
    });
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(error.statusCode || 401).json({
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "Google login failed. Please try again.",
    });
  }
};

// =========================
// PREPARE GOOGLE REGISTRATION
// DOES NOT CREATE A USER
// =========================

const prepareGoogleRegistration = async (req, res) => {
  try {
    const googleUser = await verifyGoogleCredential(
      req.body.credential
    );

    const existingUser = await User.findOne({
      $or: [
        { googleId: googleUser.googleId },
        { email: googleUser.email },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message:
          "A TableFlow account already exists with this email. Please log in instead.",
        redirectTo: "/login",
      });
    }

    const registrationToken =
      createRegistrationToken(googleUser);

    return res.status(200).json({
      message: "Choose your TableFlow account type to continue.",
      registrationToken,
      profile: {
        name: googleUser.name,
        email: googleUser.email,
        avatar: googleUser.avatar,
      },
    });
  } catch (error) {
    console.error("Prepare Google registration error:", error);

    return res.status(error.statusCode || 401).json({
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "Unable to start Google registration. Please try again.",
    });
  }
};

// =========================
// COMPLETE GOOGLE REGISTRATION
// CREATES USER AFTER ROLE SELECTION
// =========================

const completeGoogleRegistration = async (req, res) => {
  try {
    const { registrationToken, role } = req.body;

    if (!registrationToken) {
      return res.status(400).json({
        message: "Please verify your Google account again.",
      });
    }

    if (
      role !== "customer" &&
      role !== "restaurant"
    ) {
      return res.status(400).json({
        message: "Please select Customer or Restaurant.",
      });
    }

    let registration;

    try {
      registration = jwt.verify(
        registrationToken,
        process.env.JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        code: "REGISTRATION_SESSION_EXPIRED",
        message:
          "Your Google registration session has expired. Please start again.",
      });
    }

    if (
      registration.purpose !== "google_registration" ||
      !registration.googleId ||
      !registration.email
    ) {
      return res.status(401).json({
        message: "Invalid registration session. Please start again.",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { googleId: registration.googleId },
        { email: registration.email },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message:
          "A TableFlow account already exists with this email. Please log in instead.",
        redirectTo: "/login",
      });
    }

    const user = await User.create({
      name: registration.name,
      email: registration.email,
      googleId: registration.googleId,
      avatar: registration.avatar || "",
      role,
    });

    return sendAuthenticatedUser(
      res,
      user,
      "Your TableFlow account has been created successfully."
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message:
          "A TableFlow account already exists with this email. Please log in instead.",
        redirectTo: "/login",
      });
    }

    console.error("Complete Google registration error:", error);

    return res.status(500).json({
      message: "Unable to complete registration. Please try again.",
    });
  }
};

// =========================
// CURRENT USER
// =========================

const getMe = async (req, res) => {
  try {
    const user = await User.findById(
      req.user.userId || req.user._id
    ).select("name email role avatar");

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Unable to load your account.",
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  prepareGoogleRegistration,
  completeGoogleRegistration,
  getMe,
};