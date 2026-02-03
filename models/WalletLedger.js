import mongoose from "mongoose";

const WalletLedgerSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },

    // CREDIT / DEBIT
    type: { type: String, enum: ["CREDIT", "DEBIT"], required: true },

    // UNLOCKED or LOCKED (affiliate reward will be LOCKED)
    bucket: { type: String, enum: ["UNLOCKED", "LOCKED"], required: true },

    // Reason (what user sees in UI)
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
        "ADMIN_ADJUST"
      ],
      required: true
    },

    // Who generated it (internal)
    source: {
      type: String,
      enum: ["spinwheel", "affiliate", "subscription", "referral", "app", "admin"],
      required: true
    },

    // Amount
    amountAvd: { type: Number, required: true }, // +50 / -200

    // Balances after transaction (great for debugging)
    balancesAfter: {
      unlockedAvd: { type: Number, required: true },
      lockedAvd: { type: Number, required: true }
    },

    // Used to prevent duplicate credits
    referenceId: { type: String, required: true },

    // Makes it impossible to double credit same order/spin/referral
    uniqueKey: { type: String, required: true, unique: true, index: true },

    // Lock release info (only for locked affiliate rewards)
    unlockAt: { type: Date, default: null }
  },
  { timestamps: true }
);

WalletLedgerSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("WalletLedger", WalletLedgerSchema);
