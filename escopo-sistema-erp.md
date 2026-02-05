# Documento de Escopo - Sistema ERP/CRM
## Controle Financeiro + Estoque + Vendas + Atendimento

> 📋 **Documentos Relacionados**:
> - [Diagramas e Fluxos](./diagramas-e-fluxos.md) - Visualizações completas em Mermaid
> - Este documento: Especificações textuais detalhadas

---

## 1. Contexto do Negócio

### 1.1 Perfil Operacional
| Aspecto | Descrição |
|---------|-----------|
| **Catálogo** | Pequeno: < 50 unidades em estoque, < 20 SKUs únicos |
| **Canais de Venda** | Mercado Livre, Facebook, Instagram |
| **Aquisição** | Importação direta com agente de compras (intermediário) - **custo do agente já embutido no valor do produto** |
| **Estrutura** | Sócios atuais, potencial para funcionários futuros |
| **Operação** | Escala pequena, operação enxuta, pretende contratar atendentes |
| **Diferencial** | Atendimento centralizado e personalizado |

### 1.2 Problema Atual
- Controle na "cabeça" - sem sistema formal
- Não há lucro real calculado corretamente
- Estoque não valorizado
- Taxas e devoluções sem tratamento adequado
- Sem base para divisão de lucros entre sócios
- Risco de confundir saldo de marketplace com lucro real
- **Atendimento disperso**: mensagens em ML, FB, IG, WhatsApp (talvez) sem centralização
- **Sem visão do funil**: não sabe onde o cliente está no processo de compra/pós-venda

---

## 2. Decisões Arquiteturais Fundamentais

### 2.1 Stack Tecnológica
- **Framework**: Laravel (PHP)
- **Admin Panel**: Filament
- **Banco**: PostgreSQL
- **Arquitetura**: Monolito (com módulos bem separados)
- **WebSocket**: Para notificações de chat em tempo real (Laravel Reverb ou Pusher)
- **Fila**: Redis para processamento assíncrono de mensagens

### 2.2 Modelo Contábil
- **Sistema**: Partidas Dobradas (débito = crédito sempre)
- **Método de Custo**: Custo Médio Ponderado (não FIFO)
- **Fechamento**: Mensal, imutável após fechamento
- **Devoluções**: Evento contábil separado com estorno completo

### 2.3 Filosofia de Dados
- **Estoque**: Sempre calculado via movimentações (não há campo `estoque_atual`)
- **Rastreabilidade**: Todo lançamento contábil vinculado a origem (pedido, campanha, etc)
- **Dimensionalidade**: Produto × Canal × Campanha × Período
- **Custo do Agente**: Já embutido no valor do produto (transparente na contabilidade)

---

## 3. Estrutura de Dados (Modelo Conceitual)

### 3.1 Módulo Produto e Estoque

```
products
├── id (PK)
├── nome
├── sku (unique)
├── custo_medio (atualizado em cada entrada)
├── preco_base
├── ativo
├── imagens (array/json)
├── dimensoes (json: altura, largura, peso)
└── created_at/updated_at

inventory_movements
├── id (PK)
├── product_id (FK)
├── tipo (enum: entrada, venda, ajuste, devolucao)
├── quantidade
├── custo_unitario (valor do custo no momento)
├── referencia_type (polimórfico: PurchaseOrder, SaleOrder, etc)
├── referencia_id
├── created_at
└── user_id (quem registrou)
```

### 3.2 Módulo Contábil (Core)

```
accounts (Plano de Contas)
├── id (PK)
├── codigo (ex: 1.1.01)
├── nome
├── tipo (enum: ativo, passivo, receita, despesa, patrimonio)
├── parent_id (auto-relacionamento para hierarquia)
└── ativo

journal_entries (Lançamentos)
├── id (PK)
├── data
├── descricao
├── reference_type (polimórfico: Order, Purchase, Return, etc)
├── reference_id
├── periodo_fechado (boolean, protege de edição)
└── created_at

journal_entry_lines (Linhas do Lançamento)
├── id (PK)
├── journal_entry_id (FK)
├── account_id (FK)
├── debit (decimal, 0 ou valor)
├── credit (decimal, 0 ou valor)
├── product_id (FK, nullable - para análise)
├── canal (string, nullable - ML, FB, IG)
├── campaign_id (FK, nullable)
└── cost_center_id (FK, nullable - para futuro)
```

### 3.3 Módulo Pedidos (Vendas)

```
orders
├── id (PK)
├── canal (enum: mercado_livre, facebook, instagram, outro)
├── campaign_id (FK, nullable)
├── customer_id (FK, nullable - para CRM)
├── data_venda
├── valor_total
├── taxa_marketplace
├── status (pendente, pago, enviado, entregue, cancelado, devolvido)
├── etapa_kanban (FK - para pipeline visual)
└── created_at

order_items
├── id (PK)
├── order_id (FK)
├── product_id (FK)
├── quantidade
├── valor_unitario
├── custo_unitario_no_momento (snapshot do CMV)
└── valor_total
```

### 3.4 Módulo Compras (Importação)

```
purchase_orders
├── id (PK)
├── supplier_id (FK)
├── agent_id (FK - agente de compras intermediário, para histórico)
├── numero_pedido_fornecedor
├── data_pedido
├── data_prevista_chegada
├── valor_produtos (já inclui custo do agente embutido)
├── valor_frete_internacional
├── valor_taxas_importacao
├── valor_total (calculado)
├── status (pendente, em_transito, recebido, cancelado)
└── observacoes

purchase_order_items
├── id (PK)
├── purchase_order_id (FK)
├── product_id (FK)
├── quantidade
├── custo_unitario_fornecedor (já com comissão do agente incluída)
├── custo_final_calculado (inclui rateio frete/taxas)
└── quantidade_recebida

suppliers
├── id (PK)
├── nome
├── pais_origem
├── tipo (fabricante, distribuidor)
└── dados_contato

agents (Agentes de Compras)
├── id (PK)
├── nome
├── comissao_percentual (apenas para registro histórico)
├── dados_contato
└── ativo
```

### 3.5 Módulo Marketing

```
campaigns
├── id (PK)
├── nome
├── canal (meta, google, etc)
├── product_id (FK, nullable - vinculo direto)
├── tipo_rateio (enum: produto_unico, rateio_receita)
├── data_inicio
├── data_fim
├── orcamento_previsto
└── status

ad_costs (Importação da Meta)
├── id (PK)
├── campaign_id (FK)
├── data
├── valor
├── impressions
├── clicks
├── spend_source (API, manual)
└── raw_data (json - dados brutos da API)
```

### 3.6 Módulo Fechamento e Snapshots

```
monthly_closings
├── id (PK)
├── ano_mes (YYYY-MM)
├── data_fechamento
├── fechado_por (user_id)
├── receita_total
├── cmv_total
├── despesas_total
├── lucro_bruto
├── observacoes
└── status (fechado, reaberto_nao_permitido)

inventory_snapshots (Foto do estoque no fechamento)
├── id (PK)
├── monthly_closing_id (FK)
├── product_id (FK)
├── quantidade
├── custo_medio_na_data
├── valor_total_estoque
└── created_at
```

### 3.7 Módulo CRM e Atendimento (Omnichannel)

```
customers
├── id (PK)
├── nome
├── email
├── telefone
├── documento (CPF/CNPJ)
├── canal_preferido (ML, FB, IG, WhatsApp)
├── tags (array - VIP, reclamacao frequente, etc)
├── data_ultima_compra
├── total_compras (lifetime value)
└── created_at

conversations (Conversas Omnichannel)
├── id (PK)
├── customer_id (FK)
├── canal (ML, FB, IG, WhatsApp)
├── canal_conversation_id (ID externo do chat)
├── status (ativo, aguardando, fechado, spam)
├── ultima_mensagem_em
├── responsavel_id (FK - user atribuído)
├── sentimento (positivo, neutro, negativo - IA)
├── prioridade (normal, alta, urgente)
└── metadata (json - dados específicos do canal)

messages
├── id (PK)
├── conversation_id (FK)
├── tipo (texto, imagem, arquivo)
├── conteudo
├── de_cliente (boolean)
├── user_id (FK, nullable - se resposta de atendente)
├── lida
├── data_envio
└── metadata (json)

message_templates (Templates de resposta rápida)
├── id (PK)
├── titulo
├── conteudo
├── atalho (ex: "/trocar")
├── categoria (venda, suporte, pos-venda)
└── ativo
```

### 3.8 Módulo Gestão de Tarefas e Pipeline

```
pipelines (Kanban)
├── id (PK)
├── nome
├── tipo (pedidos, atendimento, importacao)
└── ativo

pipeline_stages (Colunas do Kanban)
├── id (PK)
├── pipeline_id (FK)
├── nome
├── ordem
├── cor
├── sla_horas (tempo máximo nesta etapa)
└── automatizacao (json - ações automáticas ao entrar/sair)

pipeline_items (Cards no Kanban)
├── id (PK)
├── pipeline_stage_id (FK)
├── ordem
├── titulo
├── descricao
├── referencia_type (Order, Conversation, PurchaseOrder)
├── referencia_id
├── responsavel_id (FK)
├── data_entrada_etapa
├── data_limite
├── tags
└── checklist (json)
```

### 3.9 Módulo Calendário e Eventos

```
events
├── id (PK)
├── titulo
├── descricao
├── tipo (entrega, reuniao, follow_up, fechamento)
├── data_inicio
├── data_fim
├── customer_id (FK, nullable)
├── order_id (FK, nullable)
├── user_id (FK - responsável)
├── localizacao
├── status (agendado, concluido, cancelado)
├── notificacao_enviada
└── cor

event_reminders
├── id (PK)
├── event_id (FK)
├── minutos_antes
├── tipo (app, email, whatsapp)
└── enviado
```

### 3.10 Módulo Automação e IA

```
automation_rules (Regras de Automação)
├── id (PK)
├── nome
├── trigger_event (nova_mensagem, status_pedido_mudou, estoque_baixo)
├── condicoes (json)
├── acoes (json - enviar_msg, mover_kanban, notificar_user)
├── ativo
└── execucoes_count

ai_suggestions (Sugestões da IA)
├── id (PK)
├── conversation_id (FK)
├── tipo (resposta_sugerida, sentimento_detectado, upsell_oportunidade)
├── conteudo_sugerido
├── aceita (boolean, nullable)
├── user_id (FK - quem viu/aceitou)
└── created_at
```

---

## 4. Plano de Contas Sugerido (Inicial)

```
1 - ATIVO
  1.1 - Ativo Circulante
    1.1.01 - Caixa
    1.1.02 - Bancos
    1.1.03 - Contas a Receber - Mercado Livre
    1.1.04 - Contas a Receber - Outros
    1.1.05 - Estoque de Mercadorias
    
2 - PASSIVO
  2.1 - Passivo Circulante
    2.1.01 - Contas a Pagar - Fornecedores
    2.1.02 - Impostos a Recolher
    
3 - PATRIMÔNIO LÍQUIDO
  3.1 - Capital Social
  3.2 - Reserva de Lucros
  3.3 - Lucro/Prejuízo do Período
  3.4 - Distribuição a Sócios (dividendos)

4 - RECEITAS
  4.1 - Receita de Vendas
    4.1.01 - Vendas ML
    4.1.02 - Vendas Facebook
    4.1.03 - Vendas Instagram
  4.2 - Outras Receitas

5 - CUSTOS
  5.1 - Custo da Mercadoria Vendida (CMV)
  5.2 - Frete sobre Vendas
  
6 - DESPESAS
  6.1 - Despesas com Marketplace
    6.1.01 - Taxa ML
  6.2 - Despesas com Marketing
    6.2.01 - Meta Ads
    6.2.02 - Outros Anúncios
  6.3 - Despesas Administrativas
    6.3.01 - Taxas Bancárias
    6.3.02 - Impostos
  6.4 - Despesas com Importação
    6.4.01 - Frete Internacional
    6.4.02 - Taxas de Importação
    6.4.03 - Comissão Agente (se houver separação)
  6.5 - Despesas com Pessoal
    6.5.01 - Salários Atendentes
    6.5.02 - Impostos Trabalhistas
```

---

## 5. Fluxos de Eventos Contábeis

### 5.1 Compra de Estoque (Importação)
**Contexto**: Comprou 100 unidades de um produto via agente

**Cálculos**:
- Valor produto (com comissão agente embutida): $1.000
- Frete internacional: $200
- Taxas importação: $150
- **Custo total**: $1.350
- **Custo médio unitário**: $13,50 (atualiza produto)

**Movimentação de Estoque**:
- Tipo: entrada
- Quantidade: 100
- Custo unitário: $13,50

**Lançamento Contábil**:
| Conta | Débito | Crédito |
|-------|--------|---------|
| 1.1.05 - Estoque | 1.350,00 | |
| 2.1.01 - Contas a Pagar - Fornecedores | | 1.350,00 |

**Validação**: Débito (1.350) = Crédito (1.350) ✓

---

### 5.2 Venda no Mercado Livre
**Contexto**: Vendeu 2 unidades a $50 cada (total $100)

**Dados**:
- Valor venda: $100,00
- Taxa ML (15%): $15,00
- Custo médio atual: $13,50/unidade
- CMV: 2 × $13,50 = $27,00

**Movimentação de Estoque**:
- Tipo: venda
- Quantidade: -2
- Custo unitário: $13,50

**Lançamento Contábil (3 partidas)**:

**1. Receita**:
| Conta | Débito | Crédito |
|-------|--------|---------|
| 1.1.03 - Contas a Receber ML | 100,00 | |
| 4.1.01 - Vendas ML | | 100,00 |

**2. Taxa Marketplace**:
| Conta | Débito | Crédito |
|-------|--------|---------|
| 6.1.01 - Taxa ML | 15,00 | |
| 1.1.03 - Contas a Receber ML | | 15,00 |

**3. CMV**:
| Conta | Débito | Crédito |
|-------|--------|---------|
| 5.1 - CMV | 27,00 | |
| 1.1.05 - Estoque | | 27,00 |

**Validação Total**: Débitos (100+15+27) = Créditos (100+15+27) = 142 ✓

**Saldo ML a Receber**: $100 - $15 = $85

---

### 5.3 Devolução Completa
**Contexto**: Cliente devolveu a venda acima (dentro do mês)

**Lançamento Contábil (Estornos)**:

**1. Estorno Receita**:
| Conta | Débito | Crédito |
|-------|--------|---------|
| 4.1.01 - Vendas ML (estorno) | 100,00 | |
| 1.1.03 - Contas a Receber ML | | 100,00 |

**2. Estorno Taxa**:
| Conta | Débito | Crédito |
|-------|--------|---------|
| 1.1.03 - Contas a Receber ML | 15,00 | |
| 6.1.01 - Taxa ML (estorno) | | 15,00 |

**3. Retorno Estoque**:
| Conta | Débito | Crédito |
|-------|--------|---------|
| 1.1.05 - Estoque | 27,00 | |
| 5.1 - CMV (estorno) | | 27,00 |

**Movimentação de Estoque**:
- Tipo: devolucao
- Quantidade: +2
- Custo unitário: $13,50 (mesmo valor da saída)

---

### 5.4 Custo de Anúncio (Meta Ads)
**Contexto**: Campanha gastou $50,00 em um dia

**Lançamento Contábil**:
| Conta | Débito | Crédito |
|-------|--------|---------|
| 6.2.01 - Meta Ads | 50,00 | |
| 1.1.02 - Bancos (ou Caixa) | | 50,00 |

---

### 5.5 Distribuição de Lucro para Sócios
**Contexto**: Fechamento do mês com lucro líquido de $5.000, distribuição de $2.000

**Lançamento Contábil**:
| Conta | Débito | Crédito |
|-------|--------|---------|
| 3.4 - Distribuição a Sócios | 2.000,00 | |
| 1.1.01 - Caixa | | 2.000,00 |

---

## 6. Roadmap de Implementação

### FASE 1 - Sistema de Verdade (MVP Contábil)
**Objetivo**: Ter controle financeiro real e confiável
**Tempo Estimado**: 3-4 semanas
**Status**: Obrigatório antes de qualquer outra coisa

#### Semana 1: Fundação
- [ ] Setup Laravel + Filament
- [ ] Configurar PostgreSQL
- [ ] Criar migrations base (accounts, products, inventory_movements)
- [ ] Implementar Plano de Contas inicial
- [ ] Criar CRUD de Produtos
- [ ] Criar CRUD de Fornecedores
- [ ] Criar CRUD de Agentes de Compra

#### Semana 2: Motor Contábil
- [ ] Criar tabelas contábeis (journal_entries, journal_entry_lines)
- [ ] Implementar validação: débito = crédito
- [ ] Criar serviço de lançamentos automáticos
- [ ] Testar fluxo: compra gera lançamento correto
- [ ] Testar cálculo de custo médio ponderado
- [ ] Implementar proteção contra lançamentos em mês fechado

#### Semana 3: Pedidos e Vendas
- [ ] Criar tabelas de pedidos (orders, order_items)
- [ ] Implementar registro manual de vendas
- [ ] Automatizar lançamentos contábeis de venda
- [ ] Implementar baixa de estoque automática
- [ ] Implementar cálculo de CMV
- [ ] Testar fluxo completo: venda → estoque → contabilidade

#### Semana 4: Devoluções e Relatórios Base
- [ ] Implementar fluxo de devolução (estorno completo)
- [ ] Criar relatório: Faturamento por período
- [ ] Criar relatório: CMV por período
- [ ] Criar relatório: Estoque valorizado
- [ ] Criar relatório: Posição de caixa
- [ ] Criar relatório: Lucro do mês (básico)
- [ ] Testes de integridade: saldos sempre batem

**Entrega Fase 1**: Sistema permite registrar compras e vendas manualmente, gera lançamentos contábeis automáticos, mostra lucro real do período.

---

### FASE 2 - Integrações e Análise
**Objetivo**: Automatizar entrada de dados e ter visão por dimensões
**Tempo Estimado**: 4-6 semanas
**Pré-requisito**: Fase 1 estável e em uso por pelo menos 2 semanas

#### Módulo 2.1: Integração Mercado Livre
- [ ] Research API do Mercado Livre
- [ ] Autenticação OAuth
- [ ] Importação automática de pedidos
- [ ] Sincronização de status
- [ ] Importação automática de taxas ML
- [ ] Reconciliação: pedido importado vs lançamento contábil

#### Módulo 2.2: Campanhas e Marketing
- [ ] Criar tabela campaigns
- [ ] CRUD de campanhas (vinculadas a produto ou genéricas)
- [ ] Importação manual de custos Meta Ads
- [ ] Lançamento automático de despesas de anúncio
- [ ] Relatório: Lucro por campanha
- [ ] Relatório: ROAS por campanha

#### Módulo 2.3: Análise Multidimensional
- [ ] Relatório: Lucro por produto
- [ ] Relatório: Lucro por canal (ML vs FB vs IG)
- [ ] Relatório: Lucro por período (diário, semanal, mensal)
- [ ] Dashboard: Cards principais
- [ ] Filtros dinâmicos nas análises

#### Módulo 2.4: CRM Básico
- [ ] Tabela customers
- [ ] Vincular pedidos a clientes
- [ ] Histórico de compras por cliente
- [ ] Cadastro de leads (Instagram/FB)

**Entrega Fase 2**: Pedidos ML entram automaticamente, campanhas geram insights de lucro real, visão consolidada por produto/canal.

---

### FASE 3 - Empresa Organizada
**Objetivo**: Estrutura empresarial completa para crescimento
**Tempo Estimado**: 4-6 semanas
**Pré-requisito**: Fase 2 estável, volume justifica automação

#### Módulo 3.1: Rateios e Centro de Custo
- [ ] Implementar rateio de campanhas multi-produto
- [ ] Tabela cost_centers
- [ ] Alocação de despesas por centro de custo
- [ ] Relatório: P&L por centro de custo

#### Módulo 3.2: Fechamento Mensal Formal
- [ ] Processo de fechamento de mês
- [ ] Snapshots de estoque no fechamento
- [ ] Bloqueio de edição em períodos fechados
- [ ] Geração de relatório mensal formal
- [ ] Exportação para Excel/PDF

#### Módulo 3.3: Gestão de Sócios e Distribuição
- [ ] Tabela partners (sócios)
- [ ] Configuração de percentuais de distribuição
- [ ] Proposta de distribuição automática
- [ ] Lançamento automático de dividendos
- [ ] Relatório: Distribuições por período

#### Módulo 3.4: Fluxo de Caixa e Projeções
- [ ] Contas a pagar/receber com vencimento
- [ ] Projeção de fluxo de caixa
- [ ] Alertas de contas vencidas
- [ ] Previsão de estoque mínimo

#### Módulo 3.5: Importação Avançada
- [ ] Controle de pedidos de importação em trânsito
- [ ] Cálculo automático de custo final com frete/taxas
- [ ] Rateio de custos de importação por produto
- [ ] Tracking de remessas

**Entrega Fase 3**: Sistema empresarial completo, pronto para ter funcionários, múltiplos sócios, e crescimento em escala.

---

### FASE 4 - Atendimento e Operação (Omnichannel)
**Objetivo**: Centralizar comunicação e operação em uma única plataforma
**Tempo Estimado**: 6-8 semanas
**Pré-requisito**: CRM básico funcionando, estrutura de usuários definida

#### Módulo 4.1: Chat Omnichannel Centralizado
- [ ] Tabelas: conversations, messages
- [ ] Integração API Mercado Livre (mensagens)
- [ ] Integração Facebook Messenger
- [ ] Integração Instagram Direct
- [ ] Integração WhatsApp Business API (via Twilio ou WPPConnect)
- [ ] Interface única de chat (tipo Zendesk/HubSpot)
- [ ] Identificação automática de cliente por telefone/email
- [ ] Histórico unificado: todas as conversas do cliente em todos os canais

#### Módulo 4.2: Gestão de Atendimento
- [ ] Atribuição automática de conversas para atendentes
- [ ] Transferência de conversa entre atendentes
- [ ] Status da conversa (novo, em atendimento, aguardando, resolvido)
- [ ] Tags de conversa (reclamação, dúvida, pós-venda)
- [ ] SLA por tipo de atendimento (responder em X minutos)
- [ ] Indicadores: tempo médio resposta, satisfação, volume por canal

#### Módulo 4.3: Automação de Atendimento
- [ ] Mensagens automáticas de boas-vindas por canal
- [ ] Respostas automáticas fora do horário comercial
- [ ] Templates de mensagem rápida (atalhos de teclado)
- [ ] Chatbot básico: FAQs, status de pedido, prazo de entrega
- [ ] Classificação automática de intenção (IA leve)
- [ ] Priorização automática (cliente VIP, pedido atrasado = prioridade alta)

#### Módulo 4.4: Pipeline Visual (Kanban)
- [ ] Configurar plugin Kanban existente
- [ ] Pipeline de Pedidos: Novo → Pagamento Confirmado → Em Separação → Enviado → Entregue
- [ ] Pipeline de Atendimento: Novo → Analisando → Resolvido → Fechado
- [ ] Pipeline de Importações: Cotação → Pedido Feito → Em Trânsito → Aduana → Recebido
- [ ] Cards arrastáveis entre colunas
- [ ] Automatizações ao mover card (ex: mover pra "Enviado" envia msg automática pro cliente)
- [ ] SLA visual (card fica vermelho se passar do tempo)

**Entrega Fase 4**: Todos os chats em uma tela, atendentes conseguem trabalhar com eficiência, pipeline visual do negócio inteiro.

---

### FASE 5 - Inteligência e Automação Avançada
**Objetivo**: Usar IA e automações para escalar sem aumentar proporcionalmente a equipe
**Tempo Estimado**: 4-6 semanas
**Pré-requisito**: Volume de conversas e dados suficiente para treinar/ajustar modelos

#### Módulo 5.1: IA no Atendimento
- [ ] Sugestão de resposta baseada em mensagens anteriores (OpenAI/Claude)
- [ ] Análise de sentimento em tempo real (cliente irritado = alerta)
- [ ] Resumo automático da conversa para transferência
- [ ] Identificação de oportunidade de venda (upsell/cross-sell)
- [ ] Detecção de urgência (palavras como "reclamação", "Procon", "devolver")

#### Módulo 5.2: Automações de Negócio
- [ ] Regras personalizáveis ("Se cliente comprar > R$500, mandar msg de agradecimento VIP")
- [ ] Alertas proativos ("Pedido X está 2 dias sem movimentação")
- [ ] Follow-up automático pós-venda ("Gostou do produto? Avalie!")
- [ ] Recuperação de carrinho abandonado (se integrar com site futuramente)
- [ ] Alerta de estoque baixo com sugestão de compra baseada em histórico

#### Módulo 5.3: Assistente Virtual Completo
- [ ] Chatbot que consulta status de pedido em tempo real
- [ ] Chatbot que calcula frete/prazo
- [ ] Chatbot que processa trocas/devoluções iniciando protocolo
- [ ] Escalonamento inteligente para humano quando necessário

**Entrega Fase 5**: Sistema trabalha 24/7 com automações, atendentes focam só no que realmente precisa de humano.

---

### FASE 6 - Expansões Operacionais
**Objetivo**: Funcionalidades que permitem crescer em volume e canais
**Tempo Estimado**: 4-6 semanas
**Pré-requisito**: Operação estável, demanda crescendo

#### Módulo 6.1: Gestão de Entregas e Logística
- [ ] Calendário de entregas (para entregas próprias ou agendadas)
- [ ] Rastreamento integrado (Melhor Envio, etc)
- [ ] Notificações automáticas de rastreamento para cliente
- [ ] Confirmação de entrega com foto/assinatura
- [ ] Gestão de devoluções logísticas

#### Módulo 6.2: Sazonalidade e Previsão
- [ ] Análise de sazonalidade por produto/canal
- [ ] Previsão de demanda baseada em histórico
- [ ] Sugestão de quantidade para próxima importação
- [ ] Alerta: "Baseado no histórico, você precisa importar X unidades em 30 dias"

#### Módulo 6.3: Gestão de Qualidade e Garantia
- [ ] Controle de produtos com defeito
- [ ] Gestão de garantias (duração, validade)
- [ ] Análise de motivos de devolução (qualidade vs insatisfação)
- [ ] Rastreabilidade por lote (se necessário no futuro)

#### Módulo 6.4: Catálogo B2B (Opcional)
- [ ] Área do cliente com catálogo de produtos
- [ ] Pedidos por formulário (atacado)
- [ ] Tabela de preços diferenciada
- [ ] Histórico de pedidos para clientes

**Entrega Fase 6**: Operação completa, pronta para escalar para múltiplos atendentes, estoques maiores, e canais adicionais.

---

## 7. Funcionalidades Adicionais Sugeridas (Backlog)

### Curto Prazo (Fácil implementação, alto impacto)
1. **Notificações Inteligentes**
   - Estoque crítico (baixo)
   - Pedido novo entrado
   - Conversa sem resposta há X minutos
   - Meta de vendas do dia atingida

2. **Tags e Segmentação**
   - Tag automática: "Comprou 3x", "Reclamou", "VIP", "Devolveu"
   - Filtros por tag em relatórios
   - Ações em massa por tag

3. **Metas e Gamificação**
   - Metas de venda por período
   - Ranking de atendentes (atendimentos, satisfação)
   - Dashboard de metas vs realizado

4. **Importação em Massa**
   - Importar pedidos de planilha (para histórico)
   - Importar produtos via Excel
   - Importar custos Meta via CSV

### Médio Prazo (Complexidade moderada)
5. **Sistema de Afiliados/Influenciadores**
   - Código de desconto único por influencer
   - Tracking de vendas por código
   - Cálculo automático de comissão
   - Relatório de ROI por influencer

6. **Gestão de Assets de Marketing**
   - Biblioteca de fotos/vídeos por produto
   - Status de aprovação (pendente, aprovado, descartado)
   - Vinculação: qual foto foi usada em qual campanha
   - Teste A/B de criativos (integração Meta)

7. **NPS e Pesquisa de Satisfação**
   - Envio automático 7 dias após entrega
   - Dashboard de NPS por produto/canal
   - Alerta para notas baixas

8. **Gestão de Amostras**
   - Controle de envio de amostras para influencers
   - Custo de amostra alocado em marketing
   - Follow-up de resultado de amostra

### Longo Prazo (Complexa, mas poderosa)
9. **Precificação Dinâmica**
   - Alerta quando margem de produto cair abaixo do ideal
   - Sugestão de preço baseada em concorrência (scraping)
   - Simulador de lucro: "Se eu aumentar 10%, quanto vendo?"

10. **Análise de Coorte**
    - Comportamento de clientes por mês de aquisição
    - Retenção de clientes (comprou 1x, voltou?)
    - LTV (Lifetime Value) por canal de aquisição

11. **Multi-Estoque**
    - Se crescer e ter mais de um local de armazenagem
    - Transferência entre estoques
    - Custo médio por localidade

12. **App Mobile Nativo**
    - Para sócios acompanharem vendas em tempo real
    - Para atendentes responderem chats pelo celular
    - Notificações push de pedidos urgentes

---

## 8. Considerações Específicas do Negócio

### 8.1 Importação via Agente (Custo Embutido)
**Simplificação**: Como o custo do agente já está embutido no valor do produto:
- Não há necessidade de ratear comissão separadamente
- O custo unitário recebido já é o "custo final" do produto
- Frete e taxas de importação ainda precisam ser rateados se vierem múltiplos produtos no mesmo container
- O agente é tratado como "fornecedor" na prática, simplificando a contabilidade

### 8.2 Chat Omnichannel - Decisões Importantes
**Fluxo de Mensagens**:
```
Cliente manda msg (ML/FB/IG/WA)
    ↓
Sistema identifica cliente (por ID do canal ou telefone)
    ↓
Cria/associa conversation
    ↓
Notifica atendente (push/email/interface)
    ↓
Atendente responde na plataforma
    ↓
Sistema envia resposta de volta ao canal correto
```

**Configurações necessárias**:
- **Horário de atendimento**: Fora do horário, resposta automática "Voltamos amanhã às 9h"
- **Tempo máximo de resposta**: SLA de 15 minutos em horário comercial
- **Auto-atribuição**: Conversa entra para o primeiro atendente disponível
- **Limite por atendente**: Máximo de 10 conversas simultâneas

### 8.3 Kanban - O que rastrear
**Pipelines sugeridos**:

1. **Vendas**: 
   - Novo Pedido → Pagamento → Separação → Embalagem → Envio → Entregue
   
2. **Atendimento**:
   - Nova Mensagem → Em Análise → Aguardando Cliente → Resolvido → Fechado
   
3. **Importações**:
   - Cotação → Pedido Enviado → Produção → Embarque → Trânsito → Aduana → Recebido → Estocado

**Automações sugeridas**:
- Mover para "Envio" → Gera código de rastreio automaticamente
- Mover para "Entregue" → Envia mensagem pós-venda pedindo avaliação
- Ficar mais de 2 dias em "Pagamento" → Alerta para verificar se é fraude

### 8.4 Calendário - Eventos importantes
**Tipos de eventos**:
- **Entregas**: Agendadas com cliente
- **Follow-up**: Ligar para cliente 3 dias após entrega
- **Fechamento**: Dia 5 de cada mês (fechamento contábil)
- **Importação**: Previsão de chegada de containers
- **Campanhas**: Início/fim de campanhas de marketing
- **Reuniões**: Com sócios, fornecedores

**Integrações**:
- Sincronizar com Google Calendar (opcional)
- Notificações 1 dia antes e 1 hora antes
- Mostrar no dashboard do dia: "Hoje você tem 3 entregas e 2 follow-ups"

---

## 9. Regras de Ouro do Sistema

1. **Saldos sempre batem**: Débito sempre igual a crédito em todo lançamento
2. **Estoque é histórico**: Nunca atualiza campo único, sempre insere movimentação
3. **Mês fechado é sagrado**: Não permite alteração, apenas lançamento de ajuste no mês atual
4. **Tudo tem origem**: Todo lançamento contábil sabe de onde veio (pedido, ajuste, etc)
5. **Custo médio é snapshot**: Ao vender, grava o custo médio daquele momento (não recalcula retroativo)
6. **Devolução é evento separado**: Não apaga venda, cria estorno completo
7. **Rastreabilidade dimensional**: Sempre que possível, registrar produto + canal + campanha
8. **Cliente é único**: Mesmo cliente em canais diferentes é uma única entidade no CRM
9. **Conversa não se perde**: Toda interação é registrada, mesmo que resolvida
10. **Pipeline reflete realidade**: Kanban é a fonte da verdade sobre status do pedido

---

## 10. Métricas de Sucesso

### Fase 1 (Contábil)
- [ ] Consegue registrar uma compra e ver estoque atualizado em < 2 minutos
- [ ] Consegue registrar uma venda e ver lucro real em < 2 minutos
- [ ] Relatório de lucro do mês bate com "controle na cabeça" (ou mostra erro do controle na cabeça)
- [ ] Não há discrepância entre estoque físico e sistema (se houver, é por ajuste registrado)

### Fase 2 (Integrações)
- [ ] 90% das vendas ML entram sem digitação manual
- [ ] Consegue identificar qual produto é mais lucrativo (e não só mais vendido)
- [ ] Consegue identificar qual canal tem melhor margem líquida
- [ ] Campanhas de anúncio mostram ROAS real (considerando todas as taxas)

### Fase 3 (Empresa)
- [ ] Fechamento mensal leva < 30 minutos
- [ ] Distribuição de lucros entre sócios é transparente e auditável
- [ ] Projeção de fluxo de caixa tem 80% de precisão em 30 dias

### Fase 4 (Atendimento)
- [ ] Atendente consegem ver todas as mensagens de um cliente (independente do canal) em uma tela
- [ ] Tempo médio de primeira resposta < 15 minutos em horário comercial
- [ ] 30% das dúvidas resolvidas sem intervenção humana (automação)
- [ ] Kanban atualizado em tempo real, refletindo status real dos pedidos

### Fase 5 (IA)
- [ ] IA sugere resposta adequada em 70% das mensagens
- [ ] Upsell automático gerando 10% de aumento no ticket médio
- [ ] Detecção de cliente insatisfeito em tempo real com 90% de precisão

### Fase 6 (Escala)
- [ ] Consegue operar 2x o volume com a mesma equipe (por eficiência)
- [ ] Previsão de demanda com 80% de acurácia
- [ ] NPS medido e maior que 50

---

## 11. Próximos Passos Imediatos

### Antes de Codar (Checklist)
1. [ ] Listar os 20 SKUs atuais com nomes e códigos
2. [ ] Pegar 5 compras recentes (notas/importações) para simular custos
3. [ ] Pegar 10 vendas recentes de cada canal (ML, FB, IG)
4. [ ] Simular manualmente no modelo contábil proposto
5. [ ] Validar com sócio se os números fazem sentido
6. [ ] Definir quem será o "contador interno" (responsável pelo fechamento mensal)

### Decisões Pendentes
- [ ] Qual será a data de início do sistema no ar? (sugestão: início do mês)
- [ ] Quem terá acesso ao sistema além dos sócios?
- [ ] Vai usar WhatsApp Business? (adicional ao ML/FB/IG)
- [ ] Qual a frequência de fechamento mensal? (último dia do mês? dia 5 do mês seguinte?)
- [ ] Quantos atendentes pretendem contratar inicialmente?
- [ ] Prefere atendentes full-time ou pode ser part-time/freelancer?

### Setup Inicial Necessário
- [ ] Conta de desenvolvedor Mercado Livre (para API)
- [ ] Conta Business no Facebook/Instagram
- [ ] Servidor/cloud para hospedar (AWS, DigitalOcean, etc)
- [ ] Conta Redis (para filas e cache)
- [ ] Conta de email para notificações (SendGrid, Mailgun)
- [ ] (Opcional) Conta OpenAI para features de IA

---

## Apêndice A: Glossário

- **CMV**: Custo da Mercadoria Vendida
- **ROAS**: Return on Ad Spend (Receita ÷ Custo de Anúncio)
- **FIFO**: First In, First Out (método de custo - não usado)
- **Custo Médio Ponderado**: Método escolhido para calcular custo de estoque
- **Partidas Dobradas**: Método contábil onde todo débito tem crédito correspondente
- **Fechamento Mensal**: Processo de travar um mês e calcular resultados definitivos
- **Rateio**: Distribuição de custos entre múltiplos produtos/categorias
- **Agente de Compras**: Intermediário que faz a compra no exterior (custo embutido)
- **Omnichannel**: Atendimento unificado em múltiplos canais (ML, FB, IG, WhatsApp)
- **SLA**: Service Level Agreement (tempo máximo de resposta)
- **NPS**: Net Promoter Score (satisfação do cliente)
- **LTV**: Lifetime Value (valor total gasto por cliente)
- **Upsell**: Vender produto mais caro/upgrade
- **Cross-sell**: Vender produto complementar

---

**Documento Version**: 2.0  
**Última Atualização**: Fevereiro/2026  
**Próxima Revisão**: Após definição de prioridade das fases 4, 5 e 6
