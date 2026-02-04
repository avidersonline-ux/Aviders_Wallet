import mongoose from "mongoose";

const WalletLedgerSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },

    // CREDIT / DEBIT
    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    // Balance bucket
    bucket: {
      type: String,
      enum: ["UNLOCKED", "LOCKED"],
      required: true,
    },

    // User-visible reason
    reason: {
      type: String,
      enum: [
        "SPIN_WIN",
        "REFERRAL_BONUS",
        "PURCHASE_REWARD",
        "SUBSCRIPTION_BONUS",
        "AFFILIATE_APPROVED_LOCKED",
        "AFFILIATE_UNLOCKED",
        "SPENT",
        "REVERSAL",
        "ADMIN_ADJUST",
      ],
      required: true,
    },

    // Source system (EXPANDED for Spin compatibility)
    source: {
      type: String,
      enum: [
        // Spin ecosystem
        "spinwheel",
        "daily_free",
        "ad_rewarded",
        "bonus",

        // Other earning systems
        "affiliate",
        "subscription",
        "referral",

        // App / admin
        "app",
        "admin",
      ],
      required: true,
    },

    // Transaction amount (+credit / -debit)
    amountAvd: {
      type: Number,
      required: true,
    },

    // Balances snapshot
    balancesAfter: {
      unlockedAvd: { type: Number, required: true },
      lockedAvd: { type: Number, required: true },
    },

    // Idempotency reference
    referenceId: {
      type: String,
      required: true,
    },

    // Prevent duplicate credits
    uniqueKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Unlock schedule (for locked rewards)
    unlockAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster history queries
WalletLedgerSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("WalletLedger", WalletLedgerSchema);
