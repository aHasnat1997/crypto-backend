import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { Token } from "./token";

vi.mock('jsonwebtoken');

describe('Token', () => {
  const secret = 'test-secret';
  const payload = { id: '123', name: 'Jon' };
  const generatedToken = 'test-token';
  const decodedPayload = { id: '123', name: 'Jon' };
  const expiresIn = "1h";


  it('should sign a token', async () => {
    vi.spyOn(jwt, 'sign').mockResolvedValue(generatedToken as any);

    const result = await Token.sign(payload, secret, expiresIn);

    expect(result).toBe(generatedToken);
    expect(jwt.sign).toHaveBeenCalledWith(payload, secret, { expiresIn });
  });

  it('should verify token', async () => {
    vi.spyOn(jwt, 'verify').mockResolvedValue(decodedPayload as any);

    const result = await Token.verify(generatedToken, secret);

    expect(result).toBe(decodedPayload);
    expect(jwt.verify).toHaveBeenCalledWith(generatedToken, secret)
  })
})
