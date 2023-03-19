const admin = require("firebase-admin");

const serviceAccount = require("./ching-bot-firebase-adminsdk-d61qa-f4202e4d84.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { admin, db };
