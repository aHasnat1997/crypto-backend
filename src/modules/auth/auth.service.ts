import { Rocket } from '../../app';
import bcrypt from 'bcryptjs';
import { Response, Request } from 'express';
import { Token } from '../../utils/token';
import { TTokenPayload } from '../../types/token.type';
import { TResetPassword, TSetNewPassword, TUser } from '../../types/users.type';
import { sandMail } from '../../controllers/sendMail';
import path from 'path';
import ejs from "ejs";

export class AuthService {
  private app: Rocket;
  constructor(app: Rocket) {
    this.app = app;
  }

  async login(data: { email: string; password: string }, res: Response) {
    const { email, password } = data;
    const user = await this.app.db.client.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new Error('Invalid credentials')
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Password Incorrect.')
    }
    const tokenPayload: TTokenPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      img: user.img as string,
      role: user.role
    }
    const token = Token.sign(
      tokenPayload,
      this.app.config.TOKEN.TOKEN_SECRET,
      this.app.config.TOKEN.TOKEN_EXPIRES_TIME
    );
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return token;
  }

  async logout(res: Response) {
    res.clearCookie('token');
    return 'Successfully Logout'
  }

  async me(req: Request) {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    const decoded = Token.verify(token, this.app.config.TOKEN.TOKEN_SECRET) as { id: string };
    const user = await this.app.db.client.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, fullName: true }
    });
    if (!user) return null;
    return user;
  }

  async resetPassword(userData: TUser, payload: TResetPassword) {
    const isOldPasswordMatch = await bcrypt.compare(payload.oldPassword, userData.password);

    if (!isOldPasswordMatch) throw new Error('Old password not matched.');

    const newHashPassword = await bcrypt.hash(payload.newPassword, Number(this.app.config.BCRYPT_SALT_ROUNDS));

    const result = await this.app.db.client.user.update({
      where: {
        id: userData.id
      },
      data: {
        password: newHashPassword
      },
      select: {

      }
    });

    return result;
  }

  async forgetPassword(fullClientUrl: string, email: string) {
    // Find the user in the database by email
    const isUserExisted = await this.app.db.client.user.findUniqueOrThrow({
      where: { email }
    });

    // Throw an error if the user is not active
    if (isUserExisted.isStatus === false) throw new Error('User not active!');

    // Create a token payload with user details
    const tokenPayload: TTokenPayload = {
      id: isUserExisted.id,
      fullName: isUserExisted.fullName,
      img: isUserExisted.img,
      email: isUserExisted.email,
      role: isUserExisted.role
    }

    // Generate a token for password reset
    const forgetPasswordToken = Token.sign(tokenPayload, this.app.config.TOKEN.FORGOT_TOKEN_SECRET, this.app.config.TOKEN.FORGOT_TOKEN_EXPIRES_TIME);
    // Create a reset link with the token
    const resetLink = `${fullClientUrl}?status=200&success=true&forgetToken=${forgetPasswordToken}`;

    // Render the email template using EJS
    const emailHtml = await ejs.renderFile(
      path.join(__dirname, '../../views/emails/forgetPassword.ejs'),
      { firstName: isUserExisted.fullName, resetLink }
    );

    // Send a forget password email with the reset link
    await sandMail({
      to: isUserExisted.email, // Send to the user's email
      subject: 'Forget Password', // Set the email subject
      html: emailHtml // Set the email content
    });

    return null; // Return null after sending the email
  };

  async setNewPassword(payload: TSetNewPassword) {
    // Verify the provided token
    const isTokenOk = Token.verify(payload.token, this.app.config.TOKEN.FORGOT_TOKEN_SECRET) as TTokenPayload;
    // Throw an error if the token is invalid
    if (!isTokenOk) throw new Error('Unauthorize to reset password.');

    // Find the user in the database by email
    const isUserExisted = await this.app.db.client.user.findFirstOrThrow({
      where: {
        email: isTokenOk.email,
      }
    });
    // Throw an error if the user is not active
    if (isUserExisted.isStatus === false) throw new Error('User not active!');

    // Hash the new password with the configured salt rounds
    const newHashPassword = await bcrypt.hash(payload.newPassword, Number(this.app.config.BCRYPT_SALT_ROUNDS));

    // Update the user's password in the database and select specific fields to return
    const result = await this.app.db.client.user.update({
      where: {
        email: isUserExisted.email
      },
      data: {
        password: newHashPassword
      },
      select: {
        fullName: true,
        email: true,
        role: true
      }
    })

    // Return the result of the update operation
    return result;
  };
}
