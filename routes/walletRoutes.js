import express from "express";
import {
  earn,
  spend,
  getOrCreateWallet,
  requestWithdraw,
  deposit,
  getHistory,
  processUnlocks
} from "../services/walletService.js";

const router = express.Router();

// Get wallet
router.get("/:userId", async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.params.userId);
    res.json(wallet);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get transaction history
router.get("/:userId/history", async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const history = await getHistory(req.params.userId, parseInt(limit), parseInt(offset));
    res.json(history);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Earn AVD
router.post("/earn", async (req, res) => {
  try {
    const { userId, amount, source, referenceId } = req.body;
    const wallet = await earn(userId, amount, source, referenceId);
    res.json(wallet);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Spend AVD
router.post("/spend", async (req, res) => {
  try {
    const { userId, amount, source, referenceId } = req.body;
    const wallet = await spend(userId, amount, source, referenceId);
    res.json(wallet);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Withdraw request
router.post("/withdraw", async (req, res) => {
  try {
    const { userId, amount, toWallet } = req.body;
    const result = await requestWithdraw(userId, amount, toWallet);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Deposit record
router.post("/deposit", async (req, res) => {
  try {
    const { userId, amount, txHash } = req.body;
    const result = await deposit(userId, amount, txHash);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Unlock processing (for cron)
router.post("/unlocks", async (req, res) => {
  try {
    // Optional: Add a secret key to protect this endpoint
    // if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    //   return res.status(401).json({ error: "Unauthorized" });
    // }
    const result = await processUnlocks();
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
