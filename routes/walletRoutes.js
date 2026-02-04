import express from "express";
import { earn, spend, getOrCreateWallet, requestWithdraw, deposit } from "../services/walletService.js";

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

// Earn AVD (spin/referral/cashback)
router.post("/earn", async (req, res) => {
  try {
    const { userId, amount, source, referenceId } = req.body;
    const wallet = await earn(userId, amount, source, referenceId);
    res.json(wallet);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Spend AVD (pay for product)
router.post("/spend", async (req, res) => {
  try {
    const { userId, amount, source, referenceId } = req.body;
    const wallet = await spend(userId, amount, source, referenceId);
    res.json(wallet);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Withdraw (App → Blockchain) [Step 1: record only]
router.post("/withdraw", async (req, res) => {
  try {
    const { userId, amount, toWallet } = req.body;
    const result = await requestWithdraw(userId, amount, toWallet);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Deposit (Blockchain → App) [Step 1: admin or webhook later]
router.post("/deposit", async (req, res) => {
  try {
    const { userId, amount, txHash } = req.body;
    const result = await deposit(userId, amount, txHash);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
