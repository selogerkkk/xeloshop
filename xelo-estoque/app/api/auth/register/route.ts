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

    const passwordHash = await hashPassword(password)

    // Tenta criar o usuário diretamente - constraint única no banco previne duplicatas
    // Isso é atômico e evita TOCTOU (Time-Of-Check-Time-Of-Use)
    const user = await prisma.usuarios.create({
      data: {
        nome,
        email,
        passwordHash,
      }
    }).catch((error) => {
      // Se violou constraint única (email já existe)
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return null
      }
      throw error
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 409 }
      )
    }

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