import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const todos = searchParams.get('todos') === 'true'
    
    // Busca todos e filtra no JS para evitar problemas de schema
    const todosProdutos = await prisma.produto.findMany({
      include: {
        _count: {
          select: { vendas: true }
        }
      },
      orderBy: {
        atualizadoEm: 'desc'
      }
    })
    
    // Filtra no JavaScript se não quiser mostrar inativos
    const produtos = todos 
      ? todosProdutos 
      : todosProdutos.filter(p => p.ativo !== false)
    return NextResponse.json(produtos)
  } catch (error: any) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json({ error: 'Erro ao buscar produtos', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, linkProduto, custo, precoVenda, quantidade } = body

    if (!nome || custo === undefined || precoVenda === undefined || quantidade === undefined) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const produto = await prisma.produto.create({
      data: {
        nome,
        linkProduto: linkProduto || null,
        custo,
        precoVenda,
        quantidade: parseInt(quantidade)
      }
    })

    return NextResponse.json(produto)
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}
