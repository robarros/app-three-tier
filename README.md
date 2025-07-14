# Aplicação de Gerenciamento de Usuários - 3 Camadas

Uma aplicação completa em 3 camadas para gerenciamento de usuários, construída com React (frontend), FastAPI (backend) e PostgreSQL (database).

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │    Database     │
│   React.js      │◄──►│    FastAPI      │◄──►│   PostgreSQL    │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Estrutura do Projeto

```
app-two-tier/
├── docker-compose.yml          # Orquestração dos serviços
├── backend/                    # API Python com FastAPI
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                # Aplicação principal
│   ├── database.py            # Configuração do banco
│   ├── schemas.py             # Modelos Pydantic
│   ├── crud.py                # Operações CRUD
│   └── init.sql               # Script de inicialização do DB
├── frontend/                   # Interface React
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── App.js             # Componente principal
│       ├── index.css          # Estilos
│       └── services/
│           └── userService.js # Cliente API
└── scripts/                   # Scripts utilitários
    ├── start_app.sh          # Script para iniciar aplicação
    ├── test_app.sh          # Script de testes
    ├── create_users.sh      # Script para criar usuários em massa
    └── delete_users.sh      # Script para deletar usuários

```

## 🚀 Como Executar

### Pré-requisitos

- Docker
- Docker Compose

### Iniciando a Aplicação

1. **Clone o repositório** (se aplicável):
   ```bash
   cd app-two-tier
   ```

2. **Execute o script de inicialização**:
   ```bash
   ./scripts/start_app.sh
   ```

   Ou manualmente:
   ```bash
   docker-compose up --build -d
   ```

3. **Aguarde todos os serviços subirem** (cerca de 30-60 segundos)

4. **Acesse a aplicação**:
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:8000
   - **Documentação da API**: http://localhost:8000/docs

## 📱 Funcionalidades

### Interface do Usuário
- ✨ Interface moderna e responsiva
- 📝 Formulário de cadastro e edição de usuários
- 📋 Lista de usuários com paginação (10 usuários por página)
- 🔄 Botão de atualização para recarregar a lista
- 🗑️ Exclusão de usuários com confirmação
- ✏️ Edição inline de usuários
- 📊 Indicador do total de usuários

### Scripts Utilitários

#### Criação em Massa de Usuários
```bash
./scripts/create_users.sh
```
- Cria 300 usuários com dados aleatórios
- Gera nomes brasileiros realistas
- Mostra progresso em tempo real
- Trata erros de criação

#### Deleção de Usuários
```bash
./scripts/delete_users.sh
```
- Deleta todos os usuários do sistema
- Mostra progresso em tempo real
- Verifica status de cada deleção
- Relatório final de sucesso/falhas

### API REST
- 📄 Documentação Swagger em `/docs`
- 🔄 Suporte a paginação (`skip` e `limit`)
- ✅ Validação de dados
- 🔍 Busca por ID e email
- 📝 CRUD completo de usuários

## 🧪 Testes

### Script de Teste Automatizado

Execute o script de teste que pode rodar por um tempo específico:

```bash
# Teste por 5 minutos (padrão)
./scripts/test_app.sh

# Teste por 10 minutos
./scripts/test_app.sh 600

# Teste por 30 segundos
./scripts/test_app.sh 30
```

O script de teste executa:
- ✅ Verificação de saúde dos serviços
- ✅ Testes funcionais de CRUD
- ✅ Teste de carga com requisições contínuas
- ✅ Monitoramento de recursos
- ✅ Limpeza automática

### Testes Manuais da API

```bash
# Health check
curl http://localhost:8000/health

# Listar usuários
curl http://localhost:8000/users/

# Criar usuário
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{"name":"João Silva","email":"joao@exemplo.com","age":30}'

# Atualizar usuário (substitua {id} pelo ID real)
curl -X PUT http://localhost:8000/users/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"João Santos","age":31}'

# Excluir usuário (substitua {id} pelo ID real)
curl -X DELETE http://localhost:8000/users/{id}
# Retorna: {"message":"User {id} deleted successfully"}
```

## 🐳 Docker Services

### postgres
- **Imagem**: postgres:16-alpine
- **Porta**: 5432
- **Database**: userdb
- **Usuário**: appuser
- **Senha**: apppassword

### backend
- **Framework**: FastAPI + Uvicorn
- **Porta**: 8000
- **Hot reload**: Habilitado em desenvolvimento

### frontend
- **Framework**: React.js
- **Porta**: 3000
- **Proxy**: Configurado para backend

## 🛠️ Comandos Úteis

```bash
# Ver logs dos serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Parar aplicação
docker-compose down

# Parar e remover volumes (cuidado: apaga dados do banco)
docker-compose down -v

# Reconstruir imagens
docker-compose build --no-cache

# Executar comando no container do backend
docker-compose exec backend bash

# Executar comando no banco
docker-compose exec postgres psql -U appuser -d userdb

# Ver status dos containers
docker-compose ps

# Ver uso de recursos
docker stats
```

## 🔧 Configurações

### Variáveis de Ambiente

#### Backend
- `DATABASE_URL`: URL de conexão com PostgreSQL

#### Frontend
- `REACT_APP_API_URL`: URL da API backend

### Portas
- **Frontend**: 3000
- **Backend**: 8000
- **PostgreSQL**: 5432

## 📝 Modelo de Dados

### Usuário
```json
{
  "id": 1,
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "age": 30,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### Validações
- **Nome**: Obrigatório, máximo 100 caracteres
- **Email**: Obrigatório, formato válido, único
- **Idade**: Obrigatório, número positivo

## 🐛 Troubleshooting

### Problemas Comuns

1. **Porta já em uso**:
   ```bash
   # Verificar processos usando as portas
   sudo lsof -i :3000
   sudo lsof -i :8000
   sudo lsof -i :5432
   ```

2. **Containers não sobem**:
   ```bash
   # Verificar logs
   docker-compose logs
   
   # Recriar containers
   docker-compose down
   docker-compose up --build
   ```

3. **Erro de conexão com banco**:
   ```bash
   # Verificar se PostgreSQL está rodando
   docker-compose exec postgres pg_isready -U appuser
   
   # Verificar logs do banco
   docker-compose logs postgres
   ```

4. **Frontend não conecta com backend**:
   - Verificar se backend está rodando na porta 8000
   - Verificar configuração de CORS no backend
   - Verificar variável `REACT_APP_API_URL`

## 📈 Performance

O script de teste monitora:
- **CPU Usage**: Uso de CPU por container
- **Memory Usage**: Uso de memória por container
- **Request Rate**: Taxa de requisições por segundo
- **Error Rate**: Taxa de erro das requisições
- **Response Time**: Tempo de resposta médio

## 🔒 Segurança

### Implementadas
- ✅ Validação de entrada de dados
- ✅ CORS configurado adequadamente
- ✅ Constraints de banco de dados
- ✅ Tratamento de erros sem vazamento de informações

### Recomendações para Produção
- [ ] Implementar autenticação/autorização
- [ ] Usar HTTPS
- [ ] Configurar rate limiting
- [ ] Implementar logging estruturado
- [ ] Usar secrets management para senhas
- [ ] Implementar backup automático do banco

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs: `docker-compose logs`
2. Executar script de teste: `./scripts/test_app.sh`
3. Verificar documentação da API: http://localhost:8000/docs
