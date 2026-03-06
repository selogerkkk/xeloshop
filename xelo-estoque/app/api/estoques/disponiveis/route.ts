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

    // Valida quantidadeMinima - verifica se é uma string válida de inteiro não-negativo antes de fazer parse
    let qtdMinima = 1 // valor padrão

    if (quantidadeMinima) {
      // Verificação estrita: deve conter apenas dígitos e não estar vazio
      if (!/^\d+$/.test(quantidadeMinima)) {
        return NextResponse.json(
          { error: 'quantidadeMinima deve ser um número inteiro positivo' },
          { status: 400 }
        )
      }
      qtdMinima = parseInt(quantidadeMinima, 10)
      if (qtdMinima <= 0) {
        return NextResponse.json(
          { error: 'quantidadeMinima deve ser um número inteiro positivo' },
          { status: 400 }
        )
      }
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
