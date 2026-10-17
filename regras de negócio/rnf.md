# Expresso: controle de fluxo e atividades – Estudo de Caso

## RNF01 — Disponibilidade

O sistema será acessado pelo navegador, sem instalação, e ficará hospedado na nuvem do Firebase (Hosting e Cloud Functions), com a API na região de São Paulo.

## RNF02 — Segurança de acesso

Toda operação, exceto o login e a recuperação de senha, exigirá uma sessão válida, que expira em 12 horas. O navegador não acessará o banco de dados nem os arquivos diretamente: todo acesso passará pela API, que aplica as permissões de cada usuário.

## RNF03 — Proteção de dados

A senha dos usuários nunca será devolvida pela API, e os tokens de sessão e os códigos de recuperação serão guardados apenas como hash.

## RNF04 — Usabilidade

A interface será em português, seguirá o protótipo aprovado e as cores da Pinhalense, exibirá mensagens de erro claras e pedirá confirmação antes de excluir ou cancelar.

## RNF05 — Atualização automática

As listas de atividades serão atualizadas sozinhas a cada 15 segundos e ao voltar para a aba do navegador, sem precisar recarregar a página.

## RNF06 — Desempenho no envio de arquivos

Os anexos serão enviados diretamente do navegador para o armazenamento em nuvem, sem passar pela API, permitindo arquivos grandes sem sobrecarregar o servidor.

## RNF07 — Integridade dos dados

As operações que podem ocorrer ao mesmo tempo (numeração das atividades, verificação de e-mail e usuário repetidos e tentativas do código de recuperação) serão feitas em transações, evitando duplicidades.

## RNF08 — Rastreabilidade

O sistema registrará em log cada requisição (método, rota, resposta e tempo), além dos logins, gravações, envios de anexos e recuperações de senha.

## RNF09 — Manutenibilidade

O ambiente de desenvolvimento poderá ser reproduzido localmente e sem custo com o Firebase Emulator Suite, e a API contará com coleções de testes para Postman e Insomnia.
