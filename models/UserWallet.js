import mongoose from "mongoose";

const UserWalletSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // Internal AVD balance (in-app credits)
  balance: { type: Number, default: 0 },

  // Analytics
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },

  // Optional breakdown
  earnedFromSpin: { type: Number, default: 0 },
  earnedFromReferral: { type: Number, default: 0 },
  earnedFromCashback: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("UserWallet", UserWalletSchema);
