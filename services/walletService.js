import Wallet from "../models/Wallet.js";
import WalletLedger from "../models/WalletLedger.js";

/**
 * Get or create wallet
 */
export async function getOrCreateWallet(userId) {
  if (!userId) throw new Error("userId required");

  let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      unlockedAvd: 0,
      lockedAvd: 0,
      totalEarned: 0,
      totalSpent: 0,
      breakdown: {
        spinwheel: 0,
        purchase: 0,
        subscription: 0,
        referral: 0,
        manual: 0,
      },
    });
  }

  // Ensure legacy wallets are safe
  wallet.unlockedAvd = wallet.unlockedAvd || 0;
  wallet.lockedAvd = wallet.lockedAvd || 0;
  wallet.totalEarned = wallet.totalEarned || 0;
  wallet.totalSpent = wallet.totalSpent || 0;

  if (!wallet.breakdown) {
    wallet.breakdown = {
      spinwheel: 0,
      purchase: 0,
      subscription: 0,
      referral: 0,
      manual: 0,
    };
  }

  return wallet;
}

/**
 * Update breakdown safely
 */
function addToBreakdown(wallet, source, amount) {
  if (!wallet.breakdown) {
    wallet.breakdown = {
      spinwheel: 0,
      purchase: 0,
      subscription: 0,
      referral: 0,
      manual: 0,
    };
  }

  if (source === "spinwheel") wallet.breakdown.spinwheel += amount;
  if (source === "affiliate") wallet.breakdown.purchase += amount;
  if (source === "subscription") wallet.breakdown.subscription += amount;
  if (source === "referral") wallet.breakdown.referral += amount;
  if (source === "admin") wallet.breakdown.manual += amount;
}

/**
 * CREDIT WALLET (IDEMPOTENT)
 */
export async function creditWallet({
  userId,
  amountAvd,
  source,
  reason,
  bucket = "UNLOCKED",
  referenceId,
  lockDays = 0,
}) {
  if (!userId) throw new Error("userId required");
  if (!amountAvd || amountAvd <= 0) throw new Error("amountAvd must be > 0");
  if (!referenceId) throw new Error("referenceId required");

  const wallet = await getOrCreateWallet(userId);

  // 🔒 Idempotency protection
  const uniqueKey = `${reason}:${referenceId}`;
  const already = await WalletLedger.findOne({ uniqueKey }).lean();

  if (already) {
    // Treat duplicate as success (important for spin retry sync)
    return wallet;
  }

  // Apply credit
  if (bucket === "LOCKED") {
    wallet.lockedAvd += amountAvd;
  } else {
    wallet.unlockedAvd += amountAvd;
  }

  wallet.totalEarned += amountAvd;
  addToBreakdown(wallet, source, amountAvd);

  await wallet.save();

  const unlockAt =
    bucket === "LOCKED" && lockDays > 0
      ? new Date(Date.now() + lockDays * 24 * 60 * 60 * 1000)
      : null;

  await WalletLedger.create({
    userId,
    type: "CREDIT",
    bucket,
    reason,
    source,
    amountAvd,
    balancesAfter: {
      unlockedAvd: wallet.unlockedAvd,
      lockedAvd: wallet.lockedAvd,
    },
    referenceId,
    uniqueKey,
    unlockAt,
  });

  return wallet;
}

/**
 * DEBIT WALLET (IDEMPOTENT)
 */
export async function debitWallet({ userId, amountAvd, referenceId }) {
  if (!userId) throw new Error("userId required");
  if (!amountAvd || amountAvd <= 0) throw new Error("amountAvd must be > 0");
  if (!referenceId) throw new Error("referenceId required");

  const wallet = await getOrCreateWallet(userId);

  if (wallet.unlockedAvd < amountAvd) {
    throw new Error("Insufficient unlocked balance");
  }

  const uniqueKey = `SPENT:${referenceId}`;
  const already = await WalletLedger.findOne({ uniqueKey }).lean();

  if (already) return wallet;

  wallet.unlockedAvd -= amountAvd;
  wallet.totalSpent += amountAvd;

  await wallet.save();

  await WalletLedger.create({
    userId,
    type: "DEBIT",
    bucket: "UNLOCKED",
    reason: "SPENT",
    source: "app",
    amountAvd: -amountAvd,
    balancesAfter: {
      unlockedAvd: wallet.unlockedAvd,
      lockedAvd: wallet.lockedAvd,
    },
    referenceId,
    uniqueKey,
    unlockAt: null,
  });

  return wallet;
}

/**
 * HISTORY
 */
export async function getHistory(userId, limit = 20, offset = 0) {
  return WalletLedger.find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

/**
 * PROCESS LOCKED UNLOCKS
 */
export async function processUnlocks() {
  const now = new Date();

  const pending = await WalletLedger.find({
    bucket: "LOCKED",
    unlockAt: { $lte: now },
    type: "CREDIT",
  });

  let count = 0;

  for (const entry of pending) {
    const wallet = await Wallet.findOne({ userId: entry.userId });
    if (!wallet) continue;

    if (wallet.lockedAvd >= entry.amountAvd) {
      wallet.lockedAvd -= entry.amountAvd;
      wallet.unlockedAvd += entry.amountAvd;
      await wallet.save();

      entry.bucket = "UNLOCKED";
      entry.reason = "AFFILIATE_UNLOCKED"; // must match enum
      await entry.save();

      count++;
    }
  }

  return { unlocked: count };
}

/**
 * PUBLIC API MAPPINGS
 */

// ✅ Called by Spin Wheel
export const earn = async (userId, amount, source, referenceId) => {
  let reason = "ADMIN_ADJUST";

  if (source === "spinwheel") reason = "SPIN_WIN";
  if (source === "referral") reason = "REFERRAL_BONUS";
  if (source === "affiliate") reason = "PURCHASE_REWARD";
  if (source === "subscription") reason = "SUBSCRIPTION_BONUS";

  return creditWallet({
    userId,
    amountAvd: amount,
    source,
    reason,
    referenceId,
  });
};

// ✅ Spending
export const spend = async (userId, amount, source, referenceId) => {
  return debitWallet({
    userId,
    amountAvd: amount,
    referenceId,
  });
};

// Placeholder (future)
export async function requestWithdraw(userId, amount, toWallet) {
  return { success: true, message: "Withdrawal request submitted" };
}

export async function deposit(userId, amount, txHash) {
  return { success: true, message: "Deposit recorded" };
}
