import express from "express";
import mongoose from "mongoose";
import walletRoutes from "./routes/walletRoutes.js";

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

app.use("/api/wallet", walletRoutes);

app.listen(3000, () => console.log("Server running on 3000"));
