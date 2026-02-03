import mongoose from "mongoose";

const WalletLedgerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["EARN", "SPEND", "WITHDRAW", "DEPOSIT", "ADJUST"], 
    required: true 
  },
  source: { type: String }, // spinwheel, referral, order, admin, blockchain
  amount: { type: Number, required: true }, // +credit / -debit
  balanceAfter: { type: Number, required: true },
  referenceId: { type: String }, // orderId / txHash / adminNote
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("WalletLedger", WalletLedgerSchema);
