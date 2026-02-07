import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('Missing environment variable: JWT_SECRET')
}
const TOKEN_NAME = 'auth-token'

export interface UserPayload {
  id: string
  email: string
  nome: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createToken(user: UserPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return {
      id: String(payload.id),
      email: String(payload.email),
      nome: String(payload.nome)
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function setAuthCookie(token: string) {
  cookies().set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

export function deleteAuthCookie() {
  cookies().delete(TOKEN_NAME)
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  const token = cookies().get(TOKEN_NAME)?.value
  if (!token) return null
  
  return verifyToken(token)
}