const { createVirtualAccount } = require("./paystackConfig");
const { db } = require("./firebaseConfig");

async function registerUser(phoneNumber, name, pin) {
  const userRef = db.collection("users").doc(phoneNumber);

  const userSnapshot = await userRef.get();
  if (userSnapshot.exists) {
    throw new Error("User already exists");
  }

  const nameSnapshot = await db
    .collection("users")
    .where("name", "==", name)
    .get();
  if (!nameSnapshot.empty) {
    throw new Error("Username already in use");
  }

  const virtualAccount = await createVirtualAccount(name);
  const userData = {
    name,
    pin,
    balance: 0,
    virtualAccount,
  };

  await userRef.set(userData);

  return virtualAccount;
}

module.exports = { registerUser };
