import jwt from "jsonwebtoken";
import { TTokenPayload } from "../types/token.type";
import { StringValue } from "ms";

const blackListedTokens: string[] = [];

/**
 * Sign a unique token for a user.
 * 
 * @param {TTokenPayload} payload - The payload to sign.
 * @param {string} secret - The secret key to sign the token.
 * @param {string} expiresIn - The token expiration time.
 * @returns {string} - The signed token.
 */
const sign = (payload: TTokenPayload, secret: string, expiresIn: StringValue): string => {
  const token = jwt.sign(payload, secret, { expiresIn });
  return token;
};

/**
 * Verify a user token.
 * 
 * @param {string} token - The token to verify.
 * @param {string} secret - The secret key to verify the token.
 * @returns {string | jwt.JwtPayload | TTokenPayload} - The decoded token payload if valid.
 */
const verify = (token: string, secret: string): string | jwt.JwtPayload | TTokenPayload => {
  const verified = jwt.verify(token, secret);
  return verified;
};

/**
 * Decode the payload from a token without verifying.
 * 
 * @param {string} token - The token to decode.
 * @returns {string | jwt.JwtPayload | null | TTokenPayload} - The decoded token payload.
 */
const decode = (token: string): string | jwt.JwtPayload | null | TTokenPayload => {
  const decoded = jwt.decode(token);
  return decoded;
};

/**
 * Blacklist a token.
 * 
 * @param {string} token - The token to blacklist.
 */
const blacklist = (token: string): void => {
  blackListedTokens.push(token);
};

/**
 * Check if a token is blacklisted.
 * 
 * @param {string} token - The token to check.
 * @returns {boolean} - Returns true if the token is not blacklisted, false otherwise.
 */
const isTokenBlacklisted = (token: string): boolean => {
  const isMatch = blackListedTokens.find(t => t === token);
  return !isMatch;
};

export const Token = { sign, verify, decode, blacklist, isTokenBlacklisted };
