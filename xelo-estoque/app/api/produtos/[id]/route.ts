import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { ativo } = body
    
    console.log('PATCH produto:', params.id, 'ativo:', ativo)

    const produto = await prisma.produto.update({
      where: { id: params.id },
      data: { ativo }
    })

    return NextResponse.json(produto)
  } catch (error: any) {
    console.error('Erro ao atualizar produto:', error)
    console.error('Error meta:', error.meta)
    return NextResponse.json({ 
      error: 'Erro ao atualizar produto', 
      details: error.message,
      code: error.code,
      meta: error.meta
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete: marca como inativo em vez de deletar
    await prisma.produto.update({
      where: { id: params.id },
      data: { ativo: false }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir produto:', error)
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 })
  }
}
