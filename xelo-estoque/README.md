# 📦 XeloShop - Controle de Estoque

Sistema simples de controle de estoque e vendas usando Next.js + Neon PostgreSQL.

## Funcionalidades

- ✅ Cadastrar produtos (nome, custo, preço de venda, quantidade)
- ✅ Registrar vendas por canal (ML, Facebook, Instagram, WhatsApp, Outro)
- ✅ Controle automático de estoque
- ✅ Listagem com filtros (disponível/vendido/todos)
- ✅ Cálculo automático de lucro por venda e total
- ✅ Histórico de vendas com resumo por canal

## Stack

- **Next.js 14** (App Router)
- **Prisma ORM**
- **Neon PostgreSQL** (gratuito)
- **Tailwind CSS**

## Deploy Passo a Passo

### 1. Criar conta no Neon (Banco de Dados)

1. Acesse https://neon.tech
2. Crie uma conta gratuita
3. Crie um novo projeto
4. No dashboard, clique em "Connection String"
5. Copie a URL (vai parecer com: `postgresql://usuario:senha@host.neon.tech/nome-do-banco?sslmode=require`)

### 2. Configurar variáveis de ambiente

1. Renomeie o arquivo `.env.example` para `.env.local`
2. Cole a URL do Neon:
   ```
   DATABASE_URL=postgresql://usuario:senha@host.neon.tech/nome-do-banco?sslmode=require
   ```

### 3. Instalar dependências

```bash
npm install
```

### 4. Criar as tabelas no banco

```bash
npx prisma db push
```

### 5. Rodar localmente (teste)

```bash
npm run dev
```

Acesse http://localhost:3000

### 6. Deploy na Vercel

1. Acesse https://vercel.com
2. Importe seu projeto do GitHub (ou faça upload)
3. Na configuração, adicione a variável de ambiente:
   - **Name**: `DATABASE_URL`
   - **Value**: A mesma URL do Neon
4. Deploy!

Pronto! O sistema estará online e acessível de qualquer lugar.

## Estrutura do Banco

### Produto
- id, nome, custo, precoVenda, quantidade, criadoEm, atualizadoEm

### Venda
- id, produtoId, quantidade, canal, precoReal, vendidoEm

Cada venda diminui automaticamente a quantidade do produto no estoque.

## Acesso compartilhado

Como usa Neon na nuvem, você e seu amigo podem acessar a mesma URL e ver os dados em tempo real. Não precisa sincronizar nada!

---

**Nota**: O Neon gratuito "dorme" após inatividade (primeira requisição pode demorar ~1s), mas é suficiente pro começo.
