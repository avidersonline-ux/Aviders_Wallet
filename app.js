import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import walletRoutes from "./routes/walletRoutes.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error:", err));

app.use("/api/wallet", walletRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Wallet server running on ${PORT}`));
