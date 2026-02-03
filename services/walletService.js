import UserWallet from "../models/UserWallet.js";
import WalletLedger from "../models/WalletLedger.js";

/** Ensure wallet exists for user */
export async function getOrCreateWallet(userId) {
  let wallet = await UserWallet.findOne({ userId });
  if (!wallet) {
    wallet = await UserWallet.create({ userId });
  }
  return wallet;
}

/** Earn AVD (spinwheel, referral, cashback, etc.) */
export async function earn(userId, amount, source = "system", referenceId = "") {
  if (amount <= 0) throw new Error("Amount must be > 0");
  const wallet = await getOrCreateWallet(userId);

  wallet.balance += amount;
  wallet.totalEarned += amount;

  if (source === "spinwheel") wallet.earnedFromSpin += amount;
  if (source === "referral") wallet.earnedFromReferral += amount;
  if (source === "cashback") wallet.earnedFromCashback += amount;

  wallet.updatedAt = new Date();
  await wallet.save();

  await WalletLedger.create({
    userId,
    type: "EARN",
    source,
    amount,
    balanceAfter: wallet.balance,
    referenceId
  });

  return wallet;
}

/** Spend AVD (product payment / discount) */
export async function spend(userId, amount, source = "order", referenceId = "") {
  if (amount <= 0) throw new Error("Amount must be > 0");
  const wallet = await getOrCreateWallet(userId);

  if (wallet.balance < amount) {
    throw new Error("Insufficient AVD balance");
  }

  wallet.balance -= amount;
  wallet.totalSpent += amount;
  wallet.updatedAt = new Date();
  await wallet.save();

  await WalletLedger.create({
    userId,
    type: "SPEND",
    source,
    amount: -amount,
    balanceAfter: wallet.balance,
    referenceId
  });

  return wallet;
}

/** Withdraw request (App → Blockchain) — Step 1 just records intent */
export async function requestWithdraw(userId, amount, toWalletAddress) {
  if (amount <= 0) throw new Error("Amount must be > 0");
  const wallet = await getOrCreateWallet(userId);

  if (wallet.balance < amount) {
    throw new Error("Insufficient AVD balance");
  }

  // Deduct internally
  wallet.balance -= amount;
  wallet.updatedAt = new Date();
  await wallet.save();

  const ledger = await WalletLedger.create({
    userId,
    type: "WITHDRAW",
    source: "blockchain",
    amount: -amount,
    balanceAfter: wallet.balance,
    referenceId: toWalletAddress
  });

  // In Step 1 we stop here. In Step 2 you will actually send on-chain AVD.
  return { wallet, ledger };
}

/** Deposit (Blockchain → App) — Step 1: credit after manual/admin verification */
export async function deposit(userId, amount, txHash) {
  if (amount <= 0) throw new Error("Amount must be > 0");
  const wallet = await getOrCreateWallet(userId);

  wallet.balance += amount;
  wallet.totalEarned += amount;
  wallet.updatedAt = new Date();
  await wallet.save();

  const ledger = await WalletLedger.create({
    userId,
    type: "DEPOSIT",
    source: "blockchain",
    amount,
    balanceAfter: wallet.balance,
    referenceId: txHash
  });

  return { wallet, ledger };
}
