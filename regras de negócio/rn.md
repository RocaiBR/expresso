# Expresso: controle de fluxo e atividades – Estudo de Caso

## RN01 — Perfis de acesso

O sistema terá três funções: Usuário padrão, Gestor e TI. A função de cada pessoa define quais atividades ela vê e o que pode fazer com elas.

## RN02 — Visibilidade das atividades

O usuário padrão verá apenas as atividades atribuídas a ele; o gestor verá as atividades do seu setor e as que criou; o TI verá todas. Uma atividade que o usuário não pode ver será tratada como inexistente.

## RN03 — Atribuição de atividades

O usuário padrão só poderá criar atividades para si mesmo; o gestor poderá atribuí-las a si e aos usuários padrão do seu setor; o TI, a qualquer pessoa. Atividades não poderão ser atribuídas a usuários inativos e, sem responsável informado, ficarão com quem as criou.

## RN04 — Alteração e exclusão de atividades

Quem cria a própria atividade poderá editá-la e excluí-la. Em uma atividade atribuída por outra pessoa, o usuário padrão só poderá mudar o status e anexar arquivos. O gestor poderá editar e excluir as atividades dos usuários padrão do seu setor e as que criou; as de outro gestor do setor, apenas acompanhar. O TI poderá editar e excluir qualquer atividade.

## RN05 — Administração de usuários

Apenas o TI poderá cadastrar, editar, inativar e excluir usuários. O sistema manterá sempre ao menos um usuário TI ativo, e ninguém poderá excluir a própria conta.

## RN06 — Dados únicos

Não poderá haver dois usuários com o mesmo e-mail ou o mesmo nome de usuário.

## RN07 — Usuário inativo

Um usuário inativo não conseguirá entrar no sistema e perderá o acesso imediatamente, mesmo que esteja logado. Mudanças de função e de setor também passarão a valer na hora.

## RN08 — Preservação do histórico

Ao excluir um usuário, as atividades dele serão mantidas com o nome do responsável, para não perder o histórico nem alterar os relatórios.

## RN09 — Etapas e prioridades

Toda atividade começará como Pendente e com prioridade Média, salvo outra escolha (Baixa, Média, Alta ou Urgente). Ao ser concluída ou cancelada, o sistema registrará a data de finalização; ao ser reaberta, essa data será apagada.

## RN10 — Atividades atrasadas e canceladas

Uma atividade será considerada atrasada quando a data de entrega já tiver passado e ela não estiver concluída. Atividades canceladas não aparecerão nas listas nem nos totais da Home.

## RN11 — Numeração das atividades

Cada atividade receberá um código sequencial (#001, #002...) que nunca será reaproveitado, mesmo após uma exclusão.

## RN12 — Regras dos anexos

Cada arquivo terá no máximo 200 MB e precisará ser de um tipo permitido, com o conteúdo correspondente à extensão; um arquivo renomeado (ex.: um .exe salvo como .pdf) será recusado e descartado. Só anexa quem pode mudar o status da atividade, e só remove quem pode editá-la ou quem enviou o próprio arquivo. Ao excluir a atividade, todos os anexos dela serão apagados.

## RN13 — Recuperação de senha

O código de recuperação valerá por 15 minutos, aceitará no máximo 5 tentativas e só poderá ser pedido uma vez por minuto. A nova senha precisará ter ao menos 6 caracteres, e a resposta do sistema será a mesma exista o e-mail ou não. Após a troca, todas as sessões abertas do usuário serão encerradas.

## RN14 — Cálculo de dias úteis

Nos relatórios, serão considerados dias úteis os dias de segunda a sexta-feira, descontados os feriados nacionais.
