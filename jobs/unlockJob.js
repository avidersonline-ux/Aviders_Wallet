import Wallet from "../models/Wallet.js";
import WalletLedger from "../models/WalletLedger.js";

export async function runUnlockJob() {
  const now = new Date();

  const due = await WalletLedger.find({
    reason: "AFFILIATE_APPROVED_LOCKED",
    bucket: "LOCKED",
    unlockAt: { $lte: now }
  }).lean();

  for (const entry of due) {
    const wallet = await Wallet.findOne({ userId: entry.userId });
    if (!wallet) continue;

    // move LOCKED -> UNLOCKED
    const amount = entry.amountAvd;

    if (wallet.lockedAvd < amount) continue; // safety

    wallet.lockedAvd -= amount;
    wallet.unlockedAvd += amount;

    await wallet.save();

    // record unlock ledger (only once)
    const uniqueKey = `AFFILIATE_UNLOCKED:${entry.referenceId}`;
    const exists = await WalletLedger.findOne({ uniqueKey });
    if (exists) continue;

    await WalletLedger.create({
      userId: entry.userId,
      type: "CREDIT",
      bucket: "UNLOCKED",
      reason: "AFFILIATE_UNLOCKED",
      source: "affiliate",
      amountAvd: amount,
      balancesAfter: {
        unlockedAvd: wallet.unlockedAvd,
        lockedAvd: wallet.lockedAvd
      },
      referenceId: entry.referenceId,
      uniqueKey,
      unlockAt: null
    });
  }

  return { unlockedCount: due.length };
}
