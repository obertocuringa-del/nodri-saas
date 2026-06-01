import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

// FIX: JWT_SECRET sem fallback — se não configurado, lança erro na inicialização
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET não configurado. Adicione nas variáveis de ambiente do Vercel.')
  }
  console.warn('[AUTH] JWT_SECRET não configurado — usando valor padrão apenas em desenvolvimento')
}
const JWT_SECRET = new TextEncoder().encode(jwtSecret || 'nodri_dev_secret_only')

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
