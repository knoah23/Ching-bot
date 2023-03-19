const Paystack = require("paystack-node");
const paystack = new Paystack(
  "sk_live_20f0a06621c67f7af1bb1f761429462c74b8c26c"
);

module.exports = paystack;
