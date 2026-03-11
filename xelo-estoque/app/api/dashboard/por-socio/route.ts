import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { saques } from '@prisma/client'

// Custom types that don't extend Prisma models to avoid Decimal/number conflicts
type DividaComValorPendente = {
  id: string
  socioId: string
  valorOriginal: number
  valorPendente: number
  motivo: string
  referenciaId: string | null
  status: string
  dataCriacao: Date
  dataQuitacao: Date | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const socioId = searchParams.get('socioId')

    if (!socioId) {
      return NextResponse.json(
        { error: 'socioId é obrigatório' },
        { status: 400 }
      )
    }

    // Busca sócio com cotas e dívidas
    const socio = await prisma.socios.findUnique({
      where: { id: socioId },
      include: {
        cotas: {
          include: {
            estoques: {
              include: {
                produtos: true,
              },
            },
          },
        },
        dividas_ajuste: {
          where: { status: 'ATIVA' },
        },
      },
    })

    if (!socio) {
      return NextResponse.json(
        { error: 'Sócio não encontrado' },
        { status: 404 }
      )
    }

    // Busca distribuições dos últimos 365 dias (limitado a 1000)
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - 365)

    const todasDistribuicoes = await prisma.distribuicoes_lucro.findMany({
      where: {
        socioId,
        dataDistribuicao: { gte: dataLimite }
      },
      orderBy: { dataDistribuicao: 'desc' },
      select: {
        id: true,
        valor: true,
        status: true,
        dataDistribuicao: true,
      },
      take: 1000,
    })

    // O histórico são as 50 primeiras da lista completa
    const historicoDistribuicoes = todasDistribuicoes.slice(0, 50)

    // Busca saques recentes
    const saquesRecentes = await prisma.saques.findMany({
      where: { socioId },
      orderBy: { dataSolicitacao: 'desc' },
      take: 20,
    })

    // Calcula totais a partir de TODAS as distribuições
    const totalDistribuicoesPendentes = todasDistribuicoes
      .filter((d) => d.status === 'PENDENTE')
      .reduce((sum, d) => sum + Number(d.valor), 0)

    const totalDistribuicoesLiberadas = todasDistribuicoes
      .filter((d) => d.status === 'LIBERADO')
      .reduce((sum, d) => sum + Number(d.valor), 0)

    const totalDistribuicoesRetidas = todasDistribuicoes
      .filter((d) => d.status === 'RETIDO')
      .reduce((sum, d) => sum + Number(d.valor), 0)

    const totalDividas = socio.dividas_ajuste.reduce(
      (sum, d) => sum + Number(d.valorPendente),
      0
    )

    // Posições em estoques (cotas)
    const posicoes = socio.cotas.map((c) => ({
      estoqueId: c.estoqueId,
      estoqueNome: c.estoques.nome,
      tipo: c.estoques.tipo,
      produtoNome: c.estoques.produtos.nome,
      quantidadeEmEstoque: c.estoques.quantidadeDisponivel,
      percentual: Number(c.percentual),
      valorInvestido: Number(c.valorInvestido),
      valorAtual: Number(c.estoques.valorTotalInvestido) * (Number(c.percentual) / 100),
    }))

    return NextResponse.json({
      socio: {
        id: socio.id,
        nome: socio.nome,
        tipo: socio.tipo,
        cor: socio.cor,
        ativo: socio.ativo,
        saldoDisponivel: Number(socio.saldoDisponivel),
        saldoPendente: Number(socio.saldoPendente),
        totalInvestido: Number(socio.totalInvestido),
        totalRecebido: Number(socio.totalRecebido),
        totalSacado: Number(socio.totalSacado),
      },
      distribuicoes: {
        pendente: totalDistribuicoesPendentes,
        liberado: totalDistribuicoesLiberadas,
        retido: totalDistribuicoesRetidas,
        historicoRecente: historicoDistribuicoes.map((d) => ({
          id: d.id,
          valor: Number(d.valor),
          status: d.status,
          data: d.dataDistribuicao,
        })),
      },
      saques: {
        recentes: saquesRecentes.map((s: saques) => ({
          id: s.id,
          valor: Number(s.valor),
          status: s.status,
          dataSolicitacao: s.dataSolicitacao,
          dataPagamento: s.dataPagamento,
        })),
      },
      dividas: {
        total: totalDividas,
        items: socio.dividas_ajuste.map((d) => ({
          id: d.id,
          valorOriginal: Number(d.valorOriginal),
          valorPendente: Number(d.valorPendente),
          motivo: d.motivo,
          dataCriacao: d.dataCriacao,
        })),
      },
      posicoes,
    })
  } catch (error) {
    console.error('Erro ao buscar dados do sócio:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do sócio' },
      { status: 500 }
    )
  }
}
