import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import walletRoutes from "./routes/walletRoutes.js";

const app = express();

// ✅ trust proxy needed on Render/Railway
app.set("trust proxy", 1);

// ✅ security
app.use(helmet());
app.use(compression());

// ✅ controlled CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((x) => x.trim())
  : ["http://localhost:3000", "http://localhost:5000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow mobile/curl
      if (process.env.NODE_ENV === "production" && !allowedOrigins.includes(origin)) {
        return callback(new Error("CORS blocked"), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: false,
  })
);

// ✅ JSON limit
app.use(express.json({ limit: "2mb" }));

// ✅ Rate limiting (protect wallet endpoints)
const walletLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400, // adjust based on traffic
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
});
app.use("/api/wallet", walletLimiter);

// ✅ Mongo connection
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error:", err.message));

// ✅ routes
app.use("/api/wallet", walletRoutes);

// ✅ health
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "aviders-wallet",
    time: new Date().toISOString(),
  });
});

// ✅ error handler
app.use((err, req, res, next) => {
  console.error("🔥 Wallet server error:", err.message);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Wallet server running on ${PORT}`));
