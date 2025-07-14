#!/bin/bash

# Script para iniciar a aplicação
set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

echo ""
log "🚀 Iniciando aplicação de gerenciamento de usuários..."
echo ""

# Verificar se Docker e Docker Compose estão instalados
if ! command -v docker &> /dev/null; then
    log_error "Docker não está instalado"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    log_error "Docker Compose não está instalado"
    exit 1
fi

# Parar containers existentes se estiverem rodando
log "Parando containers existentes..."
docker compose down > /dev/null 2>&1 || true

# Construir e iniciar os serviços
log "Construindo e iniciando os serviços..."
docker compose up --build -d

# Aguardar serviços ficarem disponíveis
log "Aguardando serviços ficarem disponíveis..."
sleep 10

# Verificar status dos containers
log "Verificando status dos containers..."
docker compose ps

echo ""
log_success "🎉 Aplicação iniciada com sucesso!"
echo ""
log "Acesse a aplicação:"
log "- Frontend: http://localhost:3000"
log "- API: http://localhost:8000"
log "- Documentação da API: http://localhost:8000/docs"
echo ""
log "Para executar testes:"
log "- ./scripts/test_app.sh [tempo_em_segundos]"
echo ""
log "Para parar a aplicação:"
log "- docker compose down"
echo ""
