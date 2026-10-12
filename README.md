#  Expresso — Projeto Integrador (PI)

Sistema web para controle de fluxo e atividades, com funcionalidades semelhantes ao **Trello** e ao **Fluig**. O projeto é dividido em uma **API REST** (Node.js + Express + Firestore) e um **frontend** em React (Vite + React Router + Tailwind CSS), hospedados no **Firebase**.

##  Sobre o projeto

O Expresso permite:

- Autenticação de usuários (login);
- Cadastro, edição, listagem e exclusão de **usuários**;
- Cadastro, edição, listagem e exclusão de **tarefas** (com filtro por status);
- **Anexos** nas tarefas (PDF, imagens, Word, Excel, PowerPoint, vídeos e áudios, até 200 MB cada), guardados no Cloud Storage;
- Consulta de **feriados nacionais** por ano, via integração com a [BrasilAPI](https://brasilapi.com.br/);
- Importação de tarefas iniciais a partir de um arquivo CSV;
- **Relatórios** com evolução do backlog, tempo médio para conclusão, resumo do período (com dias úteis descontando feriados), filtros e exportação em CSV — tudo calculado a partir das tarefas do banco.

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
- [Nodemon](https://www.npmjs.com/package/nodemon) (ambiente de desenvolvimento)

**Frontend**
- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/) (navegação entre as telas)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/) (gráficos da tela de relatórios)
- Consumo da API via `fetch`

**Nuvem (Firebase)**
- **Cloud Firestore**: banco de dados (coleções `tarefas`, `usuarios` e `contadores`)
- **Cloud Storage**: guarda os arquivos anexados às tarefas (`tarefas/<id>/...`)
- **Cloud Functions**: executa a API Node.js (região `southamerica-east1`, São Paulo)
- **Hosting**: publica o frontend e encaminha `/api/**` para a função
- **Emulator Suite**: roda tudo isso localmente, sem custo, para desenvolvimento e testes

##  Estrutura do projeto

```
expresso/
├── firebase.json                      # serviços do Firebase (Firestore, Functions, Hosting, emuladores)
├── firestore.rules                    # bloqueia acesso direto do navegador ao banco
├── storage.rules                      # idem para os arquivos (o acesso passa pela API)
├── backend/                           # também é a pasta da Cloud Function
│   ├── dados/
│   │   └── tarefas_iniciais.csv       # dados de exemplo para importação
│   ├── scripts/
│   │   └── importarCsv.js             # script de importação de tarefas via CSV
│   ├── src/
│   │   ├── app.js                     # monta o Express (rotas, middlewares, log de requisições)
│   │   ├── config/
│   │   │   └── firebase.js            # conexão com o Firestore/Storage e helpers (ids, datas, links)
│   │   ├── controllers/
│   │   │   ├── anexoController.js     # arquivos das tarefas (tipos aceitos e limite de tamanho)
│   │   │   ├── authController.js
│   │   │   ├── feriadoController.js
│   │   │   ├── tarefaController.js
│   │   │   └── usuarioController.js
│   │   ├── middlewares/
│   │   │   └── errorHandler.js        # 404 e tratamento de erros
│   │   └── routes/
│   │       ├── authRoutes.js
│   │       ├── feriadoRoutes.js
│   │       ├── tarefaRoutes.js
│   │       └── usuarioRoutes.js
│   ├── testes/
│   │   ├── PI-api.insomnia_collection.json
│   │   ├── PI-api.postman_collection.json
│   │   └── testar_gravacao.js
│   ├── .env.servidor.exemplo          # modelo do .env.servidor (o real não é versionado)
│   ├── index.js                       # ponto de entrada na nuvem (Cloud Function "api")
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

> Não crie um `backend/.env`: a pasta `backend/` também é a pasta da Cloud Function, e o Firebase CLI envia as variáveis desse arquivo para a nuvem (e recusa `PORT`). O `.env.servidor` só é lido pelo `npm run dev` e pelo `npm run importar:csv`.

Para o servidor local usar o **Firestore de verdade** em vez do emulador, troque para a opção B do arquivo de exemplo: baixe a chave em *Console do Firebase > Configurações do projeto > Contas de serviço > Gerar nova chave privada*, salve como `backend/serviceAccountKey.json` (já está no `.gitignore`) e aponte `GOOGLE_APPLICATION_CREDENTIALS` para ela.

### 4. Subir os emuladores do Firebase

```bash
npm run emuladores
```

Sobe localmente o Firestore (porta 8080), o Storage (9199), a API como Cloud Function (5001), o Hosting com o frontend (5000) e o **Emulator UI** em `http://127.0.0.1:4000`, onde dá para ver os dados gravados e os logs da função. Os dados ficam salvos em `.emulador-dados/` ao fechar com `Ctrl+C`.

Não é preciso criar tabelas: o Firestore cria as coleções no primeiro registro. Como o Firestore não tem `AUTO_INCREMENT`, o último id de cada coleção fica em `contadores/<colecao>`, e as tarefas e usuários continuam com ids numéricos (`#001`, `#002`...).

Para entrar no sistema é preciso ter ao menos um usuário. Crie o primeiro pelo Postman/Insomnia (`POST /usuarios`) com `"funcao": "gestor"`.

### 5. (Opcional) Importar tarefas iniciais

O arquivo `backend/dados/tarefas_iniciais.csv` contém tarefas de exemplo que podem ser inseridas no banco configurado no `.env.servidor`:

```bash
npm run importar:csv
```

### 6. Rodar a API

Com os emuladores no ar, a API já responde em `http://127.0.0.1:5001/demo-expresso/southamerica-east1/api`. Para desenvolver com o servidor local (recarrega sozinho a cada alteração), abra outro terminal:

```bash
npm run dev     # com nodemon (recarrega automaticamente)
# ou
npm start       # execução simples
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`) e usa o banco configurado no `.env.servidor`.

Para conferir a gravação de ponta a ponta: `npm run testar` (ou `BASE_URL=<endereço da API> npm run testar` para testar outro endereço, como a função na nuvem).

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

O deploy do Hosting já roda o `npm run build` do frontend. Ao final o terminal mostra os endereços:

- Site: `https://<projeto>.web.app` (a API responde no mesmo site, em `/api`, ex.: `/api/health`)
- API direta: `https://southamerica-east1-<projeto>.cloudfunctions.net/api`

Sem o plano Blaze ainda dá para publicar o banco e o site (`firebase deploy --only firestore,hosting`), mas a API precisa rodar fora do Firebase.

### Logs

Cada requisição gera uma linha `[HTTP] MÉTODO /rota -> status (tempo)`, e as gravações geram `[TAREFAS]`/`[USUARIOS]`/`[ANEXOS]`. Elas aparecem:

- no terminal do `npm run dev`;
- no **Emulator UI** (`http://127.0.0.1:4000/logs`) ao usar os emuladores;
- na nuvem, em `npm run logs` (`firebase functions:log`) ou no *Console do Firebase > Functions > Logs*.

##  Endpoints da API

### Status

| Método | Rota      | Descrição                                  |
|--------|-----------|---------------------------------------------|
| GET    | `/`       | Informações básicas da API                  |
| GET    | `/health` | Verifica se a API e o Firestore estão ativos (devolve a hora do banco) |

### Autenticação

| Método | Rota          | Descrição                        |
|--------|---------------|-----------------------------------|
| POST   | `/auth/login` | Autentica um usuário (usuário/senha) |

### Usuários

| Método | Rota            | Descrição                         |
|--------|-----------------|-------------------------------------|
| GET    | `/usuarios`     | Lista todos os usuários             |
| GET    | `/usuarios/:id` | Busca um usuário pelo ID            |
| POST   | `/usuarios`     | Cria um novo usuário                |
| PUT    | `/usuarios/:id` | Atualiza um usuário existente       |
| DELETE | `/usuarios/:id` | Remove um usuário                   |

### Tarefas

| Método | Rota           | Descrição                                         |
|--------|----------------|-----------------------------------------------------|
| GET    | `/tarefas`     | Lista todas as tarefas (aceita `?status=` como filtro) |
| GET    | `/tarefas/:id` | Busca uma tarefa pelo ID                            |
| POST   | `/tarefas`     | Cria uma nova tarefa                                |
| PUT    | `/tarefas/:id` | Atualiza campos de uma tarefa existente             |
| DELETE | `/tarefas/:id` | Remove uma tarefa (e os arquivos dela no Storage)   |

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

A pasta `backend/testes/` contém coleções prontas para importar em:

- **Postman** — `PI-api.postman_collection.json`
- **Insomnia** — `PI-api.insomnia_collection.json`

Há também um script auxiliar, `testar_gravacao.js`, para testes de gravação diretos.

##  Status do frontend

| Tela                      | Rota                      | Situação        |
|---------------------------|---------------------------|------------------|
| Login                     | `/login`                  | ✅ Implementada   |
| Home (dashboard)          | `/`                       | ✅ Implementada   |
| Atividades                | `/atividades`             | ✅ Implementada   |
| Nova atividade / Detalhes | `/atividades/nova`, `/atividades/:id` | ✅ Implementadas |
| Usuários                  | `/usuarios`               | ✅ Implementada   |
| Relatórios                | `/relatorios`             | ✅ Implementada   |

> O frontend original em HTML/CSS/JS puro foi convertido para React. A versão antiga pode ser consultada no histórico do git (commit `Expresso 1.5v`).
