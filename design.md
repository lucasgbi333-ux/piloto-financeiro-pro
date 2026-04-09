# Piloto Financeiro Pro — Design Document

## Visão Geral

Aplicativo de gestão financeira para motoristas de app (Uber, 99, etc.) com tema **OLED Black premium**. O app calcula custos fixos, custos operacionais, lucro por KM e exibe relatórios com gráficos animados. Orientação **portrait (9:16)**, uso com uma mão.

---

## Telas

### 1. Dashboard (Home / Tab principal)
- **Conteúdo**: 3 cards principais empilhados verticalmente
  - Card "Valor Mínimo por KM" — verde neon com ícone de moeda. Texto: "Aceite acima de R$ X,XX/km"
  - Card "Meta Diária" — azul com ícone de alvo. Texto: "Você precisa fazer R$ X hoje para cobrir seus custos"
  - Card "Lucro do Dia" — gradiente dourado com ícone de gráfico. Mostra o lucro líquido do dia
- **Funcionalidade**: Dados consolidados de custos fixos + operacionais. Atualiza automaticamente ao voltar para a tela.

### 2. Custos Fixos (Tab)
- **Conteúdo**: Formulário com campos de input
  - IPVA Anual (R$)
  - Financiamento Mensal (R$) — opcional
  - Aluguel do Veículo (R$) — opcional, com seletor SEMANAL/MENSAL
  - Internet Mensal (R$)
  - Outros Custos (R$)
- **Funcionalidade**: Ao preencher, calcula automaticamente:
  - Custo Mensal Total
  - Custo Anual Total
  - Custo Diário Necessário
- **Layout**: Inputs com fundo surface escuro, bordas sutis, labels em muted. Resultados em cards destacados abaixo do formulário.

### 3. Custo Operacional (Tab)
- **Conteúdo**: Formulário com campos
  - Tipo de Veículo: toggle COMBUSTÃO / ELÉTRICO
  - Preço do Combustível ou Preço kWh (R$)
  - Autonomia (km/L ou km/kWh)
  - KM Rodados Hoje
  - Ganho do Dia (R$)
  - Margem Desejada por KM (R$)
- **Funcionalidade**: Calcula em tempo real:
  - Custo por KM
  - Custo Total do Dia
  - Lucro por KM
  - Valor Mínimo por KM
- **Layout**: Toggle estilizado no topo, inputs agrupados, resultados em cards coloridos abaixo.

### 4. Relatórios (Tab)
- **Conteúdo**:
  - Filtro de período: DIA / SEMANA / MÊS (segmented control)
  - Gráfico de barras animado (Canvas nativo)
  - Lista de itens do relatório abaixo do gráfico
- **Funcionalidade**: Agrupa dados por período selecionado. Gráfico anima barras de 0 até o valor real ao entrar na tela (uma vez, sem loop).
- **Layout**: Segmented control no topo, gráfico ocupa ~40% da tela, lista scrollável abaixo.

---

## Fluxos Principais

### Fluxo 1 — Configurar Custos Fixos
1. Usuário abre tab "Custos Fixos"
2. Preenche campos (IPVA, financiamento, etc.)
3. Resultados calculados aparecem automaticamente abaixo
4. Dados salvos localmente (AsyncStorage)
5. Dashboard atualiza meta diária

### Fluxo 2 — Registrar Dia de Trabalho
1. Usuário abre tab "Operacional"
2. Seleciona tipo de veículo
3. Preenche km rodados, ganho do dia, preço combustível, etc.
4. Resultados (custo/km, lucro/km, valor mínimo) aparecem em tempo real
5. Ao salvar, dados vão para histórico (relatórios)
6. Dashboard atualiza lucro do dia e valor mínimo/km

### Fluxo 3 — Consultar Relatórios
1. Usuário abre tab "Relatórios"
2. Seleciona filtro (Dia/Semana/Mês)
3. Gráfico de barras anima ao entrar
4. Lista detalhada abaixo mostra período, lucro, km e custo

---

## Paleta de Cores (Tema OLED Black Premium)

| Token       | Valor                | Uso                              |
|-------------|----------------------|----------------------------------|
| background  | #000000              | Fundo principal (OLED puro)      |
| surface     | #111111              | Cards, inputs, áreas elevadas    |
| foreground  | #FFFFFF              | Texto principal                  |
| muted       | #8E8E93              | Texto secundário                 |
| primary     | #00D4AA              | Cor de destaque (verde neon)     |
| border      | #1C1C1E              | Bordas sutis                     |
| success     | #30D158              | Estados de sucesso / lucro       |
| warning     | #FFD60A              | Alertas / atenção                |
| error       | #FF453A              | Erros / prejuízo                 |
| accent-blue | #0A84FF              | Cards de meta diária             |
| accent-gold | #FFD700              | Cards de lucro                   |

---

## Tipografia

- Títulos: System font, bold, 28-32px
- Subtítulos: Semibold, 18-20px
- Body: Regular, 16px
- Caption/Labels: Regular, 13-14px, cor muted

---

## Navegação

- Tab bar na parte inferior com 4 tabs:
  1. Dashboard (ícone: casa)
  2. Custos Fixos (ícone: documento/lista)
  3. Operacional (ícone: carro)
  4. Relatórios (ícone: gráfico de barras)
- Tab bar com fundo #000000, borda top sutil #1C1C1E

---

## Componentes Reutilizáveis

- **ResultCard**: Card com ícone, título, valor formatado em R$, cor de destaque configurável
- **InputField**: Input estilizado com label, fundo surface, borda border
- **SegmentedControl**: Toggle para filtros (combustão/elétrico, dia/semana/mês)
- **AnimatedBarChart**: Gráfico de barras com animação Canvas (sem libs externas)
