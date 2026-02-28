import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const socio = await prisma.socio.findUnique({
      where: { id: socioId },
      include: {
        cotas: {
          include: {
            estoque: {
              include: {
                produto: true,
              },
            },
          },
        },
        distribuicoes: {
          orderBy: { dataDistribuicao: 'desc' },
          take: 50,
        },
        saques: {
          orderBy: { dataSolicitacao: 'desc' },
          take: 20,
        },
        dividas: {
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

    // Calcula totais
    const totalDistribuicoesPendentes = socio.distribuicoes
      .filter((d) => d.status === 'PENDENTE')
      .reduce((sum, d) => sum + Number(d.valor), 0)

    const totalDistribuicoesLiberadas = socio.distribuicoes
      .filter((d) => d.status === 'LIBERADO')
      .reduce((sum, d) => sum + Number(d.valor), 0)

    const totalDistribuicoesRetidas = socio.distribuicoes
      .filter((d) => d.status === 'RETIDO')
      .reduce((sum, d) => sum + Number(d.valor), 0)

    const totalDividas = socio.dividas.reduce(
      (sum, d) => sum + Number(d.valorPendente),
      0
    )

    // Posições em estoques (cotas)
    const posicoes = socio.cotas.map((c) => ({
      estoqueId: c.estoqueId,
      estoqueNome: c.estoque.nome,
      tipo: c.estoque.tipo,
      produtoNome: c.estoque.produto.nome,
      quantidadeEmEstoque: c.estoque.quantidadeDisponivel,
      percentual: Number(c.percentual),
      valorInvestido: Number(c.valorInvestido),
      valorAtual: Number(c.estoque.valorTotalInvestido) * (Number(c.percentual) / 100),
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
        historicoRecente: socio.distribuicoes.map((d) => ({
          id: d.id,
          valor: Number(d.valor),
          status: d.status,
          data: d.dataDistribuicao,
        })),
      },
      saques: {
        recentes: socio.saques.map((s) => ({
          id: s.id,
          valor: Number(s.valor),
          status: s.status,
          dataSolicitacao: s.dataSolicitacao,
          dataPagamento: s.dataPagamento,
        })),
      },
      dividas: {
        total: totalDividas,
        items: socio.dividas.map((d) => ({
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
