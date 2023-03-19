const express = require("express");
const bodyParser = require("body-parser");
const { db } = require("./firebaseConfig");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Twilio webhook route
app.post("/webhook", async (req, res) => {
  const message = req.body.Body;
  const sender = req.body.From;

  await processMessage(sender, message);

  res.sendStatus(200);
});

// Payment processor webhook route
app.post("/paystack-webhook", async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "transfer.success") {
      const transactionRef = db
        .collection("transactions")
        .doc(event.data.reference);

      await transactionRef.update({
        status: "successful",
      });
    } else if (event.event === "transfer.failed") {
      const transactionRef = db
        .collection("transactions")
        .doc(event.data.reference);

      await transactionRef.update({
        status: "failed",
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling Paystack webhook:", error);
    res.sendStatus(500);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const { sendMessage } = require("./twilioConfig");
const { createUser, getUser } = require("./userRegistration");
const { transferMoney } = require("./sendMoney");
const { createPendingTransaction } = require("./receiveMoney");

const registrationRegex = /^REGISTER (.*),\s*(\+[\d]{1,15}),\s*(\d{4})$/i;
const sendMoneyRegex = /^SEND (\d+) TO (\+[\d]{1,15}|[a-zA-Z0-9._-]+)$/i;
const receiveMoneyRegex =
  /^RECEIVE (\d+) FROM (\+[\d]{1,15}|[a-zA-Z0-9._-]+)$/i;
const confirmTransactionRegex = /^CONFIRM ([a-zA-Z0-9]{6})$/i;

async function processMessage(sender, message) {
  const registrationMatch = message.match(registrationRegex);
  const sendMoneyMatch = message.match(sendMoneyRegex);
  const receiveMoneyMatch = message.match(receiveMoneyRegex);
  const confirmTransactionMatch = message.match(confirmTransactionRegex);

  // Handle registration command
  if (registrationMatch) {
    const username = registrationMatch[1];
    const phoneNumber = registrationMatch[2];
    const pin = registrationMatch[3];

    try {
      const user = await createUser(username, phoneNumber, pin);
      await sendMessage(
        phoneNumber,
        `Welcome to Ching, ${username}! Your account has been created.`
      );
    } catch (error) {
      await sendMessage(
        phoneNumber,
        `An error occurred while creating your account: ${error.message}`
      );
    }
  }
  // Handle send money command
  else if (sendMoneyMatch) {
    const amount = parseFloat(sendMoneyMatch[1]);
    const receiverIdentifier = sendMoneyMatch[2];

    try {
      const senderUser = await getUser(sender);
      const receiverUser = await getUser(receiverIdentifier);
      await transferMoney(senderUser, receiverUser, amount);
      await sendMessage(
        sender,
        `You've successfully sent ${amount} to ${receiverUser.username}.`
      );
      await sendMessage(
        receiverUser.phoneNumber,
        `You've received ${amount} from ${senderUser.username}.`
      );
    } catch (error) {
      await sendMessage(
        sender,
        `An error occurred while sending money: ${error.message}`
      );
    }
  }
  // Handle receive money command
  else if (receiveMoneyMatch) {
    const amount = parseFloat(receiveMoneyMatch[1]);
    const senderIdentifier = receiveMoneyMatch[2];

    try {
      const transaction = await createPendingTransaction(
        sender,
        senderIdentifier,
        amount
      );
      await sendMessage(
        senderIdentifier,
        `You have a new transaction request from ${sender} for ${amount}. To confirm this transaction, please reply with: CONFIRM ${transaction.transactionId}`
      );
      await sendMessage(
        sender,
        "A confirmation request has been sent to the sender. The transaction will be processed once they confirm."
      );
    } catch (error) {
      await sendMessage(
        sender,
        `An error occurred while creating the transaction: ${error.message}`
      );
    }
  }
  // Handle confirm transaction command
  else if (confirmTransactionMatch) {
    const transactionId = confirmTransactionMatch[1];

    try {
      const transaction = await db
        .collection("transactions")
        .where("transactionId", "==", transactionId)
        .where("status", "==", "pending")
        .get();

      if (transaction.empty) {
        throw new Error("Transaction not found or already confirmed.");
      }

      const transactionData = transaction.docs[0].data();
      const senderUser = await getUser(transactionData.sender);
      const receiverUser = await getUser(transactionData.receiver);

      if (sender !== senderUser.phoneNumber) {
        throw new Error("You are not authorized to confirm this transaction.");
      }

      await transferMoney(senderUser, receiverUser, transactionData.amount);
      await db
        .collection("transactions")
        .doc(transaction.docs[0].id)
        .update({ status: "confirmed" });

      await sendMessage(
        senderUser.phoneNumber,
        `You've successfully sent ${transactionData.amount} to ${receiverUser.username}.`
      );
      await sendMessage(
        receiverUser.phoneNumber,
        `You've received ${transactionData.amount} from ${senderUser.username}.`
      );
    } catch (error) {
      await sendMessage(
        sender,
        `An error occurred while confirming the transaction: ${error.message}`
      );
    }
  }
  // Handle unrecognized commands
  else {
    await sendMessage(
      sender,
      "Unrecognized command. Please use one of the following commands: REGISTER {name}, {phone number}, {4-digit PIN}, SEND {amount} TO {receiver}, RECEIVE {amount} FROM {sender}, CONFIRM {transactionId}"
    );
  }
}
