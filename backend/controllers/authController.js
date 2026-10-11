
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");

// =========================================================
// GOOGLE CLIENT
// =========================================================

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// =========================================================
// TOKEN HELPERS
// =========================================================

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const createRegistrationToken = (googleUser) => {
  return jwt.sign(
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
};

// =========================================================
// SEND AUTHENTICATED USER
// =========================================================

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

// =========================================================
// NORMALIZE EMAIL
// =========================================================

const normalizeEmail = (email) => {
  return typeof email === "string"
    ? email.trim().toLowerCase()
    : "";
};

// =========================================================
// VERIFY GOOGLE CREDENTIAL
// =========================================================

const verifyGoogleCredential = async (credential) => {
  if (!credential || typeof credential !== "string") {
    const error = new Error(
      "Google credential is required."
    );
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

  try {
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

    const email = normalizeEmail(payload.email);

    if (!email) {
      const error = new Error(
        "Google did not provide a valid email address."
      );
      error.statusCode = 401;
      throw error;
    }

    return {
      googleId: String(payload.sub),
      email,
      name:
        typeof payload.name === "string" &&
        payload.name.trim()
          ? payload.name.trim()
          : email.split("@")[0],
      avatar:
        typeof payload.picture === "string"
          ? payload.picture
          : "",
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    console.error(
      "Google credential verification failed:",
      error.message
    );

    const verificationError = new Error(
      "Google authentication could not be verified. Please try again."
    );

    verificationError.statusCode = 401;
    throw verificationError;
  }
};

// =========================================================
// REGISTER WITH EMAIL/PASSWORD
// =========================================================

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
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

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message:
          "An account with this email already exists. Please log in.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

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
        message:
          "An account with this email already exists. Please log in.",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      message:
        "Unable to register right now. Please try again.",
    });
  }
};

// =========================================================
// LOGIN WITH EMAIL/PASSWORD
// =========================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        code: "GOOGLE_ACCOUNT",
        message:
          "This account uses Google sign-in. Please continue with Google.",
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

// =========================================================
// GOOGLE LOGIN + EXISTING ACCOUNT LINKING
// =========================================================

const googleLogin = async (req, res) => {
  try {
    // 1. Verify the Google credential and verified email.
    const googleUser = await verifyGoogleCredential(
      req.body?.credential
    );

    // 2. Authenticate directly if this Google ID is
    // already associated with a TableFlow account.
    const googleIdUser = await User.findOne({
      googleId: googleUser.googleId,
    });

    if (googleIdUser) {
      return sendAuthenticatedUser(
        res,
        googleIdUser,
        "Google login successful."
      );
    }

    // 3. Find an existing TableFlow account by the
    // verified Google email.
    const emailUser = await User.findOne({
      email: googleUser.email,
    });

    // No existing account: let the user register first.
    if (!emailUser) {
      return res.status(404).json({
        code: "ACCOUNT_NOT_FOUND",
        message:
          "No TableFlow account was found. Please register first.",
        redirectTo: "/register",
      });
    }

    // 4. Never replace a different Google identity
    // already attached to this account.
    if (
      emailUser.googleId &&
      emailUser.googleId !== googleUser.googleId
    ) {
      return res.status(409).json({
        code: "GOOGLE_ACCOUNT_ALREADY_LINKED",
        message:
          "This TableFlow account is linked to a different Google account. Please use your existing sign-in method.",
        redirectTo: "/login",
      });
    }

    // 5. Atomically attach the Google ID only when
    // the account has no Google ID yet.
    const linkedUser = await User.findOneAndUpdate(
      {
        _id: emailUser._id,
        $or: [
          { googleId: { $exists: false } },
          { googleId: null },
          { googleId: "" },
        ],
      },
      {
        $set: {
          googleId: googleUser.googleId,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (linkedUser) {
      return sendAuthenticatedUser(
        res,
        linkedUser,
        "Google account linked successfully."
      );
    }

    // 6. Handle a concurrent login/link request.
    // It may have linked this exact Google ID already.
    const currentGoogleUser = await User.findOne({
      googleId: googleUser.googleId,
    });

    if (
      currentGoogleUser &&
      String(currentGoogleUser._id) ===
        String(emailUser._id)
    ) {
      return sendAuthenticatedUser(
        res,
        currentGoogleUser,
        "Google login successful."
      );
    }

    return res.status(409).json({
      code: "GOOGLE_ACCOUNT_ALREADY_LINKED",
      message:
        "This account could not be linked to Google. Please try again or use your existing sign-in method.",
      redirectTo: "/login",
    });
  } catch (error) {
    // The unique Google ID index can reject a competing
    // link request. Never treat that as successful linking.
    if (error.code === 11000) {
      return res.status(409).json({
        code: "GOOGLE_ACCOUNT_ALREADY_LINKED",
        message:
          "This Google account is already associated with an account. Please sign in with the correct account.",
        redirectTo: "/login",
      });
    }

    console.error("Google login error:", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "Google login failed. Please try again.",
    });
  }
};

// =========================================================
// PREPARE GOOGLE REGISTRATION
// Does not create a user.
// =========================================================

const prepareGoogleRegistration = async (req, res) => {
  try {
    const googleUser = await verifyGoogleCredential(
      req.body?.credential
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
      message:
        "Choose your TableFlow account type to continue.",
      registrationToken,
      profile: {
        name: googleUser.name,
        email: googleUser.email,
        avatar: googleUser.avatar,
      },
    });
  } catch (error) {
    console.error(
      "Prepare Google registration error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "Unable to start Google registration. Please try again.",
    });
  }
};

// =========================================================
// COMPLETE GOOGLE REGISTRATION
// =========================================================

const completeGoogleRegistration = async (req, res) => {
  try {
    const { registrationToken, role } = req.body;

    if (!registrationToken) {
      return res.status(400).json({
        message:
          "Please verify your Google account again.",
      });
    }

    if (
      role !== "customer" &&
      role !== "restaurant"
    ) {
      return res.status(400).json({
        message:
          "Please select Customer or Restaurant.",
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
        message:
          "Invalid registration session. Please start again.",
      });
    }

    const normalizedEmail = normalizeEmail(
      registration.email
    );

    // Check again before creating the user.
    const existingUser = await User.findOne({
      $or: [
        { googleId: registration.googleId },
        { email: normalizedEmail },
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
      email: normalizedEmail,
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
          "An account already exists with this Google account or email. Please log in instead.",
        redirectTo: "/login",
      });
    }

    console.error(
      "Complete Google registration error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to complete registration. Please try again.",
    });
  }
};

// =========================================================
// CURRENT USER
// =========================================================

const getMe = async (req, res) => {
  try {
    const userId =
      req.user?.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const user = await User.findById(userId).select(
      "name email role avatar"
    );

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

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  register,
  login,
  googleLogin,
  prepareGoogleRegistration,
  completeGoogleRegistration,
  getMe,
};
