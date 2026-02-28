import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { nome, email, password } = await request.json()

    if (!nome || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.usuarios.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.usuarios.create({
      data: {
        id: crypto.randomUUID(),
        nome,
        email,
        passwordHash,
        atualizadoEm: new Date()
      }
    })

    const token = await createToken({
      id: user.id,
      email: user.email,
      nome: user.nome
    })

    setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Erro no registro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}