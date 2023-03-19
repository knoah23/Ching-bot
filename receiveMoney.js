async function createPendingTransaction(sender, receiver, amount) {
  const { nanoid } = await import("nanoid");

  const transactionData = {
    type: "receive",
    amount,
    sender,
    receiver,
    status: "pending",
    transactionId: nanoid(6),
    timestamp: new Date(),
  };

  const transactionRef = await db
    .collection("transactions")
    .add(transactionData);
  return { ...transactionData, id: transactionRef.id };
}

module.exports = {
  createPendingTransaction,
};
