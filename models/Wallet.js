import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },

    // Main balances
    unlockedAvd: { type: Number, default: 0 }, // usable now
    lockedAvd: { type: Number, default: 0 },   // affiliate-approved but locked

    // Consolidated breakdown (for UI)
    breakdown: {
      spinwheel: { type: Number, default: 0 },
      purchase: { type: Number, default: 0 },
      subscription: { type: Number, default: 0 },
      referral: { type: Number, default: 0 },
      manual: { type: Number, default: 0 } // admin adjustments if needed
    },

    // Analytics
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  { timestamps: true }
);

WalletSchema.virtual("totalAvd").get(function () {
  return (this.unlockedAvd || 0) + (this.lockedAvd || 0);
});

export default mongoose.model("Wallet", WalletSchema);
