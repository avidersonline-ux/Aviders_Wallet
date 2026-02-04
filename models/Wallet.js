import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },

    // OPTIONAL: for admin / readability only
    email: { type: String, default: "", index: true },

    // Main balances
    unlockedAvd: { type: Number, default: 0 }, // usable now
    lockedAvd: { type: Number, default: 0 },   // locked rewards

    // Consolidated breakdown (UI / analytics)
    breakdown: {
      spinwheel: { type: Number, default: 0 },
      purchase: { type: Number, default: 0 },
      subscription: { type: Number, default: 0 },
      referral: { type: Number, default: 0 },
      manual: { type: Number, default: 0 }
    },

    // Analytics
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Virtual total balance
WalletSchema.virtual("totalAvd").get(function () {
  return (this.unlockedAvd || 0) + (this.lockedAvd || 0);
});

export default mongoose.model("Wallet", WalletSchema);
