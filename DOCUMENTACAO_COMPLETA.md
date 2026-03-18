# Documentação Completa - Click Manager

## Visão geral
Eu desenvolvi o frontend do Click Manager como uma plataforma para fotógrafos gerenciarem clientes, ensaios, contratos, pagamentos, portfólio e entrega de fotos.
O projeto foi feito em:
- HTML5
- CSS3 modular
- JavaScript puro

O foco foi criar uma base limpa, profissional, responsiva e pronta para integração futura com backend.

## Estrutura do projeto
- `index.html`: entrada do sistema com login e cadastro
- `style.css`: agregador dos módulos CSS
- `css/base.css`: variáveis, reset e base visual
- `css/layout.css`: estrutura principal de páginas e grids
- `css/components.css`: botões, cards, formulários, sidebar, modais e componentes utilitários
- `css/pages.css`: estilos específicos de páginas públicas, portfólio, cliente e configurações
- `js/app.js`: toda a lógica principal do frontend
- `pages/dashboard.html`: painel principal do fotógrafo
- `pages/agenda.html`: agenda completa com disponibilidade
- `pages/clientes.html`: gestão de clientes
- `pages/ensaios.html`: cadastro e listagem de ensaios
- `pages/portfolio.html`: portfólio público com gestão visual
- `pages/galeria.html`: galeria de entrega e compra de fotos
- `pages/meus-contratos.html`: área do cliente para assinar contrato
- `pages/meus-ensaios.html`: área do cliente para acessar ensaios
- `pages/configuracoes.html`: central de configurações

## Como eu pensei o fluxo
Eu separei o sistema em dois grandes lados:
- o lado do fotógrafo, que administra o negócio
- o lado do cliente, que entra por um fluxo mais simples e orientado a contrato e ensaio

Isso ajudou a manter a experiência clara:
- fotógrafo com mais controle
- cliente com menos fricção

## Login e cadastro
Na entrada do sistema, eu mantive duas ações:
- login
- cadastro

No cadastro, eu passei a perguntar:
- `Sou: Fotógrafo ou Cliente`

### Cadastro de fotógrafo
Eu deixei esse fluxo mais completo, porque o painel depende desses dados.
O fotógrafo informa:
- nome
- e-mail
- senha
- valor cobrado por ensaio
- média de ensaios por mês

Esses dados alimentam o financeiro do sistema.

### Cadastro de cliente
Eu deixei esse fluxo mais simples para ser usado a partir do compartilhamento do ensaio.
O cliente informa:
- nome
- e-mail
- senha
- nome do fotógrafo
- código ou link do ensaio

## Dashboard
Eu organizei o dashboard para funcionar como visão operacional.

### Blocos principais
- resumo rápido
- agenda da semana
- disponibilidade
- próximos ensaios
- pagamentos pendentes
- clientes recentes
- indicadores do mês

### Como os indicadores funcionam
Eu removi percentuais e receitas fictícias.
Os indicadores agora são calculados com base em:
- valor base por ensaio
- média mensal informada pelo fotógrafo
- ensaios cadastrados
- status de pagamento dos ensaios
- existência de contrato vinculado

### Indicadores atuais
- próximos ensaios
- pagamentos pendentes
- clientes ativos
- média estimada mensal
- meta de ensaios
- meta de receita
- ensaios com contrato

## Minha Agenda
Eu criei uma página própria para a agenda porque o recurso ficou grande demais para o dashboard.

### O que existe nessa página
- calendário mensal
- navegação entre meses
- destaque para dias com ensaio
- marcação visual de disponibilidade
- configuração de dias da semana
- configuração de horários por dia
- visão do cliente para cada data

### Como funciona
O fotógrafo define:
- em quais dias da semana trabalha
- quais horários libera

O cliente vê apenas:
- os dias disponíveis
- os horários que sobraram depois de descontar ensaios marcados

## Clientes
Na página de clientes eu criei:
- tabela de clientes
- contador
- modal de cadastro
- modal de edição

Os dados ficam salvos localmente no navegador até existir backend real.

## Ensaios
Na página de ensaios eu preparei o frontend para a lógica futura de backend.

### Cada ensaio pode ter
- título
- cliente
- data
- horário
- local
- contrato vinculado
- valor
- status do pagamento
- upload inicial de imagens
- quantidade de imagens
- nomes das imagens

### Relações pensadas
Eu já deixei a base para cada ensaio se relacionar com:
- cliente
- contrato
- pagamento
- imagens

Hoje isso está estruturado no frontend, mas a persistência robusta depende do backend.

## Contratos e área do cliente
Eu criei duas páginas para o cliente:
- `Meus Contratos`
- `Meus Ensaios`

### Fluxo do cliente
1. o cliente cria a conta
2. o sistema gera um contrato pendente
3. o cliente acessa `Meus Contratos`
4. o cliente assina
5. só depois disso ele pode entrar em `Meus Ensaios`

### Objetivo desse fluxo
Eu quis deixar claro que o cliente só acessa a área do ensaio depois da formalização do contrato, mesmo que hoje isso ainda seja uma simulação de frontend.

## Portfólio
O portfólio passou de uma vitrine estática para um espaço gerenciável.

### O que implementei
- upload de imagens
- grid quadrado responsivo
- preview em lightbox
- ordenação por arrastar e soltar
- exclusão de imagens
- limpeza completa do portfólio

### Persistência
Como arquivos de imagem não devem ficar em `localStorage`, eu usei `IndexedDB` no frontend.
Isso permitiu:
- salvar blobs localmente
- manter a ordem das imagens
- simular melhor o comportamento de um portfólio real

## Galeria de entrega
Na galeria do cliente eu implementei:
- grade quadrada
- marca d'água sobre as imagens
- seleção por clique
- compra individual
- compra em lote
- cálculo automático do valor
- finalização simulada

O preço por foto extra pode ser configurado na aba de configurações.

## Configurações
Eu criei a página de configurações como central de personalização do sistema.

### Seções criadas
- perfil profissional
- financeiro
- portfólio público
- galerias e venda
- notificações
- atalhos operacionais

### O que essas configurações afetam
- nome público do fotógrafo
- bio pública
- Instagram público
- valor por ensaio
- média mensal
- texto da marca d'água
- valor da foto extra
- expiração da galeria

## Persistência local
Enquanto o backend não existe, eu mantive o sistema funcionando com persistência local.

### `localStorage`
Eu usei para:
- clientes
- ensaios
- pagamentos
- perfil financeiro
- configurações
- disponibilidade
- usuários
- usuário logado
- contratos

### `IndexedDB`
Eu usei para:
- imagens do portfólio

## O que já está preparado para backend
Eu deixei a estrutura do frontend pronta para futuras integrações com:
- autenticação real
- banco de dados
- upload real de imagens
- armazenamento em nuvem
- assinatura de contrato
- pagamentos reais
- compartilhamento por link de ensaio

## O que ainda depende de backend
- validação real de usuários
- múltiplos fotógrafos reais no mesmo sistema
- contratos legais completos
- vinculação segura entre cliente, contrato e ensaio
- upload permanente de imagens do ensaio
- histórico financeiro completo
- permissões reais por perfil

## Como eu implementei
Eu fui trabalhando por camadas:
1. montei a estrutura visual
2. distribuí o layout em páginas
3. liguei os componentes com JavaScript
4. removi os dados fake
5. transformei os fluxos em algo mais realista
6. preparei a base para backend sem travar o frontend

## Resultado atual
O projeto hoje entrega:
- navegação funcional
- experiência clara para fotógrafo
- fluxo simplificado para cliente
- agenda configurável
- portfólio gerenciável
- dashboard baseado em dados inseridos
- persistência local

## Próximas evoluções recomendadas
As próximas etapas mais importantes seriam:
- criar uma página real de contratos do fotógrafo
- estruturar detalhes completos de cada ensaio
- permitir upload real de imagens do ensaio
- integrar autenticação e banco de dados
- conectar pagamentos reais
- transformar o compartilhamento com cliente em fluxo oficial com token ou link seguro
