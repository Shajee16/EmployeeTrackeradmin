import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = 'admin-portal-secret-key-2026-super-secure';
const key = new TextEncoder().encode(secretKey);

export async function createToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const c = await cookies();
  const token = c.get('admin_session')?.value;
  if (!token) return null;
  return await verifyToken(token);
}
