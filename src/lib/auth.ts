import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

// SEC-001 — sem fallback, e falhando fechado.
//
// Havia aqui uma senha embutida no código, usada quando JWT_SECRET não
// estivesse definido. Quem lesse o repositório assinaria um token com
// role 'master' para qualquer salão — bypass total de autenticação e de
// isolamento entre clientes. E falhava em silêncio: só um console.warn,
// com o sistema seguindo normalmente.
//
// Verificado em produção antes de remover (JWT_SECRET presente, 48
// caracteres), então nenhuma sessão existente foi assinada com o fallback
// e ninguém é deslogado por esta mudança.
//
// Agora, sem a variável, o sistema não sobe. É proposital: aplicação sem
// segredo de assinatura não deve autenticar ninguém.
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error(
    '[AUTH] JWT_SECRET não configurado. Defina a variável de ambiente ' +
    '(Vercel > Settings > Environment Variables) em Production, Preview e Development. ' +
    'O sistema não autentica sem ela — e não deve mesmo.',
  )
}
if (jwtSecret.length < 32) {
  throw new Error('[AUTH] JWT_SECRET curto demais. Use 32 caracteres ou mais.')
}
const JWT_SECRET = new TextEncoder().encode(jwtSecret)

export interface JWTPayload {
  userId: string
  email: string
  role: 'master' | 'salon' | 'sub' | 'profissional'
  salaoId?: string
  salaoNome?: string
  plano?: string
  permissoes?: string[]
  nome?: string
  profissionalId?: string
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
