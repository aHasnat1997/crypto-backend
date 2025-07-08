import nodemailer from 'nodemailer';
import config from '../config';

const transporter = nodemailer.createTransport({
  host: config.SMTP.HOST,
  port: Number(config.SMTP.PORT),
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: config.SMTP.USER,
    pass: config.SMTP.PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// async..await is not allowed in global scope, must use a wrapper
export async function sandMail(payload: {
  to: string,
  subject: string,
  html: string
}) {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: config.SMTP.USER, // sender address
    to: payload.to, // list of receivers
    subject: payload.subject, // Subject line
    html: payload.html, // html body
  });

  console.log("Message sent: %s", info.messageId);
};