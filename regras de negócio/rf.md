# Expresso: controle de fluxo e atividades – Estudo de Caso

## RF01 — Autenticação de usuários

O sistema permitirá que o usuário entre com e-mail, nome de usuário ou nome completo e senha, e encerrará a sessão ao clicar em "Sair".

## RF02 — Recuperação de senha

O sistema enviará um código de 6 dígitos ao e-mail cadastrado para que o próprio usuário crie uma nova senha, pela opção "Esqueci minha senha".

## RF03 — Cadastro de usuários

O sistema permitirá cadastrar, consultar, editar, ativar, inativar e excluir usuários, informando nome completo, usuário, e-mail, senha, setor e função.

## RF04 — Cadastro de atividades

O sistema permitirá criar atividades com título, descrição, responsável, participantes, data de início, data de entrega, prioridade e anexos. Ao salvar, exibirá uma tela de confirmação com o resumo da atividade criada.

## RF05 — Painel inicial

O sistema exibirá na Home o total de atividades e a quantidade de concluídas, em andamento e pendentes, um calendário do mês atual e a lista "Minhas atividades".

## RF06 — Listagem de atividades

O sistema listará as atividades com código, título, responsável, prioridade e data de entrega, separadas nas abas Todas, Pendentes, Em andamento, Concluídas e Atrasadas.

## RF07 — Detalhes da atividade

O sistema exibirá todos os dados de uma atividade, seus anexos e as ações que o usuário pode realizar nela (concluir, cancelar ou excluir).

## RF08 — Controle de etapas

O sistema permitirá mover a atividade entre as etapas Pendente, Em andamento, Concluída e Cancelada, inclusive reabrir uma atividade já encerrada.

## RF09 — Ações em lote

O sistema permitirá selecionar várias atividades e, de uma só vez, movê-las de etapa, passá-las para outro responsável ou excluí-las.

## RF10 — Pesquisa de atividades

O sistema permitirá pesquisar atividades por código, título, descrição, responsável, participantes, prioridade, status ou datas, sem diferenciar acentos e letras maiúsculas.

## RF11 — Anexos

O sistema permitirá anexar arquivos às atividades (documentos, planilhas, apresentações, imagens, vídeos e áudios), abri-los, baixá-los e removê-los.

## RF12 — Relatórios

O sistema gerará relatórios com a evolução do backlog (por dia ou por semana), o tempo médio ou mediano para conclusão e o resumo do período, com filtros por período, responsável, status e prioridade.

## RF13 — Exportação de dados

O sistema exportará para um arquivo CSV as atividades do período selecionado, respeitando os filtros aplicados no relatório.

## RF14 — Consulta de feriados

O sistema consultará os feriados nacionais do ano na BrasilAPI para calcular os dias úteis do período nos relatórios.

## RF15 — Importação de dados

O sistema permitirá importar atividades iniciais a partir de um arquivo CSV.
