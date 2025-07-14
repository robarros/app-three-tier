#!/bin/bash

# Script para parar a aplicação
set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

echo ""
log "🛑 Parando aplicação de gerenciamento de usuários..."
echo ""

# Parar e remover containers
log "Parando containers..."
docker compose down

# Opcional: remover volumes (descomentar se necessário)
# log "Removendo volumes..."
# docker-compose down -v

# Mostrar status
log "Status final:"
docker compose ps

echo ""
log_success "🎉 Aplicação parada com sucesso!"
echo ""
log "Para iniciar novamente:"
log "- ./scripts/start_app.sh"
echo ""
