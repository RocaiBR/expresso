#  Expresso — Projeto Integrador (PI)

Sistema web para controle de fluxo e atividades, com funcionalidades semelhantes ao **Trello** e ao **Fluig**. O projeto é dividido em uma **API REST** (Node.js + Express + MySQL) e um **frontend** em HTML, CSS e JavaScript puro.

##  Sobre o projeto

O Expresso permite:

- Autenticação de usuários (login);
- Cadastro, edição, listagem e exclusão de **usuários**;
- Cadastro, edição, listagem e exclusão de **tarefas** (com filtro por status);
- Consulta de **feriados nacionais** por ano, via integração com a [BrasilAPI](https://brasilapi.com.br/);
- Importação de tarefas iniciais a partir de um arquivo CSV.

> Este é um Projeto Integrador acadêmico (UNIFEOB) e está em desenvolvimento — algumas telas do frontend (dashboard, relatórios, atividades) ainda estão em construção.

##  Equipe

| RA          | Nome                              | Frente         |
|-------------|------------------------------------|----------------|
| 25000026    | Ícaro Cauã Guminiak de Godoy       | Backend        |
| 25000492    | Kevin Henrique Benedito            | Backend        |
| 25000095    | Vitor Leoncio Bartalini            | Backend        |
| 25001227    | Isadora Cabral dos Santos          | Frontend       |
| 25000215    | Vitória Karolina Santos Silva      | Frontend       |

- **Backend** (Node.js, Express, MySQL): Ícaro, Kevin e Vitor.
- **Frontend** (HTML, CSS, JavaScript): Isadora e Vitória.

##  Tecnologias utilizadas

**Backend**
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [MySQL2](https://www.npmjs.com/package/mysql2) (pool de conexões)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [CORS](https://www.npmjs.com/package/cors)
- [Nodemon](https://www.npmjs.com/package/nodemon) (ambiente de desenvolvimento)

**Frontend**
- HTML5, CSS3 e JavaScript puro (sem frameworks)
- Consumo da API via `fetch`

##  Estrutura do projeto

```
expresso/
├── backend/
│   ├── dados/
│   │   └── tarefas_iniciais.csv       # dados de exemplo para importação
│   ├── scripts/
│   │   └── importarCsv.js             # script de importação de tarefas via CSV
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                  # pool de conexão com o MySQL
│   │   ├── controllers/
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
│   ├── .env                           # variáveis de ambiente (não versionado)
│   ├── package.json
│   └── server.js                      # ponto de entrada da API
│
└── frontend/
    ├── assets/
    │   ├── css/                       # estilos (global, dashboard, relatórios, usuários)
    │   └── js/                        # scripts (atividades, auth, relatórios, sidebar, usuários)
    ├── login/
    │   ├── index.html
    │   ├── script.js
    │   └── style.css
    └── views/
        ├── relatorios.html
        └── usuarios.html
```

##  Configuração e instalação

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado
- Um servidor [MySQL](https://www.mysql.com/) em execução

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

Crie um arquivo `.env` dentro da pasta `backend/` com o seguinte formato:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco
```

### 4. Criar o banco de dados

Crie no MySQL um banco com as tabelas `usuarios` e `tarefas` compatíveis com os campos usados pela API (ex.: `usuarios(id, nome, email, senha, criado_em)` e `tarefas(id, titulo, descricao, responsavel, usuario_id, status)`).

### 5. (Opcional) Importar tarefas iniciais

O arquivo `backend/dados/tarefas_iniciais.csv` contém tarefas de exemplo que podem ser inseridas no banco:

```bash
npm run importar:csv
```

### 6. Rodar a API

```bash
npm run dev     # com nodemon (recarrega automaticamente)
# ou
npm start       # execução simples
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

### 7. Abrir o frontend

Abra o arquivo `frontend/login/index.html` diretamente no navegador (ou sirva a pasta `frontend/` com uma extensão como Live Server). A tela de login redireciona para `frontend/views/usuarios.html` após a autenticação.

> O frontend consome a API a partir de `http://localhost:3000`, então o backend precisa estar em execução.

##  Endpoints da API

### Status

| Método | Rota      | Descrição                                  |
|--------|-----------|---------------------------------------------|
| GET    | `/`       | Informações básicas da API                  |
| GET    | `/health` | Verifica se a API e o banco estão ativos    |

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
| DELETE | `/tarefas/:id` | Remove uma tarefa                                   |

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

| Tela                      | Situação        |
|---------------------------|------------------|
| Login                     | ✅ Implementada   |
| Usuários                  | ✅ Implementada   |
| Relatórios                | 🚧 Em construção |
| Dashboard / Atividades    | 🚧 Em construção |
