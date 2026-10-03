#  Expresso — Projeto Integrador (PI)

Sistema web para controle de fluxo e atividades, com funcionalidades semelhantes ao **Trello** e ao **Fluig**. O projeto é dividido em uma **API REST** (Node.js + Express + MySQL) e um **frontend** em React (Vite + React Router + Tailwind CSS).

##  Sobre o projeto

O Expresso permite:

- Autenticação de usuários (login);
- Cadastro, edição, listagem e exclusão de **usuários**;
- Cadastro, edição, listagem e exclusão de **tarefas** (com filtro por status);
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

- **Backend** (Node.js, Express, MySQL): Ícaro, Kevin e Vitor.
- **Frontend** (React): Isadora e Vitória.

##  Tecnologias utilizadas

**Backend**
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [MySQL2](https://www.npmjs.com/package/mysql2) (pool de conexões)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [CORS](https://www.npmjs.com/package/cors)
- [Nodemon](https://www.npmjs.com/package/nodemon) (ambiente de desenvolvimento)

**Frontend**
- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/) (navegação entre as telas)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/) (gráficos da tela de relatórios)
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

Crie no MySQL um banco com as tabelas `usuarios` e `tarefas` compatíveis com os campos usados pela API (ex.: `usuarios(id, nome, usuario, email, senha, setor, funcao, ativo, criado_em)` e `tarefas(id, titulo, descricao, responsavel, participantes, usuario_id, status, prioridade, data_inicio, data_conclusao, criado_em)`).

Ao subir, a API cria sozinha as colunas novas que estiverem faltando (veja `backend/src/config/estrutura.js`). Hoje isso vale para `tarefas.finalizado_em`, que guarda o momento em que a tarefa foi concluída ou cancelada e é usada nos relatórios. Tarefas encerradas antes dessa coluna existir ficam sem essa data e não entram no cálculo do backlog nem do tempo médio.

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

### 7. Rodar o frontend

Em outra janela do terminal:

```bash
cd frontend-react
npm install     # só na primeira vez
npm run dev
```

Abra o endereço que aparece no terminal (normalmente `http://localhost:5173`). A tela de login redireciona para a Home após a autenticação.

> O frontend consome a API a partir de `http://localhost:3000`, então o backend precisa estar em execução. Para apontar para outro endereço, crie um arquivo `.env` em `frontend-react/` com `VITE_API_URL=http://outro-endereco:3000`.

Para gerar a versão de produção: `npm run build` (cria a pasta `frontend-react/dist/`).

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

| Tela                      | Rota                      | Situação        |
|---------------------------|---------------------------|------------------|
| Login                     | `/login`                  | ✅ Implementada   |
| Home (dashboard)          | `/`                       | ✅ Implementada   |
| Atividades                | `/atividades`             | ✅ Implementada   |
| Nova atividade / Detalhes | `/atividades/nova`, `/atividades/:id` | ✅ Implementadas |
| Usuários                  | `/usuarios`               | ✅ Implementada   |
| Relatórios                | `/relatorios`             | ✅ Implementada   |

> O frontend original em HTML/CSS/JS puro foi convertido para React. A versão antiga pode ser consultada no histórico do git (commit `Expresso 1.5v`).
