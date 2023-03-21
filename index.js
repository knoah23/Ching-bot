const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const userRegistration = require("./userRegistration.js");
const sendMoney = require("./sendMoney.js");

const accountSid = "ACe53aa22eea8850b695a962cb6b04eb3d";
const authToken = "716d830f094316706ff331a62a5167a0";

// Create a new instance of the Twilio client
const client = new twilio.Twilio(accountSid, authToken);

const app = express();
const PORT = process.env.PORT || 3030;

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

// Parse incoming request bodies as JSON
app.use(bodyParser.json());

// Handle incoming WhatsApp messages
app.post("/whatsapp", async (req, res) => {
  const message = req.body.Body;
  const from = req.body.From;

  // Check if the message contains the word "register"
  if (message.toLowerCase().includes("register")) {
    // Call the userRegistration function
    const result = await userRegistration(from);
    await client.messages.create({
      body: result,
      from: "whatsapp: +14155238886",
      to: "whatsapp:+2348023562567",
    });
  }
  // Check if the message contains the word "send"
  else if (message.toLowerCase().includes("send")) {
    // Call the sendMoney function
    const result = await sendMoney(from, message);
    await client.messages.create({
      body: result,
      from: "whatsapp: +14155238886",
      to: "whatsapp:+2348023562567",
    });
  }
  // Send a default response if the message doesn't match any commands
  else {
    await client.messages.create({
      body: "Sorry, I didn't understand that command. Please try again.",
      from: "whatsapp: +14155238886",
      to: "whatsapp:+2348023562567",
    });
  }

  res.send("");
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
