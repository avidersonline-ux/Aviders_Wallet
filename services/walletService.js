import Wallet from "../models/Wallet.js";
import WalletLedger from "../models/WalletLedger.js";

export async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) wallet = await Wallet.create({ userId });
  return wallet;
}

function addToBreakdown(wallet, source, amount) {
  if (source === "spinwheel") wallet.breakdown.spinwheel += (wallet.breakdown.spinwheel || 0) + amount;
  if (source === "affiliate") wallet.breakdown.purchase += (wallet.breakdown.purchase || 0) + amount;
  if (source === "subscription") wallet.breakdown.subscription += (wallet.breakdown.subscription || 0) + amount;
  if (source === "referral") wallet.breakdown.referral += (wallet.breakdown.referral || 0) + amount;
  if (source === "admin") wallet.breakdown.manual += (wallet.breakdown.manual || 0) + amount;
}

export async function creditWallet({
  userId,
  amountAvd,
  source,
  reason,
  bucket = "UNLOCKED",
  referenceId,
  lockDays = 0
}) {
  if (!userId) throw new Error("userId required");
  if (!amountAvd || amountAvd <= 0) throw new Error("amountAvd must be > 0");
  if (!referenceId) throw new Error("referenceId required");

  const wallet = await getOrCreateWallet(userId);

  const uniqueKey = `${reason}:${referenceId}`;
  const already = await WalletLedger.findOne({ uniqueKey });
  if (already) return wallet;

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
      lockedAvd: wallet.lockedAvd
    },
    referenceId,
    uniqueKey,
    unlockAt
  });

  return wallet;
}

export async function debitWallet({ userId, amountAvd, referenceId }) {
  if (!userId) throw new Error("userId required");
  if (!amountAvd || amountAvd <= 0) throw new Error("amountAvd must be > 0");
  if (!referenceId) throw new Error("referenceId required");

  const wallet = await getOrCreateWallet(userId);

  if (wallet.unlockedAvd < amountAvd) {
    throw new Error("Insufficient unlocked balance");
  }

  const uniqueKey = `SPENT:${referenceId}`;
  const already = await WalletLedger.findOne({ uniqueKey });
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
      lockedAvd: wallet.lockedAvd
    },
    referenceId,
    uniqueKey,
    unlockAt: null
  });

  return wallet;
}

export async function getHistory(userId, limit = 20, offset = 0) {
  return WalletLedger.find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
}

export async function processUnlocks() {
  const now = new Date();
  const pending = await WalletLedger.find({
    bucket: "LOCKED",
    unlockAt: { $lte: now },
    type: "CREDIT"
  });

  let count = 0;
  for (const entry of pending) {
    const wallet = await Wallet.findOne({ userId: entry.userId });
    if (wallet && wallet.lockedAvd >= entry.amountAvd) {
      wallet.lockedAvd -= entry.amountAvd;
      wallet.unlockedAvd += entry.amountAvd;
      await wallet.save();

      // Update the ledger entry to show it's now UNLOCKED
      entry.bucket = "UNLOCKED";
      entry.reason = "AFFILIATE_UNLOCKED";
      await entry.save();
      count++;
    }
  }
  return { unlocked: count };
}

// Helper aliases
export const earn = async (userId, amount, source, referenceId) => {
  return creditWallet({ userId, amountAvd: amount, source, reason: source.toUpperCase(), referenceId });
};

export const spend = async (userId, amount, source, referenceId) => {
  return debitWallet({ userId, amountAvd: amount, referenceId });
};

export async function requestWithdraw(userId, amount, toWallet) {
  return { success: true, message: "Withdrawal requested (placeholder)" };
}

export async function deposit(userId, amount, txHash) {
  return { success: true, message: "Deposit recorded (placeholder)" };
}
