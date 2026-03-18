# Documentação Completa - Click Manager

## Visão geral
O Click Manager é um frontend para gestão de operação fotográfica, organizado para atender dois lados do fluxo:
- fotógrafo, com foco em operação, agenda, clientes, contratos, pagamentos e apresentação pública
- cliente, com foco em contrato, acesso ao ensaio e visualização de galeria

O projeto foi construído com:
- HTML5
- CSS3 modular
- JavaScript puro
- `localStorage` para persistência principal
- `IndexedDB` para persistência de imagens do portfólio

## Estrutura atual do projeto
- `index.html`: entrada com login e acesso ao cadastro
- `register.html`: fluxo guiado de cadastro
- `style.css`: agregador dos módulos CSS
- `css/base.css`: variáveis, reset e base visual
- `css/layout.css`: estrutura de páginas e grids
- `css/components.css`: botões, cards, formulários, sidebar, modais e componentes reutilizáveis
- `css/pages.css`: estilos específicos de páginas públicas, cliente, cadastro e configurações
- `js/app.js`: lógica principal do sistema
- `js/register.js`: lógica dedicada ao cadastro guiado
- `js/page-fallbacks.js`: comportamentos auxiliares e fallbacks de páginas
- `pages/dashboard.html`: painel principal do fotógrafo
- `pages/agenda.html`: agenda e disponibilidade
- `pages/clientes.html`: gestão de clientes
- `pages/ensaios.html`: cadastro e listagem de ensaios
- `pages/portfolio.html`: portfólio público e gerenciável
- `pages/galeria.html`: galeria de entrega e compra de fotos
- `pages/meus-contratos.html`: área do cliente para assinatura
- `pages/meus-ensaios.html`: área do cliente para acesso a ensaios
- `pages/dashboard-cliente.html`: resumo operacional do cliente
- `pages/configuracoes.html`: central unificada de configurações

## Fluxo principal do sistema
### Fotógrafo
O fotógrafo entra pelo login ou cadastro, informa dados operacionais e passa a gerenciar:
- agenda
- clientes
- ensaios
- contratos
- pagamentos
- portfólio
- preferências gerais do sistema

### Cliente
O cliente entra por um fluxo mais simples e orientado ao atendimento:
1. cria a conta
2. recebe ou informa contexto do ensaio
3. acessa o contrato
4. assina o contrato
5. só então libera o acesso aos ensaios

## Funcionalidades por área
### Login e autenticação local
- login com conta de teste
- login com usuários cadastrados localmente
- separação de acesso por perfil
- persistência do usuário autenticado em `localStorage`

### Cadastro guiado
- escolha inicial de perfil
- fluxo específico para fotógrafo
- fluxo específico para cliente
- progressão por etapas
- validação por etapa
- cadastro de fotógrafo com dados operacionais
- cadastro de cliente com contexto do ensaio
- seleção múltipla de nichos para fotógrafo
- nichos apresentados como lista visual com ícones e descrição

### Dashboard do fotógrafo
- visão geral operacional
- métricas de ensaios, pagamentos e clientes
- agenda da semana
- disponibilidade resumida
- clientes recentes
- indicadores financeiros do mês
- textos de interface ajustados para tom mais sóbrio

### Agenda
- calendário mensal
- navegação entre meses
- destaque de dias com ensaio
- bloqueio por dia da semana
- definição de horários liberados
- visualização do que o cliente realmente enxerga disponível

### Clientes
- listagem em tabela
- cadastro por modal
- edição por modal
- persistência local dos registros

### Ensaios
- cadastro com título, cliente, data, horário e local
- vínculo com contrato
- valor por ensaio
- status de pagamento
- upload inicial e contagem de imagens

### Contratos e área do cliente
- geração automática de contrato pendente para cliente
- página de contratos do cliente
- bloqueio da página de ensaios enquanto contrato estiver pendente
- exibição do fotógrafo responsável no lado do cliente

### Portfólio
- upload de imagens
- ordenação por arrastar e soltar
- exclusão individual
- limpeza total
- persistência em `IndexedDB`
- atualização com base nas configurações públicas

### Galeria de entrega
- grid de fotos
- marca d'água
- seleção individual ou em lote
- cálculo automático de compra
- valor controlado pelas configurações

### Configurações
- perfil profissional
- financeiro
- portfólio público
- galerias e venda
- notificações
- atalhos operacionais
- formulário único com botão global `Salvar tudo`
- atualização imediata de dashboard, portfólio e galeria após salvar

## Persistência local
### localStorage
Usado para:
- clientes
- ensaios
- pagamentos
- disponibilidade
- perfil financeiro
- configurações
- usuários
- usuário atual
- contratos

### IndexedDB
Usado para:
- imagens do portfólio

## Histórico cronológico de atualizações
### 1. Estrutura base do frontend
- criação da estrutura inicial com páginas HTML separadas
- modularização do CSS em `base`, `layout`, `components` e `pages`
- centralização da lógica no JavaScript principal

### 2. Tela de entrada
- criação da tela inicial com login e chamada para cadastro
- definição de uma conta de teste para acesso rápido ao sistema

### 3. Dashboard inicial
- montagem do dashboard com sidebar, cards e áreas principais
- inclusão inicial de blocos de agenda, pagamentos e clientes

### 4. Gestão de clientes
- criação da tela de clientes
- inclusão de tabela, contagem e modal de cadastro/edição
- persistência local dos clientes

### 5. Gestão de ensaios
- criação da tela de ensaios
- expansão do cadastro para incluir horário, local, contrato, valor e status de pagamento
- preparação do frontend para vínculo futuro com imagens e backend

### 6. Portfólio público
- criação do portfólio em grid responsivo
- inclusão de preview ampliado
- evolução para espaço gerenciável com upload, exclusão e reordenação

### 7. Galeria de entrega
- criação da galeria do cliente
- marca d'água nas imagens
- seleção de fotos e cálculo de valor de compra

### 8. Agenda embutida no dashboard
- primeira versão da agenda dentro do dashboard
- visualização de dias com ensaios e horários disponíveis

### 9. Página Minha Agenda
- extração da agenda para uma página dedicada
- configuração de dias de trabalho
- ativação e desativação de horários
- visualização do que o cliente vê em cada data

### 10. Remoção de dados fictícios
- eliminação de receitas e ensaios fake
- adaptação do sistema para começar vazio e ser preenchido com dados reais

### 11. Persistência local consolidada
- integração com `localStorage`
- uso de `IndexedDB` para o portfólio
- manutenção do sistema funcional mesmo sem backend

### 12. Financeiro baseado em dados reais
- uso do valor por ensaio e da média mensal do fotógrafo
- cálculo de média estimada mensal
- cálculo de metas e cobertura de contratos

### 13. Separação por perfis
- criação dos fluxos específicos para fotógrafo e cliente
- cadastro do fotógrafo mais completo
- cadastro do cliente mais enxuto e orientado ao atendimento

### 14. Área do cliente
- criação de `Meus Contratos`
- criação de `Meus Ensaios`
- bloqueio de acesso até assinatura do contrato

### 15. Primeira central de configurações
- criação de seções separadas para perfil, financeiro, portfólio, galeria e notificações
- vínculo dessas configurações com outras partes da interface

### 16. Revisão de textos e dados de teste
- redução do tom exagerado em áreas administrativas
- renomeação de elementos de demonstração para algo mais neutro
- ajuste do dashboard para textos mais operacionais

### 17. Correção de encoding UTF-8
- revisão do problema de codificação dos arquivos
- correção de mojibake em `js/app.js`
- revisão das páginas HTML para confirmar `UTF-8`
- correção específica dos textos estáticos do dashboard

### 18. Reorganização das configurações
- unificação da página de configurações em um único formulário
- remoção de múltiplos botões de salvar por seção
- criação de um único botão `Salvar tudo`
- feedback único de salvamento

### 19. Evolução do cadastro de nichos
- substituição do seletor único de nicho por seleção múltipla
- apresentação dos nichos em lista visual
- ícone específico para cada nicho
- persistência do array de nichos selecionados mantendo compatibilidade com o campo principal

## Situação atual
O projeto hoje entrega:
- frontend navegável e funcional
- persistência local sem backend
- áreas distintas para fotógrafo e cliente
- agenda configurável
- contratos com gate de acesso
- portfólio gerenciável
- galeria com compra simulada
- configurações centralizadas em salvamento único
- cadastro guiado com nichos múltiplos
- textos revisados e correções de codificação aplicadas

## Limitações atuais
Ainda dependem de backend real:
- autenticação segura
- múltiplos fotógrafos com isolamento real de dados
- upload definitivo de arquivos do ensaio
- assinatura contratual válida juridicamente
- pagamentos reais
- compartilhamento seguro por token ou link assinado
- histórico financeiro completo
- permissões robustas por perfil

## Próximas evoluções recomendadas
- criar área real de contratos do fotógrafo
- detalhar melhor o vínculo entre cliente, contrato, ensaio, pagamento e galeria
- integrar backend e banco de dados
- integrar upload real de imagens
- conectar pagamentos reais
- formalizar compartilhamento seguro com clientes
