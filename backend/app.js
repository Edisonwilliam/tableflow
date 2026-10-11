const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const tableRoutes = require("./routes/tableRoutes");
const menuRoutes = require("./routes/menuRoutes");
const reservationRoutes = require("./routes/reservationRoutes");

const app = express();

// =========================
// MIDDLEWARE
// =========================

const allowedOrigins = [
  "http://localhost:5173",
  "https://tableflowe.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS blocked origin:", origin);

      return callback(
        new Error(`Not allowed by CORS: ${origin}`)
      );
    },
    credentials: true,
  })
);

app.use(express.json());

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "TableFlow API is running",
  });
});

// =========================
// AUTH ROUTES
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/reservations", reservationRoutes);
// =========================
// ROOT ROUTE
// =========================

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to TableFlow API",
  });
});

module.exports = app;


