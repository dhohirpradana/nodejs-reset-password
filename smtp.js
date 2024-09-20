import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

var name = process.env.NAME;
var host = process.env.HOST;
var user = process.env.USER;
var pass = process.env.PASS;
var serviceName = process.env.SERVICE_NAME;

function sendMail(email, key, res) {
  var recipient = email;

  const transporter = nodemailer.createTransport({
    host: host,
    port: 587, // Port can be 465 for SSL or 587 for TLS
    secure: false, // Use true for port 465, false for other ports
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false, // Disable strict validation
    },
  });

  // Set up email data
  const mailOptions = {
    from: `"${name}" ${user}`, // Sender address
    to: recipient, // List of recipients
    subject: "Password Reset Request ✔", // Subject line
    text: `Hello ${recipient},

We received a request to reset your password for your ${serviceName} account. If you didn't make this request, you can ignore this email.

To reset your password, click the link below:
https://emas.bodha.co.id/en/reset-password?key=${key}

If you have any questions, feel free to contact our support team.

Best regards,
${serviceName} Support`, // Plain text body
    //   html: "<b>Hello world?</b>", // HTML body
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(400).json({ error: "Password reset mail not sent!" });
    }
    console.log("Message sent: %s", info.messageId);
    return res.status(200).json({ message: "Password reset mail sent" });
  });
}

export { sendMail };
