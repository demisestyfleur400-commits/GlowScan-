const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = process.env[m[1]] || m[2];
}
const twilio = require('twilio');
const sid = process.env.TWILIO_ACCOUNT_SID;
const tok = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_WHATSAPP_FROM;
const client = twilio(sid, tok);
client.messages.create({
  from,
  to: "whatsapp:+237674377959",
  body: "Test GlowScan DERM — connexion Twilio WhatsApp OK"
}).then(msg => {
  console.log("Envoyé. SID:", msg.sid, "status:", msg.status);
}).catch(err => {
  console.error("Erreur complète:", JSON.stringify({
    message: err.message, code: err.code, status: err.status,
    moreInfo: err.moreInfo, details: err.details
  }, null, 2));
});
