# Expresso — Frontend em React

Versão em React do frontend do Expresso, convertida a partir do frontend original em HTML/CSS/JS puro (pasta `frontend/`). Mesmo visual, mesmas telas, mesma API.

## Tecnologias

- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/) (navegação entre as telas)
- [Tailwind CSS 4](https://tailwindcss.com/) (instalado de verdade, sem CDN)
- [Chart.js](https://www.chartjs.org/) (gráficos da tela de relatórios, também instalado via npm)

## Como rodar

1. Suba o backend (em outra janela do terminal):

   ```bash
   cd backend
   npm run dev
   ```

2. Instale as dependências e rode o frontend:

   ```bash
   cd frontend-react
   npm install
   npm run dev
   ```

3. Abra o endereço que aparece no terminal (normalmente `http://localhost:5173`).

Por padrão a API é consumida em `http://localhost:3000`. Para apontar para outro endereço, crie um arquivo `.env` com:

```env
VITE_API_URL=http://outro-endereco:3000
```

## Estrutura

```
frontend-react/
├── index.html                  # página única (o React monta tudo nela)
└── src/
    ├── main.jsx                # ponto de entrada
    ├── App.jsx                 # rotas da aplicação
    ├── index.css               # Tailwind + estilos globais
    ├── assets/                 # imagens (logo, fundo do login, caneca)
    ├── services/
    │   └── api.js              # chamadas à API (fetch)
    ├── context/
    │   └── AuthContext.jsx     # usuário logado (sessionStorage)
    ├── hooks/
    │   ├── useTarefas.js       # carrega tarefas + atualização automática (15s)
    │   └── useFecharAoClicarFora.js  # fecha menus ao clicar fora / apertar Esc
    ├── utils/
    │   ├── formato.js          # conversões banco <-> tela (datas, rótulos...)
    │   ├── tarefas.js          # filtros das abas e pesquisa
    │   └── relatorios.js       # cálculos dos relatórios (backlog, tempo médio, dias úteis) e CSV
    ├── components/             # peças reutilizadas pelas páginas
    │   ├── Layout.jsx          # navbar + sidebar + proteção de login
    │   ├── Navbar.jsx          # topo com menu do usuário (Sair)
    │   ├── Sidebar.jsx         # menu lateral
    │   ├── Abas.jsx            # abas de filtro das listas
    │   ├── LinhaTarefa.jsx     # linha da tabela de atividades
    │   ├── CampoPesquisa.jsx   # campo de busca (Esc limpa)
    │   ├── Calendario.jsx      # calendário da home
    │   ├── MensagemTabela.jsx  # mensagens de carregando/vazio/erro
    │   ├── Grafico.jsx         # gráfico do Chart.js (usado nos relatórios)
    │   ├── SeletorPeriodo.jsx  # escolha do período dos relatórios
    │   └── Icones.jsx          # ícones SVG compartilhados
    └── pages/                  # uma por tela
        ├── Login.jsx           # /login
        ├── Home.jsx            # /
        ├── Atividades.jsx      # /atividades
        ├── NovaAtividade.jsx   # /atividades/nova
        ├── Confirmacao.jsx     # /atividades/confirmacao
        ├── DetalhesAtividade.jsx  # /atividades/:id
        ├── Usuarios.jsx        # /usuarios
        ├── UsuarioForm.jsx     # /usuarios/novo e /usuarios/:id
        └── Relatorios.jsx      # /relatorios (filtros, resumo, gráficos e CSV)
```

## Diferenças em relação ao frontend antigo

- Navegação sem recarregar a página (React Router) — as "páginas" agora são rotas.
- O HTML repetido em cada tela (navbar, sidebar) virou componente reutilizado.
- O Tailwind é instalado via npm (no antigo era via CDN, que não é recomendado em produção).
- O usuário logado continua no `sessionStorage`, agora acessado pelo `AuthContext`.
- Build de produção disponível: `npm run build` gera a pasta `dist/` pronta para publicar.
