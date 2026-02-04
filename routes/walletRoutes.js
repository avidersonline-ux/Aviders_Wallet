import express from "express";
import {
  earn,
  spend,
  getOrCreateWallet,
  requestWithdraw,
  deposit,
  getHistory,
  processUnlocks,
} from "../services/walletService.js";

const router = express.Router();

/**
 * =========================
 * GET WALLET (MAIN)
 * =========================
 * Used by:
 * - App
 * - Spin server (balance display)
 */
router.get("/:userId", async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.params.userId);

    res.json({
      success: true,
      wallet,
      balance: (wallet.unlockedAvd || 0) + (wallet.lockedAvd || 0),
      unlockedAvd: wallet.unlockedAvd || 0,
      lockedAvd: wallet.lockedAvd || 0,
      totalEarned: wallet.totalEarned || 0,
      totalSpent: wallet.totalSpent || 0,
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * =========================
 * GET WALLET HISTORY
 * =========================
 */
router.get("/:userId/history", async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const history = await getHistory(
      req.params.userId,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );

    res.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * =========================
 * EARN AVD (CALLED BY SPIN)
 * =========================
 */
router.post("/earn", async (req, res) => {
  try {
    const { userId, amount, source, referenceId } = req.body;

    if (!userId || !amount || !referenceId) {
      return res.status(400).json({
        success: false,
        error: "userId, amount and referenceId are required",
      });
    }

    const wallet = await earn(userId, amount, source, referenceId);

    // IMPORTANT: success=true for spin sync
    res.json({
      success: true,
      wallet,
      balance: (wallet.unlockedAvd || 0) + (wallet.lockedAvd || 0),
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * =========================
 * SPEND AVD
 * =========================
 */
router.post("/spend", async (req, res) => {
  try {
    const { userId, amount, referenceId } = req.body;

    if (!userId || !amount || !referenceId) {
      return res.status(400).json({
        success: false,
        error: "userId, amount and referenceId are required",
      });
    }

    const wallet = await spend(userId, amount, "app", referenceId);

    res.json({
      success: true,
      wallet,
      balance: (wallet.unlockedAvd || 0) + (wallet.lockedAvd || 0),
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * =========================
 * WITHDRAW REQUEST (PLACEHOLDER)
 * =========================
 */
router.post("/withdraw", async (req, res) => {
  try {
    const { userId, amount, toWallet } = req.body;
    const result = await requestWithdraw(userId, amount, toWallet);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * =========================
 * DEPOSIT (PLACEHOLDER)
 * =========================
 */
router.post("/deposit", async (req, res) => {
  try {
    const { userId, amount, txHash } = req.body;
    const result = await deposit(userId, amount, txHash);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * =========================
 * PROCESS UNLOCKS (CRON)
 * =========================
 */
router.post("/unlocks", async (req, res) => {
  try {
    const result = await processUnlocks();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

export default router;
