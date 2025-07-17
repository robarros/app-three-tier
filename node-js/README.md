# Aplicação de Gerenciamento de Usuários com Node.js

Esta é uma versão em Node.js da aplicação de gerenciamento de usuários, originalmente desenvolvida com React.

## Tecnologias Utilizadas

- Node.js
- Express.js
- Vanilla JavaScript (frontend)
- HTML5 e CSS3

## Estrutura do Projeto

```
node-js/
├── public/               # Arquivos estáticos (frontend)
│   ├── css/              # Estilos CSS
│   ├── js/               # JavaScript do cliente
│   └── index.html        # Página principal
├── src/                  # Código-fonte do servidor
│   └── services/         # Serviços
├── .env                  # Variáveis de ambiente
├── Dockerfile            # Configuração do Docker
├── package.json          # Dependências e scripts
└── server.js             # Servidor Express
```

## Funcionalidades

- Listagem de usuários com paginação
- Busca de usuários por nome ou email
- Criação, edição e exclusão de usuários
- Comunicação com a API de backend

## Como Executar

### Localmente

1. Instale as dependências:
   ```
   npm install
   ```

2. Execute a aplicação:
   ```
   npm start
   ```

3. Acesse a aplicação em `http://localhost:3000`

### Com Docker

1. Construa a imagem:
   ```
   docker build -t user-management-node .
   ```

2. Execute o container:
   ```
   docker run -p 3000:3000 -e API_URL=http://backend:8000 user-management-node
   ```

   Ou, para executar em modo detached (background):
   ```
   docker run -d -p 3000:3000 -e API_URL=http://backend:8000 user-management-node
   ```

3. Para parar o container:
   ```
   docker stop user-management-node
   ```

4. Para remover o container:
   ```
   docker rm user-management-node
   ```

## Variáveis de Ambiente

- `PORT`: Porta em que o servidor irá executar (padrão: 3000)
- `API_URL`: URL da API de backend (padrão: http://backend:8000)
