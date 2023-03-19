const Queue = require("bull");
const { db } = require("./firebaseConfig");
const retry = require("async-retry");

// Configure the Redis connection
const redisConfig = {
  host: "127.0.0.1",
  port: 6379,
};

// Create a new Bull queue for processing money transfers
const transferQueue = new Queue("moneyTransfer", { redis: redisConfig });

// Job processor for handling money transfers
transferQueue.process(async (job) => {
  const { senderId, receiverId, amount, transactionRef } = job.data;

  await retry(
    async () => {
      // Perform the money transfer using a Firestore transaction
      await db.runTransaction(async (transaction) => {
        // Get the sender and receiver account references
        const senderRef = db.collection("accounts").doc(senderId);
        const receiverRef = db.collection("accounts").doc(receiverId);

        // Get the sender and receiver account data
        const senderDoc = await transaction.get(senderRef);
        const receiverDoc = await transaction.get(receiverRef);

        // Update the sender and receiver balances
        const newSenderBalance = senderDoc.data().balance - amount;
        const newReceiverBalance = receiverDoc.data().balance + amount;

        transaction.update(senderRef, { balance: newSenderBalance });
        transaction.update(receiverRef, { balance: newReceiverBalance });

        // Update the transaction status to "successful"
        transaction.update(transactionRef, { status: "successful" });
      });
    },
    {
      retries: 2, // Retry up to 2 times
      minTimeout: 10000, // Wait for 2 seconds before each retry attempt
    }
  );
});

// ... (existing code for the failed event)

transferQueue.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed successfully`);
});

module.exports = { transferQueue };
