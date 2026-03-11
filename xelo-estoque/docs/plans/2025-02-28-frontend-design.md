# Frontend Design - Sistema de Estoque com Cotas

## Overview
Hybrid dashboard with partner/company toggle, stock pool selection for sales, and dual-mode entry forms.

## Dashboard Design

### Tab-Based View Toggle
- **Tab 1: "Minha Visão"** - Partner-centric view
  - Personal balance cards (disponível, pendente, total investido)
  - My positions in stock pools (cotas)
  - My recent distributions and withdrawals
  - My active debts (if any)

- **Tab 2: "Visão Empresa"** - Company overview
  - Summary cards: total estoques, socios ativos
  - Sales charts by channel
  - Total profit distribution summary
  - Recent activity across all partners

### Layout
- 12-column responsive grid
- Left panel (3 cols): Summary cards
- Center panel (6 cols): Main data (positions/sales)
- Right panel (3 cols): Analytics/charts

## Sale Form Design

### Flow: Product → Pool Selection
1. **Product Selector**: Dropdown of products with stock
2. **Pool Selection**:
   - Shows available pools for selected product
   - Auto-selects oldest pool (smart default)
   - Visual indicator: quota breakdown (colored bars)
   - Shows available quantity in each pool
3. **Quantity & Price inputs**
4. **Preview Panel**: Shows profit distribution before submitting

### Pool Selector Component
- Card-based list of available pools
- Each card shows:
  - Pool name (e.g., "Pool Nato+Ruan", "Individual Nato")
  - Available quantity
  - Quota visualization (colored progress bar)
  - Cost basis

## Entry Form Design

### Dual Mode Toggle
**Simple Mode (default):**
- Stock pool selector
- Quantity and unit cost
- System auto-calculates payment split based on current quotas
- Shows preview of new quotas after entry

**Advanced Mode (expandable):**
- Manual percentage input per partner
- Real-time validation (must sum to 100%)
- Shows how quotas will change

### Visual Design
- Toggle switch: "Simple / Avançado"
- Partner payment cards with color coding
- Validation indicators (green check when valid)

## Components to Build

### New Components
1. `ViewToggle.tsx` - Tab switcher for dashboard views
2. `SocioDashboard.tsx` - Partner view content
3. `EmpresaDashboard.tsx` - Company view content
4. `EstoqueSelector.tsx` - Pool selection with quota viz
5. `DistribuicaoPreview.tsx` - Profit distribution preview
6. `EntradaForm.tsx` - Stock entry with dual mode
7. `PagamentoSplit.tsx` - Payment splitting controls
8. `SocioSaldoPanel.tsx` - Partner balance display
9. `CotaVisualizer.tsx` - Quota breakdown bars

### Modified Components
1. `VendaForm.tsx` - Updated to support pool selection
2. `VendaList.tsx` - Updated to show stock source
3. `page.tsx` - New dashboard layout with tabs

## API Integration

### Endpoints Used
- `GET /api/dashboard/resumo` - Company view data
- `GET /api/dashboard/por-socio?socioId=X` - Partner view data
- `GET /api/estoques/disponiveis?produtoId=X` - Pool options for sale
- `POST /api/vendas` (with `preview: true`) - Distribution preview
- `POST /api/entradas` - Stock entry
- `GET /api/socios` - Partner list for entry form

## Styling

### Theme (existing)
- Glass cards: `glass-card` class
- Emerald accent color for primary actions
- Partner colors from API (stored in database)
- Monospace fonts for financial data

### New Style Classes Needed
- `quota-bar` - Visual quota representation
- `tab-active` / `tab-inactive` - Tab states
- `pool-card` - Pool selection cards
- `preview-panel` - Distribution preview highlight

## Interactions

### Sale Flow
1. Select product → fetch available pools
2. Pools appear with oldest pre-selected
3. Change pool if needed
4. Enter quantity/price
5. Click "Preview" to see distribution
6. Submit sale

### Entry Flow (Simple)
1. Select destination pool
2. Enter quantity and cost
3. System shows auto-calculated split
4. Submit

### Entry Flow (Advanced)
1. Toggle to Advanced mode
2. Select destination pool
3. Enter quantity and cost
4. Adjust partner percentages
5. Validation shows if sum ≠ 100%
6. Submit when valid

## Error Handling
- Show validation errors inline
- Disable submit until valid
- Show API errors in toast/alert
- Loading states for all async operations
