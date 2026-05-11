import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Read secret from environment — uses lazy initialization so it doesn't
// crash during Vercel's build-time page data collection (env vars aren't
// available at build time).
let _key;
function getKey() {
  if (!_key) {
    const secretKeyStr = process.env.ADMIN_JWT_SECRET;
    if (!secretKeyStr && process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_JWT_SECRET environment variable is required in production');
    }
    _key = new TextEncoder().encode(secretKeyStr || 'admin-portal-dev-fallback-key');
  }
  return _key;
}

export async function createToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getKey());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getKey());
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

/**
 * RBAC guard — checks authentication AND role.
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['System Admin'])
 * @returns {{ error: boolean, session: object|null, response: Response|null }}
 */
export async function requireRole(allowedRoles = ['System Admin']) {
  const session = await getSession();
  if (!session) {
    return {
      error: true,
      session: null,
      response: { error: 'Authentication required', status: 401 },
    };
  }
  if (!allowedRoles.includes(session.role)) {
    return {
      error: true,
      session,
      response: { error: 'Forbidden: insufficient privileges', status: 403 },
    };
  }
  return { error: false, session, response: null };
}
