# Log Do Projeto - Click Manager

## 1. Estrutura inicial
Eu comecei organizando o projeto em uma estrutura mais clara para frontend puro:
- `index.html` como entrada
- `pages/` para as páginas internas
- `css/` para os estilos modulares
- `js/` para a lógica principal
- `assets/` para arquivos de apoio

## 2. Tela de acesso
Eu criei a tela de login e cadastro com foco visual mais moderno, responsivo e simples de usar.
Depois ajustei o comportamento do cadastro para trocar corretamente entre login e cadastro sem mostrar tudo ao mesmo tempo.

## 3. Dashboard base
Eu montei o dashboard com sidebar fixa, cards de resumo, próximos ensaios, pagamentos e clientes recentes.
Num primeiro momento existiam dados simulados para dar forma ao layout.

## 4. Clientes
Eu criei a página de clientes com tabela, contagem, botão de adicionar e modal para cadastro/edição.
Depois deixei esse fluxo persistindo localmente no navegador.

## 5. Ensaios
Eu criei a página de ensaios com filtros por data e modal de agendamento.
Depois fui expandindo o cadastro de ensaio para incluir:
- horário
- local
- contrato vinculado
- valor
- status do pagamento
- upload inicial de imagens

## 6. Portfólio público
Eu criei a página pública do portfólio com grid quadrado responsivo e preview ampliado.
Depois transformei essa área em um espaço gerenciável, com:
- upload de imagens
- persistência local
- exclusão
- arrastar e soltar para reordenar

## 7. Galeria de entrega
Eu construí a galeria do cliente com:
- grid quadrado
- marca d'água
- seleção de fotos
- compra individual e em lote
- cálculo automático do valor

## 8. Agenda do fotógrafo
Eu adicionei primeiro uma agenda dentro do dashboard com calendário, dias com ensaio e disponibilidade por horários.
Depois percebi que a usabilidade ficaria melhor em uma página separada.

## 9. Página Minha Agenda
Eu movi a agenda para uma página própria e adicionei `Minha Agenda` no menu.
Essa página passou a permitir:
- navegar entre meses
- ver dias com ensaio em destaque
- definir dias da semana trabalhados
- ativar ou desativar horários
- enxergar a visão do cliente para cada data

## 10. Limpeza dos dados fictícios
Eu removi os ensaios e receitas fake.
Deixei o sistema pronto para começar vazio e ser preenchido com dados reais do fotógrafo.

## 11. Persistência local
Eu conectei o projeto a `localStorage` e `IndexedDB` para manter os dados no frontend sem backend:
- clientes
- ensaios
- pagamentos
- perfil do fotógrafo
- disponibilidade
- usuários
- contratos
- portfólio

## 12. Financeiro ligado aos dados reais
Eu alterei o cadastro do fotógrafo para registrar:
- quanto ele cobra por ensaio
- quantos ensaios faz por mês em média

Com isso, o dashboard passou a calcular:
- média estimada mensal
- meta de ensaios
- meta de receita
- cobertura de contratos

## 13. Perfis de usuário
Eu adaptei o cadastro para dois perfis:
- fotógrafo
- cliente

O fotógrafo tem cadastro mais completo.
O cliente tem fluxo mais rápido para entrar a partir do compartilhamento de ensaio.

## 14. Área do cliente
Eu criei:
- `Meus Contratos`
- `Meus Ensaios`

O cliente precisa assinar o contrato antes de acessar os ensaios.
Também deixei explícito o nome do fotógrafo na área do cliente.

## 15. Configurações
Por fim, eu criei uma página completa de configurações para centralizar:
- perfil profissional
- financeiro
- portfólio público
- galeria e venda
- notificações

Essas configurações passaram a alimentar o restante da interface.

## 16. Situação atual
Hoje o projeto está pronto como frontend funcional e navegável, com dados persistidos localmente.
As próximas etapas ideais são:
- backend real
- autenticação real
- upload em servidor
- contratos reais
- vínculo completo entre cliente, ensaio, contrato, pagamento e galeria
