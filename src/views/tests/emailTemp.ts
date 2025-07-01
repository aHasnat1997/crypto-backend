import { Request, Response, Router } from "express";
import config from "../../config";
import path from 'path';
import ejs from "ejs";

export const EmailTest = Router();

EmailTest.get('/emails/forget-password', async (req: Request, res: Response) => {
  const resetLink = `${config.CLINT_URL}?status=200&success=true&forgetToken=dummyToken`;
  const firstName = 'John';

  const emailHtml = await ejs.renderFile(
    path.join(__dirname, '../emails/forgetPassword.ejs'),
    { firstName, resetLink }
  );

  res.send(emailHtml);
});