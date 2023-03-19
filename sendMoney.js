const { db } = require("./firebaseConfig");
const { getUser } = require("./userRegistration");
const { transferQueue } = require("./jobQueue");
const retry = require("async-retry");

async function sendMoney(senderPhone, receiverPhone, amount) {
  // Get sender and receiver user objects
  const sender = await getUser(senderPhone);
  const receiver = await getUser(receiverPhone);

  // Check if the sender has enough balance
  if (sender.balance < amount) {
    throw new Error("Insufficient balance");
  }

  // Create a pending transaction
  const transactionData = {
    type: "send",
    amount,
    sender: senderPhone,
    receiver: receiverPhone,
    status: "pending",
    timestamp: new Date(),
  };

  const transactionRef = await db
    .collection("transactions")
    .add(transactionData);

  // Add a new background job to the transfer queue
  transferQueue.add({
    senderId: senderPhone,
    receiverId: receiverPhone,
    amount,
    transactionRef,
  });

  return `Transfer of ₦${amount} from ${sender.name} to ${receiver.name} initiated. A confirmation message will be sent to your phone when the transfer is complete.`;
}

module.exports = { sendMoney };
