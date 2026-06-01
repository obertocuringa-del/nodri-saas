import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

// SEGURANÇA: JWT_SECRET deve ser configurado nas variáveis de ambiente do Vercel
// Se não estiver configurado, usa fallback (menos seguro — configure JWT_SECRET no Vercel!)
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  console.warn('[AUTH] ATENÇÃO: JWT_SECRET não configurado nas variáveis de ambiente! Configure em Vercel > Settings > Environment Variables')
}
const JWT_SECRET = new TextEncoder().encode(jwtSecret || 'nodri_fallback_configure_jwt_secret_no_vercel')

export interface JWTPayload {
  userId: string
  email: string
  role: 'master' | 'salon'
  salaoId?: string
  salaoNome?: string
  plano?: string
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
