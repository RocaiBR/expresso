#  Expresso — Projeto Integrador (PI)

Sistema web para controle de fluxo e atividades, com funcionalidades semelhantes ao **Trello** e ao **Fluig**. O projeto é dividido em uma **API REST** (Node.js + Express + Firestore) e um **frontend** em React (Vite + React Router + Tailwind CSS), hospedados no **Firebase**.

##  Sobre o projeto

O Expresso permite:

- Autenticação de usuários (login com sessão) e **recuperação de senha** por código enviado ao e-mail;
- Três **cargos** (usuário padrão, gestor e TI), com as permissões aplicadas pela API (veja [Cargos e permissões](#cargos-e-permissões));
- Cadastro, edição, listagem e exclusão de **usuários** (só o TI);
- Cadastro, edição, listagem e exclusão de **tarefas** (com filtro por status), incluindo **seleção de várias** para mover de etapa, trocar o responsável ou excluir;
- **Participantes** escolhidos entre os usuários cadastrados;
- **Urgência automática por prazo**: a atividade aberta que passa do dia de entrega vira *Urgente* sozinha (e volta à prioridade de antes se o prazo for adiado);
- **Notificações** no sino para nova atividade, troca de responsável e prazo vencido;
- **Meu perfil**: foto, troca da própria senha e e-mail; **temas** Claro, Escuro e Escuro profundo;
- **Anexos** nas tarefas (PDF, imagens, Word, Excel, PowerPoint, vídeos e áudios, até 200 MB cada), guardados no Cloud Storage, com conferência da assinatura do arquivo;
- Consulta de **feriados nacionais** por ano, via integração com a [BrasilAPI](https://brasilapi.com.br/);
- Importação de tarefas a partir de planilha CSV (com validação linha a linha) e o script de migração do banco MySQL antigo;
- **Verificação de consistência** dos dados e rotina diária de manutenção (00:05);
- **Relatórios** com evolução do backlog, tempo médio para conclusão, resumo do período (com dias úteis descontando feriados), filtros e exportação em CSV — tudo calculado a partir das tarefas do banco.

Como os dados são validados, transformados e integrados entre as fontes (com diagramas, dicionário de dados e regras de negócio): **[docs/dados-e-integracao.md](docs/dados-e-integracao.md)**. Evidências dos testes: **[docs/evidencias/relatorio-de-testes.md](docs/evidencias/relatorio-de-testes.md)**.

> Este é um Projeto Integrador acadêmico (UNIFEOB) e está em desenvolvimento.

##  Equipe

| RA          | Nome                              | Frente         |
|-------------|------------------------------------|----------------|
| 25000026    | Ícaro Cauã Guminiak de Godoy       | Backend        |
| 25000492    | Kevin Henrique Benedito            | Backend        |
| 25000095    | Vitor Leoncio Bartalini            | Backend        |
| 25001227    | Isadora Cabral dos Santos          | Frontend       |
| 25000215    | Vitória Karolina Santos Silva      | Frontend       |

- **Backend** (Node.js, Express, Firebase): Ícaro, Kevin e Vitor.
- **Frontend** (React): Isadora e Vitória.

##  Tecnologias utilizadas

**Backend**
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) (acesso ao Cloud Firestore)
- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions) (a API roda na nuvem como a função `api`)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [CORS](https://www.npmjs.com/package/cors)
- [Nodemailer](https://nodemailer.com/) (e-mail da recuperação de senha, pelo Gmail)
- [Nodemon](https://www.npmjs.com/package/nodemon) (ambiente de desenvolvimento)
- [playwright-core](https://playwright.dev/) (testes de tela, usando o Edge ou o Chrome instalados) e [mysql2](https://www.npmjs.com/package/mysql2) (migração do banco antigo), só em desenvolvimento

**Frontend**
- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/) (navegação entre as telas)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/) (gráficos da tela de relatórios)
- Consumo da API via `fetch`

**Nuvem (Firebase)**
- **Cloud Firestore**: banco de dados (coleções `tarefas` com a subcoleção `anexos`, `usuarios`, `contadores`, `sessoes`, `recuperacoes` e `notificacoes`; o dicionário de dados está em [docs/dados-e-integracao.md](docs/dados-e-integracao.md#3-dicionário-de-dados))
- **Cloud Storage**: guarda os arquivos anexados às tarefas (`tarefas/<id>/...`) e as fotos de perfil (`usuarios/<id>/...`)
- **Cloud Functions**: executa a API Node.js (função `api`) e a rotina diária (função `rotinaDiaria`, agendada pelo **Cloud Scheduler** para 00:05), na região `southamerica-east1` (São Paulo)
- **Secret Manager**: guarda a conta do Gmail que envia os códigos de recuperação
- **Hosting**: publica o frontend e encaminha `/api/**` para a função
- **Emulator Suite**: roda tudo isso localmente, sem custo, para desenvolvimento e testes

##  Estrutura do projeto

```
expresso/
├── firebase.json                      # serviços do Firebase (Firestore, Functions, Hosting, emuladores)
├── firestore.rules                    # bloqueia acesso direto do navegador ao banco
├── storage.rules                      # idem para os arquivos (o acesso passa pela API)
├── docs/
│   ├── dados-e-integracao.md          # fluxo entre as fontes, dicionário de dados, validações e regras
│   └── evidencias/                    # relatório dos testes automatizados e prints (gerados pelo testar:tudo)
├── backend/                           # também é a pasta da Cloud Function
│   ├── dados/
│   │   └── tarefas_iniciais.csv       # dados de exemplo para importação
│   ├── scripts/
│   │   ├── importarCsv.js             # importação de tarefas via CSV, com validação linha a linha
│   │   └── migrarMysql.js             # migração do banco MySQL antigo para o Firestore
│   ├── src/
│   │   ├── app.js                     # monta o Express (rotas, middlewares, log de requisições)
│   │   ├── config/
│   │   │   ├── email.js               # envio de e-mails pelo Gmail (recuperação de senha)
│   │   │   └── firebase.js            # conexão com o Firestore/Storage e helpers (ids, datas, links)
│   │   ├── controllers/
│   │   │   ├── anexoController.js     # arquivos das tarefas (tipos aceitos e limite de tamanho)
│   │   │   ├── authController.js      # login, logout e recuperação de senha
│   │   │   ├── feriadoController.js
│   │   │   ├── notificacaoController.js # avisos do sino
│   │   │   ├── perfilController.js    # "Meu perfil": foto, senha e tema
│   │   │   ├── tarefaController.js
│   │   │   └── usuarioController.js
│   │   ├── middlewares/
│   │   │   ├── autenticacao.js        # sessão de login (token) e bloqueio "só TI"
│   │   │   └── errorHandler.js        # 404 e tratamento de erros
│   │   ├── routes/                    # uma por grupo de rotas (auth, tarefas, usuarios, perfil, manutencao...)
│   │   └── utils/
│   │       ├── assinaturas.js         # confere se o conteúdo do anexo bate com a extensão
│   │       ├── manutencao.js          # rotina diária e verificação de consistência
│   │       ├── permissoes.js          # regras de cada cargo (usuário padrão, gestor, TI)
│   │       ├── prazos.js              # urgência automática por prazo vencido
│   │       └── validacoes.js          # regras de formato dos dados (API, CSV e migração)
│   ├── testes/
│   │   ├── suites/                    # testes automatizados, um arquivo por assunto
│   │   ├── rodarTodos.js              # roda as suítes e escreve o relatório (npm run testar:tudo)
│   │   ├── apoio.js, amostras.js      # peças comuns e arquivos de exemplo dos testes
│   │   ├── PI-api.insomnia_collection.json
│   │   ├── PI-api.postman_collection.json
│   │   └── testar_gravacao.js
│   ├── .env.servidor.exemplo          # modelo do .env.servidor (o real não é versionado)
│   ├── index.js                       # ponto de entrada na nuvem (funções "api" e "rotinaDiaria")
│   ├── package.json
│   └── server.js                      # ponto de entrada local (npm run dev)
│
└── frontend-react/
    ├── index.html                     # página única (o React monta tudo nela)
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx                   # ponto de entrada
        ├── App.jsx                    # rotas da aplicação
        ├── assets/                    # imagens (logo, fundo do login, caneca)
        ├── services/                  # chamadas à API (fetch)
        ├── context/                   # usuário logado (AuthContext)
        ├── hooks/                     # useTarefas (atualização automática)
        ├── utils/                     # formatações, filtros, pesquisa e cálculos dos relatórios
        ├── components/                # navbar, sidebar, abas, linhas da tabela, gráfico...
        └── pages/                     # uma por tela (Login, Home, Atividades...)
```

##  Configuração e instalação

### Pré-requisitos

- [Node.js](https://nodejs.org/) 24
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools` e depois `firebase login`
- [Java](https://adoptium.net/) 11 ou superior (exigido pelo emulador do Firestore)

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd expresso
```

### 2. Instalar as dependências do backend

```bash
cd backend
npm install
```

### 3. Configurar as variáveis de ambiente

Copie `backend/.env.servidor.exemplo` para `backend/.env.servidor`. Ele já vem pronto para usar o emulador:

```env
PORT=3000
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
PROJETO_FIREBASE=demo-expresso
BUCKET_FIREBASE=demo-expresso.appspot.com
```

> Não crie um `backend/.env`: a pasta `backend/` também é a pasta da Cloud Function, e o Firebase CLI envia as variáveis desse arquivo para a nuvem (e recusa `PORT`). O `.env.servidor` só é lido pelo `npm run dev`, pelo `npm run importar:csv` e pelo `npm run migrar:mysql`.

Para o servidor local usar o **Firestore de verdade** em vez do emulador, troque para a opção B do arquivo de exemplo: baixe a chave em *Console do Firebase > Configurações do projeto > Contas de serviço > Gerar nova chave privada*, salve como `backend/serviceAccountKey.json` (já está no `.gitignore`) e aponte `GOOGLE_APPLICATION_CREDENTIALS` para ela.

### 4. Subir os emuladores do Firebase

```bash
npm run emuladores
```

Sobe localmente o Firestore (porta 8080), o Storage (9199), a API como Cloud Function (5001), o Hosting com o frontend (5000) e o **Emulator UI** em `http://127.0.0.1:4000`, onde dá para ver os dados gravados e os logs da função. Os dados ficam salvos em `.emulador-dados/` ao fechar com `Ctrl+C`.

Não é preciso criar tabelas: o Firestore cria as coleções no primeiro registro. Como o Firestore não tem `AUTO_INCREMENT`, o último id de cada coleção fica em `contadores/<colecao>`, e as tarefas e usuários continuam com ids numéricos (`#001`, `#002`...).

Para entrar no sistema é preciso ter um usuário **TI**, o único cargo que cadastra usuários. Como o primeiro ainda não existe, ele é criado direto no banco: no Emulator UI (ou no Console do Firebase, na nuvem), em **Firestore**, crie o documento `usuarios/1` com os campos `id` (number `1`), `nome`, `usuario`, `email`, `senha`, `setor` (`TI`), `funcao` (`ti`) e `ativo` (boolean `true`), e o documento `contadores/usuarios` com `ultimo` (number `1`). Depois disso, os outros usuários são cadastrados pela tela **Usuários**.

### 5. (Opcional) Importar tarefas iniciais

O arquivo `backend/dados/tarefas_iniciais.csv` contém tarefas de exemplo que podem ser inseridas no banco configurado no `.env.servidor`:

```bash
npm run importar:csv                              # dados/tarefas_iniciais.csv
npm run importar:csv -- planilha.csv              # outro arquivo
npm run importar:csv -- planilha.csv --simular    # só confere e mostra o relatório, sem gravar
```

Colunas: `titulo` (obrigatória), `descricao`, `responsavel`, `status`, `prioridade`, `data_inicio`, `data_conclusao`. Aceita o CSV do Excel em português (ponto e vírgula, Windows-1252) ou UTF-8, datas `DD/MM/AAAA` ou `AAAA-MM-DD` e textos como "Concluída" ou "Alta". Cada linha passa pelas mesmas validações da API: a inválida é recusada com o número da linha e o motivo, o responsável é ligado ao usuário de mesmo nome e importar o mesmo arquivo de novo não duplica as atividades.

**Migração do MySQL antigo.** Os dados do backend antigo (banco `pi_db`) foram trazidos para o Firestore com `npm run migrar:mysql`, que lê as credenciais do MySQL de `backend/.env.mysql.antigo` (não versionado; o modelo é o `backend/.env.mysql.antigo.exemplo`). Sem `-- --aplicar`, só mostra o plano, os avisos e os erros; com ele, grava tudo num lote só (tudo ou nada), mantendo ids, senhas e datas. Detalhes em [docs/dados-e-integracao.md](docs/dados-e-integracao.md).

### 6. Rodar a API

Com os emuladores no ar, a API já responde em `http://127.0.0.1:5001/demo-expresso/southamerica-east1/api`. Para desenvolver com o servidor local (recarrega sozinho a cada alteração), abra outro terminal:

```bash
npm run dev     # com nodemon (recarrega automaticamente)
# ou
npm start       # execução simples
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`) e usa o banco configurado no `.env.servidor`.

Para conferir a gravação de ponta a ponta, rode `npm run testar` informando um usuário de teste (de preferência TI), porque a API exige login. Para testar outro endereço, como a função na nuvem, informe também `BASE_URL`:

```powershell
$env:TESTE_LOGIN = "seu.usuario"; $env:TESTE_SENHA = "sua-senha"; npm run testar
```

### 7. Rodar o frontend

Em outra janela do terminal:

```bash
cd frontend-react
npm install     # só na primeira vez
npm run dev
```

Abra o endereço que aparece no terminal (normalmente `http://localhost:5173`). A tela de login redireciona para a Home após a autenticação.

> No `npm run dev` o frontend consome a API a partir de `http://localhost:3000`, então o servidor local precisa estar em execução. Para apontar para outro endereço, crie um arquivo `.env` em `frontend-react/` com `VITE_API_URL=http://outro-endereco:3000`.

Para gerar a versão de produção: `npm run build` (cria a pasta `frontend-react/dist/`). Ela usa `VITE_API_URL=/api` (arquivo `frontend-react/.env.production`), que é o endereço da API dentro do Firebase Hosting.

##  Publicando no Firebase

1. No [Console do Firebase](https://console.firebase.google.com/), crie o projeto e, em **Firestore Database**, crie o banco `(default)` na edição Standard, em modo de produção, na região `southamerica-east1` (São Paulo).
2. Mude o projeto para o plano **Blaze** (*Upgrade*). Ele é exigido para publicar Cloud Functions e para o Storage; o uso de um projeto acadêmico cabe na cota gratuita, mas vale criar um alerta de orçamento no Google Cloud.
3. Em **Storage**, clique em *Começar* e crie o bucket em modo de produção. Os locais dos EUA (`US-EAST1`, `US-CENTRAL1`, `US-WEST1`) têm cota gratuita; os demais cobram desde o primeiro byte.
4. Na raiz do repositório, vincule o projeto (cria o `.firebaserc`) e publique:

```bash
firebase use --add                # escolha o projeto criado
firebase deploy                   # Firestore e Storage (regras) + Functions (API) + Hosting (frontend)
```

Antes do primeiro deploy, configure a conta Gmail que envia os códigos de recuperação de senha. Use uma **senha de app** (Conta Google > Segurança > Verificação em duas etapas > Senhas de app), não a senha normal. Os valores ficam no Secret Manager do Google, fora do código:

```bash
firebase functions:secrets:set GMAIL_USUARIO     # cole o endereço Gmail
firebase functions:secrets:set GMAIL_SENHA_APP   # cole a senha de app (16 letras)
```

Nos emuladores e no `npm run dev` isso é opcional: sem Gmail configurado, o e-mail com o código só aparece no terminal.

O deploy do Hosting já roda o `npm run build` do frontend. Ao final o terminal mostra os endereços:

- Site: `https://<projeto>.web.app` (a API responde no mesmo site, em `/api`, ex.: `/api/health`)
- API direta: `https://southamerica-east1-<projeto>.cloudfunctions.net/api`

Sem o plano Blaze ainda dá para publicar o banco e o site (`firebase deploy --only firestore,hosting`), mas a API precisa rodar fora do Firebase.

### Logs

Cada requisição gera uma linha `[HTTP] MÉTODO /rota -> status (tempo)`, e as gravações geram `[TAREFAS]`/`[USUARIOS]`/`[ANEXOS]`/`[NOTIFICACOES]`/`[PERFIL]`/`[RECUPERACAO]`. A rotina diária gera `[PRAZOS]` e `[MANUTENCAO]`, e erros inesperados, `[ERRO]`. Elas aparecem:

- no terminal do `npm run dev`;
- no **Emulator UI** (`http://127.0.0.1:4000/logs`) ao usar os emuladores;
- na nuvem, em `npm run logs` (`firebase functions:log`) ou no *Console do Firebase > Functions > Logs*.

##  Cargos e permissões

O cargo é o campo `funcao` do usuário. As regras ficam todas em `backend/src/utils/permissoes.js`, e a API recusa (403) ou esconde (404) o que o cargo não permite. O frontend só reflete isso nos menus e botões.

| | Usuário padrão (`usuario`) | Gestor (`gestor`) | TI (`ti`) |
|---|---|---|---|
| Ver atividades | as atribuídas a ele | as de todos do seu setor e as que criou | todas |
| Criar e atribuir | só a si mesmo | a si e aos usuários padrão do seu setor | a qualquer pessoa |
| Editar e excluir | as que ele mesmo criou | as que criou e as dos usuários padrão do setor | todas |
| Mudar status e anexar | também nas que o gestor atribuiu a ele | ✓ | ✓ |
| Relatórios | os próprios | do setor, com filtro por pessoa | de todos |
| Cadastro de usuários | — | — | ✓ |

Cada atividade devolvida pela API vem com `permissoes: { status, editar, excluir }`, calculadas para quem está logado.

Toda rota, menos `/`, `/health`, `/auth/login` e a recuperação de senha, exige o cabeçalho `Authorization: Bearer <token>`, com o token devolvido pelo login. A sessão vale 12 horas e fica na coleção `sessoes` (só o hash do token). O cargo é lido do banco a cada chamada, então mudar a função ou desativar alguém vale na hora; trocar a senha ou excluir o usuário derruba os logins abertos. O sistema não deixa ficar sem um TI ativo, e ninguém exclui a própria conta.

##  Endpoints da API

### Status

| Método | Rota      | Descrição                                  |
|--------|-----------|---------------------------------------------|
| GET    | `/`       | Informações básicas da API                  |
| GET    | `/health` | Verifica se a API e o Firestore estão ativos (devolve a hora do banco) |

### Autenticação

| Método | Rota                    | Descrição                        |
|--------|-------------------------|-----------------------------------|
| POST   | `/auth/login`           | Autentica um usuário (usuário/senha) e devolve `{ token, usuario }` |
| POST   | `/auth/sair`            | Encerra a sessão do token enviado |
| POST   | `/auth/recuperar-senha` | Recebe `{ email }` e envia um código de 6 dígitos (vale 15 min) para o e-mail. A resposta é a mesma exista o e-mail ou não |
| POST   | `/auth/redefinir-senha` | Recebe `{ email, codigo, nova_senha }` e troca a senha (mínimo 6 caracteres; 5 tentativas por código) |

A tela fica em `/recuperar-senha` (link "Esqueci minha senha" no login). O código é guardado só como hash, na coleção `recuperacoes`, e apagado depois do uso.

### Usuários

| Método | Rota                    | Descrição                         |
|--------|-------------------------|-------------------------------------|
| GET    | `/usuarios/atribuiveis` | Quem o usuário logado pode escolher como responsável (qualquer cargo) |
| GET    | `/usuarios/participantes` | Usuários ativos que podem ser participantes (só id, nome e setor) |
| GET    | `/usuarios`             | Lista todos os usuários (só TI)     |
| GET    | `/usuarios/:id`         | Busca um usuário pelo ID (TI, ou a própria pessoa) |
| POST   | `/usuarios`             | Cria um novo usuário (só TI)        |
| PUT    | `/usuarios/:id`         | Atualiza um usuário existente (só TI) |
| DELETE | `/usuarios/:id`         | Remove um usuário (só TI); as atividades dele continuam |

### Tarefas

| Método | Rota           | Descrição                                         |
|--------|----------------|-----------------------------------------------------|
| GET    | `/tarefas`     | Lista as tarefas que o cargo pode ver (aceita `?status=` como filtro) |
| GET    | `/tarefas/:id` | Busca uma tarefa pelo ID                            |
| POST   | `/tarefas`     | Cria uma nova tarefa; o responsável vem de `usuario_id` (sem ele, é quem criou) e os participantes de `participantes_ids` |
| PUT    | `/tarefas/:id` | Atualiza campos de uma tarefa existente             |
| DELETE | `/tarefas/:id` | Remove uma tarefa (e os arquivos dela no Storage)   |
| POST   | `/tarefas/verificar-prazos` | Roda agora a verificação de prazos vencidos (só TI) |

Campos aceitos: `titulo` (obrigatório, até 150), `descricao` (até 2000), `usuario_id`, `participantes_ids` (até 20 usuários ativos), `status` (`pendente`, `em andamento`, `concluido`, `cancelado`), `prioridade` (`baixo`, `medio`, `alto`, `urgente`), `data_inicio` e `data_conclusao` (`AAAA-MM-DD`, vencimento não antes do início). Os outros campos (`responsavel`, `participantes`, `criado_por`, `finalizado_em`, `atrasada`...) são preenchidos pela API.

**Prazos.** Quando o dia de `data_conclusao` termina (horário de Brasília) e a atividade ainda está pendente ou em andamento, ela vira `urgente`, ganha `atrasada: true`, `atrasada_desde` e guarda a prioridade de antes em `prioridade_original`; o responsável e quem criou recebem um aviso. Se o prazo for adiado, a prioridade volta. A conferência roda ao criar/alterar a atividade e todo dia às 00:05 (`backend/src/utils/prazos.js`).

### Notificações e perfil

| Método | Rota                       | Descrição                                        |
|--------|----------------------------|--------------------------------------------------|
| GET    | `/notificacoes`            | Os 30 avisos mais recentes de quem está logado   |
| GET    | `/notificacoes/contagem`   | Quantos não foram lidos (o número do sino)       |
| POST   | `/notificacoes/:id/lida`   | Marca um aviso como lido                         |
| POST   | `/notificacoes/lidas`      | Marca todos como lidos                           |
| GET    | `/perfil`                  | Dados de quem está logado (sem a senha)          |
| PUT    | `/perfil/foto`             | Troca a foto (`{ imagem }`: JPEG em base64, até 512 KB) |
| DELETE | `/perfil/foto`             | Remove a foto                                    |
| PUT    | `/perfil/senha`            | Troca a própria senha (`{ senha_atual, nova_senha }`); encerra os logins em outros aparelhos |
| PUT    | `/perfil/tema`             | Guarda o tema (`claro`, `escuro` ou `profundo`)  |

### Manutenção (só TI)

| Método | Rota                          | Descrição                                        |
|--------|-------------------------------|--------------------------------------------------|
| GET    | `/manutencao/consistencia`    | Confere o banco inteiro (13 verificações, ex.: e-mail repetido, responsável excluído, contador de ids atrasado) e devolve quantidade, exemplos e o que fazer. Não altera nada |
| POST   | `/manutencao/rotina-diaria`   | Roda agora a rotina das 00:05: corrige contadores, aplica os prazos e apaga envios de anexo abandonados, sessões e códigos vencidos |

### Anexos

O arquivo não passa pela API (a Cloud Function aceita no máximo 32 MB por requisição). O envio tem três passos: a API valida e devolve um endereço temporário (`url_envio`), o navegador faz um `PUT` do arquivo direto nesse endereço do Storage e depois avisa a API em `/concluir`. O frontend faz isso em `Api.anexarArquivo` (`frontend-react/src/services/api.js`).

| Método | Rota                                       | Descrição                                                        |
|--------|--------------------------------------------|------------------------------------------------------------------|
| GET    | `/tarefas/:id/anexos`                      | Lista os anexos da tarefa, cada um com o link `url` para abrir/baixar |
| POST   | `/tarefas/:id/anexos`                      | Inicia um envio: recebe `{ nome, tamanho }` e devolve `{ anexo, url_envio }` |
| POST   | `/tarefas/:id/anexos/:anexoId/concluir`    | Confirma o anexo depois que o arquivo chegou ao Storage          |
| DELETE | `/tarefas/:id/anexos/:anexoId`             | Remove o anexo e o arquivo                                       |

Tipos aceitos e limite de tamanho ficam em `backend/src/controllers/anexoController.js` (e espelhados em `frontend-react/src/utils/anexos.js`).

Ao confirmar, a API lê só o começo do arquivo no Storage e confere a **assinatura** (os bytes iniciais que identificam cada formato) com a extensão, em `backend/src/utils/assinaturas.js`. Um `.exe` renomeado para `.pdf`, um HTML salvo como `.png` ou um ZIP comum com nome `.docx` são recusados e apagados, com um log `[ANEXOS] ... recusado`. Isso não substitui um antivírus: um arquivo do formato certo, mas com conteúdo malicioso (ex.: um PDF ou um `.doc` com macro), ainda passa.

### Feriados

| Método | Rota             | Descrição                                             |
|--------|------------------|---------------------------------------------------------|
| GET    | `/feriados/:ano` | Lista os feriados nacionais do ano informado (ex: `/feriados/2026`), via BrasilAPI |

##  Testando a API

### Bateria completa (com relatório de evidências)

Na pasta `backend`:

```bash
npm run testar:tudo
```

Compila o site, sobe os emuladores (sem tocar na nuvem), roda os testes de [backend/testes/suites](backend/testes/suites) contra a API e o site de verdade e grava o resultado de cada checagem, com prints das telas, em [docs/evidencias/relatorio-de-testes.md](docs/evidencias/relatorio-de-testes.md). Termina com erro se alguma checagem falhar. Os testes de tela usam o Microsoft Edge ou o Google Chrome instalados; sem eles, essa parte é pulada e o relatório avisa. Feche o `npm run emuladores` antes, porque as portas são as mesmas. Para os testes de recuperação de senha, não configure o Gmail nos emuladores (`backend/.secret.local`): o código precisa ficar na "caixa de entrada" local.

### Coleções e roteiro manual

A coleção do **Postman** fica em `backend/testes/PI-api.postman_collection.json` (o Insomnia também importa esse arquivo: *Import → From File*). Ela tem 73 requisições, em 12 pastas: status, login, usuários, atividades, anexos (inclusive o envio direto ao Storage e um arquivo disfarçado), notificações, perfil, feriados, manutenção, validações e permissões, recuperação de senha e limpeza.

1. Importe em *File → Import*.
2. Na aba *Variables* da coleção, preencha `usuario` e `senha` de um usuário **TI**. O `baseUrl` já vem com o endereço dos emuladores; para a nuvem, use `https://pi-expresso.web.app/api`.
3. Rode *2. Login*: o token é guardado sozinho e vai no cabeçalho `Authorization: Bearer` das outras requisições.
4. Para rodar tudo de uma vez, use o *Runner* (*Run collection*) na ordem das pastas. A coleção cria um usuário e uma atividade de teste e apaga os dois no fim. Cada requisição tem testes (aba *Tests*) que conferem o código HTTP e os dados devolvidos, então o Runner mostra o que passou e o que falhou.

Há também um script auxiliar, `testar_gravacao.js` (`npm run testar`), para testes de gravação diretos.

##  Status do frontend

| Tela                      | Rota                      | Situação        |
|---------------------------|---------------------------|------------------|
| Login                     | `/login`                  | ✅ Implementada   |
| Home (dashboard)          | `/`                       | ✅ Implementada   |
| Atividades                | `/atividades`             | ✅ Implementada   |
| Nova atividade / Detalhes | `/atividades/nova`, `/atividades/:id` | ✅ Implementadas |
| Usuários                  | `/usuarios`               | ✅ Implementada   |
| Relatórios                | `/relatorios`             | ✅ Implementada   |
| Meu perfil                | `/perfil`                 | ✅ Implementada   |
| Recuperar senha           | `/recuperar-senha`        | ✅ Implementada   |

> O frontend original em HTML/CSS/JS puro foi convertido para React. A versão antiga pode ser consultada no histórico do git (commit `Expresso 1.5v`).
