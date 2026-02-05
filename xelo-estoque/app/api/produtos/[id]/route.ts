import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.produto.delete({
      where: { id: params.id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir produto:', error)
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 })
  }
}
