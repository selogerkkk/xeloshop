Excelente detalhe! Isso muda completamente a lógica. Vocês precisam de um sistema de **FIFO com rastreamento de reposição** e controle de "lucro pendente" vs "lucro disponível".

Aqui está a arquitetura ajustada para essa necessidade específica:

---

## 🏗️ Opção 4: "Lotes com Status de Disponibilidade" (Recomendada para vocês)

### Conceito chave:

Cada unidade de produto é um "lote unitário" rastreável com status:

- `EM_ESTOQUE` → disponível para venda, lucro vai para o sócio
- `EM_TRANSITO` → já foi comprado, está a caminho, ainda não gera lucro
- `VENDIDO` → vendido, lucro pode estar "bloqueado" aguardando reposição ou "liberado"

### Schema:

```prisma
model Socio {
  id       String   @id @default(uuid())
  nome     String   // "Você", "Amigo"
  cor      String   // "#3b82f6"
  ativo    Boolean  @default(true)
  ordem    Int      // 1 ou 2 (para definir quem repõe primeiro)

  lotes    Lote[]
  lucros   LucroDistribuicao[]

  // Totais calculados
  saldoDisponivel   Decimal @default(0) // Lucro já liberado para saque
  saldoPendente     Decimal @default(0) // Lucro bloqueado (aguardando reposição)
  totalInvestido    Decimal @default(0)
}

model Produto {
  id           String   @id @default(uuid())
  nome         String
  sku          String?  // Código interno opcional
  linkProduto  String?
  precoVenda   Decimal  // Preço base de venda

  lotes        Lote[]   // Todas as unidades deste produto
  vendas       Venda[]

  // Configuração padrão de rateio para novos lotes
  rateioPadrao RateioPadrao[]
}

model RateioPadrao {
  id          String   @id @default(uuid())
  produtoId   String
  produto     Produto  @relation(fields: [produtoId], references: [id])
  socioId     String
  socio       Socio    @relation(fields: [socioId], references: [id])

  percentual  Decimal  // ex: 50.00 para 50%
}

model Lote {
  id          String     @id @default(uuid())
  produtoId   String
  produto     Produto    @relation(fields: [produtoId], references: [id])

  // Quem comprou esta unidade específica
  socioId     String
  socio       Socio      @relation(fields: [socioId], references: [id])

  custo       Decimal    // Quanto custou esta unidade específica

  status      StatusLote @default(EM_TRANSITO)
  // EM_TRANSITO = comprado, a caminho
  // EM_ESTOQUE  = chegou, disponível para venda
  // VENDIDO     = foi vendido

  // Se foi vendido
  vendaId     String?
  venda       Venda?     @relation(fields: [vendaId], references: [id])

  // Controle de reposição
  repostoPor  String?    // socioId que repôs esta venda (se aplicável)
  dataReposicao DateTime?

  criadoEm    DateTime   @default(now())
  atualizadoEm DateTime  @updatedAt

  // Lucro desta unidade quando vendida
  lucroGerado Decimal?
  statusLucro StatusLucro @default(PENDENTE)
  // PENDENTE = vendido, mas produto ainda não foi reposto
  // LIBERADO = produto foi reposto, lucro disponível para sócio
  // REINVESTIDO = lucro ficou na empresa
}

enum StatusLote {
  EM_TRANSITO
  EM_ESTOQUE
  VENDIDO
}

enum StatusLucro {
  PENDENTE
  LIBERADO
  REINVESTIDO
}

model Venda {
  id          String   @id @default(uuid())
  produtoId   String
  produto     Produto  @relation(fields: [produtoId], references: [id])

  quantidade  Int
  precoReal   Decimal  // Preço real de venda
  canal       String   // ML, Facebook, etc.

  vendidoEm   DateTime @default(now())

  // Lotes específicos vendidos nesta venda (para rastreamento FIFO)
  lotes       Lote[]

  // Distribuição do lucro desta venda
  distribuicao LucroDistribuicao[]

  // Se esta venda já foi totalmente "reposta"
  totalmenteReposicao Boolean @default(false)
  dataReposicaoCompleta DateTime?
}

model LucroDistribuicao {
  id          String   @id @default(uuid())
  vendaId     String
  venda       Venda    @relation(fields: [vendaId], references: [id])
  socioId     String
  socio       Socio    @relation(fields: [socioId], references: [id])

  valor       Decimal  // Valor do lucro
  status      StatusLucro @default(PENDENTE)

  // Se foi liberado por reposição
  liberadoPorReposicaoId String?  // ID do lote que repôs
  dataLiberacao DateTime?

  criadoEm    DateTime @default(now())
}
```

---

## 🔄 Fluxo de Trabalho

### 1. Cadastro de Compra (Entrada de Estoque)

```
Vocês compram 10 mouses juntos (50/50):
├─ 5 unidades → Socio: Você, Status: EM_TRANSITO
├─ 5 unidades → Socio: Amigo, Status: EM_TRANSITO
```

**Tela:**

```
Produto: Mouse Gamer
Quantidade: 10
Custo unitário: R$ 50,00
Rateio: 50% Você (5 un) / 50% Amigo (5 un)

[✓] Produto já está em estoque físico
[ ] Produto ainda está a caminho (em trânsito)
```

### 2. Chegada no Estoque (Mudança de Status)

Quando o produto chega fisicamente:

```
Unidades alteradas: EM_TRANSITO → EM_ESTOQUE
```

Agora estão disponíveis para venda.

### 3. Venda (FIFO Automático)

Quando vende 3 mouses:

```
Sistema seleciona automaticamente (FIFO):
├─ Unidade #1 (Você, EM_ESTOQUE) → VENDIDO
├─ Unidade #2 (Você, EM_ESTOQUE) → VENDIDO
├─ Unidade #3 (Amigo, EM_ESTOQUE) → VENDIDO

Preço venda: R$ 100,00 cada
Custo: R$ 50,00 cada
Lucro: R$ 50,00 × 3 = R$ 150,00

Distribuição:
├─ Você: R$ 100,00 (2 un × R$ 50) → Status: PENDENTE
└─ Amigo: R$ 50,00 (1 un × R$ 50) → Status: PENDENTE
```

**Dashboard mostra:**

```
Venda #123 - Mouse Gamer (3 un)
Total vendido: R$ 300,00
Lucro total: R$ 150,00

┌─────────────────────────────────────────┐
│ SITUAÇÃO DO LUCRO:                     │
│ Você:  R$ 100,00 ⏳ Aguardando reposição│
│ Amigo: R$ 50,00  ⏳ Aguardando reposição│
└─────────────────────────────────────────┘
```

### 4. Reposição (Liberação do Lucro)

Vocês decidem repor as 3 unidades vendidas:

**Opção A: Rotatividade fixa**

```
Quem vendeu, repõe:
├─ Você compra 2 unidades → Status: EM_TRANSITO
└─ Amigo compra 1 unidade → Status: EM_TRANSITO

Ao marcar como "chegou no estoque":
→ Lucro de R$ 100,00 liberado para Você
→ Lucro de R$ 50,00 liberado para Amigo
```

**Opção B: Pool de reposição (alternado)**

```
Sistema alterna quem repõe baseado em quem tem menos investido:
→ Amigo compra 3 unidades (porque ele tem menos investido no momento)

Mesmo Amigo repondo TUDO:
→ Lucro de R$ 100,00 ainda vai para Você (quem vendeu as unidades dele)
→ Lucro de R$ 50,00 vai para Amigo
```

> ⚠️ **Importante**: O lucro sempre vai para quem **vendeu** a unidade, não quem **repôs**.

### 5. Próxima Venda (Mesmo produto)

Agora o estoque está:

```
├─ Unidade #4 (Você, EM_ESTOQUE)
├─ Unidade #5 (Você, EM_ESTOQUE)
├─ Unidade #6 (Amigo, EM_ESTOQUE)
├─ Unidade #7 (Amigo, EM_ESTOQUE)
└─ Unidade #8-10 (EM_TRANSITO - reposição da venda anterior, ainda não chegaram)
```

Vende mais 2:

```
Sistema seleciona:
├─ Unidade #4 (Você) → VENDIDO, Lucro vai pra Você
└─ Unidade #5 (Você) → VENDIDO, Lucro vai pra Você

Lucro: R$ 100,00 total para Você (Status: PENDENTE até nova reposição)
```

> Note: Mesmo o produto sendo "50/50" no geral, **esta venda específica** gerou lucro 100% para você porque as unidades vendidas eram suas.

---

## 🎨 Interface Proposta

### Dashboard Principal

```
┌─────────────────────────────────────────────────────────────┐
│ RESUMO POR SÓCIO                                            │
├──────────────────────┬──────────────────────┬───────────────┤
│ VOCÊ                 │ AMIGO                │ EMPRESA       │
│ R$ 1.500,00 💰       │ R$ 800,00 💰         │ R$ 300,00 🏢  │
│ Disponível           │ Disponível           │ Caixa         │
│                      │                      │               │
│ R$ 600,00 ⏳         │ R$ 400,00 ⏳         │               │
│ Pendente             │ Pendente             │               │
│ (3 vendas aguardando │ (2 vendas aguardando │               │
│  reposição)          │  reposição)          │               │
├──────────────────────┴──────────────────────┴───────────────┤
│ AÇÕES PENDENTES                                             │
│ • 5 unidades de Mouse Gamer vendidas - aguardando reposição │
│ • 2 unidades de Teclado RGB a caminho (chega em 3 dias)    │
└─────────────────────────────────────────────────────────────┘
```

### Tela de Venda

```
Produto: Mouse Gamer
Quantidade em estoque: 8 unidades (5 suas, 3 do amigo)
Quantidade em trânsito: 5 unidades (reposição pendente)

Quantidade a vender: [ 2 ]

┌─────────────────────────────────────────────────────────────┐
│ PREVISÃO DE DISTRIBUIÇÃO (FIFO):                           │
│                                                             │
│ Unidade #4 (Sua)     → Venda: R$ 100,00 | Lucro: R$ 50,00  │
│ Unidade #5 (Sua)     → Venda: R$ 100,00 | Lucro: R$ 50,00  │
│                                                             │
│ Total:                                    Lucro: R$ 100,00 │
│                                           ⏳ Pendente      │
│                                                             │
│ ⚠️ Este lucro ficará PENDENTE até reposição                │
└─────────────────────────────────────────────────────────────┘

[Confirmar Venda]
```

### Tela de Reposição

```
Reposição de Produtos Vendidos

Produtos que precisam de reposição:
☑ Mouse Gamer - 3 unidades vendidas (R$ 150,00 de lucro pendente)
☐ Teclado RGB - 2 unidades vendidas (R$ 80,00 de lucro pendente)

Quem está comprando a reposição?
( ) Você
(●) Amigo
( ) Dividido (automático)

Quantidade: [ 3 ]
Custo unitário: [ R$ 50,00 ]

Status: (●) Já comprei, está a caminho  ( ) Já chegou no estoque

[Confirmar Reposição]

→ Isso liberará R$ 150,00 de lucro pendente para os sócios
```

---

## 📊 Relatórios Importantes

1. **Posição Consolidada**: Quanto cada um tem disponível vs pendente
2. **Fluxo de Caixa**: Entradas e saídas por sócio ao longo do tempo
3. **Giro de Estoque**: Quanto tempo entre venda e reposição
4. **Produtos Pendentes**: Lista do que precisa ser reposto para liberar lucros

---

## 🤔 Pergunta para Definir Detalhe

Sobre a reposição, qual comportamento vocês preferem?

**A) Rotatividade Estrita** (mais simples)

- Quem vendeu uma unidade, precisa repor aquela unidade específica para liberar o lucro
- Se você vendeu 3 mouses, só quando VOCÊ repuser 3 mouses seu lucro libera

**B) Pool de Reposição** (mais flexível)

- Não importa quem repõe, o que importa é o estoque total voltar ao nível anterior
- Se vocês vendem 3 e o amigo repõe 3, todos os lucros liberam
- O sistema mantém um "saldo de reposição" por sócio

Eu recomendo a **Opção B** porque é mais realista para sócios - vocês podem se ajudar nas reposições sem ficar preso a "só posso usar meu lucro quando eu mesmo repuser".

Qual faz mais sentido para vocês?
