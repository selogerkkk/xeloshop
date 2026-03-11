export interface Socio {
  id: string
  nome: string
  cor: string
  tipo: string
  ativo: boolean
  saldoDisponivel: number
  saldoPendente: number
  totalInvestido: number
  totalRecebido: number
  totalSacado: number
}

export interface Produto {
  id: string
  nome: string
  ativo: boolean
}

export interface Estoque {
  id: string
  nome: string
  tipo: 'INDIVIDUAL' | 'POOL'
  produtoNome: string
  quantidadeDisponivel: number
  quantidadeTotal: number
  custoMedio: number
  valorTotalInvestido: number
  cotas: Cota[]
}

export interface Cota {
  socioId: string
  socioNome: string
  socioCor: string
  percentual: number
  valorInvestido: number
}

export interface DashboardResumo {
  periodo: number
  geral: {
    estoquesAtivos: number
    sociosAtivos: number
    vendas: {
      totalVendas: number
      receitaTotal: number
      custoTotal: number
      lucroTotal: number
      porCanal: Record<string, { receita: number; lucro: number }>
    }
    entradas: {
      totalEntradas: number
      totalInvestido: number
    }
    saques: {
      totalSaques: number
      valorTotal: number
    }
    distribuicoes: {
      totalDistribuicoes: number
      valorTotal: number
    }
    dividas: {
      totalDividas: number
      valorTotal: number
    }
  }
  socios: Socio[]
  estoques: Estoque[]
}

export interface SocioDashboardData {
  socio: Socio
  distribuicoes: {
    pendente: number
    liberado: number
    retido: number
    historicoRecente: {
      id: string
      valor: number
      status: string
      data: string
    }[]
  }
  saques: {
    recentes: {
      id: string
      valor: number
      status: string
      dataSolicitacao: string
      dataPagamento: string | null
    }[]
  }
  dividas: {
    total: number
    items: {
      id: string
      valorOriginal: number
      valorPendente: number
      motivo: string
      dataCriacao: string
    }[]
  }
  posicoes: {
    estoqueId: string
    estoqueNome: string
    tipo: string
    produtoNome: string
    quantidadeEmEstoque: number
    percentual: number
    valorInvestido: number
    valorAtual: number
    cotas: {
      socioNome: string
      socioCor: string
      percentual: number
    }[]
  }[]
}
