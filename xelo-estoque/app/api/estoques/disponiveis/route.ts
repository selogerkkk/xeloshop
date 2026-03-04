import { NextResponse } from 'next/server'
import { buscarEstoquesDisponiveis } from '@/lib/services/estoqueService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const produtoId = searchParams.get('produtoId')
    const quantidadeMinima = searchParams.get('quantidadeMinima')

    if (!produtoId) {
      return NextResponse.json(
        { error: 'produtoId é obrigatório' },
        { status: 400 }
      )
    }

    // Valida quantidadeMinima
    const qtdMinima = quantidadeMinima ? parseInt(quantidadeMinima, 10) : 1
    if (!Number.isFinite(qtdMinima) || qtdMinima <= 0) {
      return NextResponse.json(
        { error: 'quantidadeMinima deve ser um número inteiro positivo' },
        { status: 400 }
      )
    }

    const estoques = await buscarEstoquesDisponiveis(produtoId, qtdMinima)

    return NextResponse.json(estoques)
  } catch (error) {
    console.error('Erro ao buscar estoques disponíveis:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estoques disponíveis' },
      { status: 500 }
    )
  }
}
