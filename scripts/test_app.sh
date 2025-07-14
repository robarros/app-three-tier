#!/bin/bash

# Script de teste para aplicação de gerenciamento de usuários
# Uso: ./test_app.sh [tempo_em_segundos]

set -e

# Configurações
API_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"
DEFAULT_TEST_DURATION=300  # 5 minutos por padrão

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log com timestamp
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

# Função para verificar se um serviço está rodando
check_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    log "Verificando se $service_name está rodando..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            log_success "$service_name está rodando!"
            return 0
        fi
        
        log "Tentativa $attempt/$max_attempts - Aguardando $service_name..."
        sleep 2
        ((attempt++))
    done
    
    log_error "$service_name não está respondendo após $max_attempts tentativas"
    return 1
}

# Função para testar endpoints da API
test_api_endpoints() {
    log "Testando endpoints da API..."
    
    # Teste de health check
    if curl -s "$API_URL/health" | grep -q "healthy"; then
        log_success "Health check OK"
    else
        log_error "Health check falhou"
        return 1
    fi
    
    # Teste de criação de usuário
    log "Testando criação de usuário..."
    USER_DATA='{"name":"Teste User","email":"teste@example.com","age":25}'
    RESPONSE=$(curl -s -X POST "$API_URL/users/" \
        -H "Content-Type: application/json" \
        -d "$USER_DATA")
    
    if echo "$RESPONSE" | grep -q "Teste User"; then
        log_success "Usuário criado com sucesso"
        USER_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | cut -d: -f2)
    else
        log_error "Falha ao criar usuário"
        echo "Resposta: $RESPONSE"
        return 1
    fi
    
    # Teste de listagem de usuários
    log "Testando listagem de usuários..."
    if curl -s "$API_URL/users/" | grep -q "Teste User"; then
        log_success "Listagem de usuários OK"
    else
        log_error "Falha na listagem de usuários"
        return 1
    fi
    
    # Teste de atualização de usuário
    if [ ! -z "$USER_ID" ]; then
        log "Testando atualização de usuário..."
        UPDATE_DATA='{"name":"Teste User Updated","age":26}'
        if curl -s -X PUT "$API_URL/users/$USER_ID" \
            -H "Content-Type: application/json" \
            -d "$UPDATE_DATA" | grep -q "Updated"; then
            log_success "Usuário atualizado com sucesso"
        else
            log_error "Falha ao atualizar usuário"
        fi
        
        # Teste de exclusão de usuário
        log "Testando exclusão de usuário..."
        if curl -s -X DELETE "$API_URL/users/$USER_ID" -w "%{http_code}" | grep -q "204"; then
            log_success "Usuário excluído com sucesso"
        else
            log_error "Falha ao excluir usuário"
        fi
    fi
}

# Função para teste de carga
load_test() {
    local duration=$1
    log "Iniciando teste de carga por $duration segundos..."
    
    local end_time=$(($(date +%s) + duration))
    local request_count=0
    local success_count=0
    local error_count=0
    
    while [ $(date +%s) -lt $end_time ]; do
        ((request_count++))
        
        # Teste de criação de usuário aleatório
        local random_id=$RANDOM
        local user_data="{\"name\":\"User$random_id\",\"email\":\"user$random_id@test.com\",\"age\":$((RANDOM % 80 + 18))}"
        
        if curl -s -X POST "$API_URL/users/" \
            -H "Content-Type: application/json" \
            -d "$user_data" > /dev/null 2>&1; then
            ((success_count++))
        else
            ((error_count++))
        fi
        
        # Teste de listagem
        if curl -s "$API_URL/users/" > /dev/null 2>&1; then
            ((success_count++))
        else
            ((error_count++))
        fi
        
        ((request_count++))
        
        # Log de progresso a cada 10 requisições
        if [ $((request_count % 20)) -eq 0 ]; then
            local remaining=$((end_time - $(date +%s)))
            log "Requisições: $request_count | Sucessos: $success_count | Erros: $error_count | Restam: ${remaining}s"
        fi
        
        sleep 0.1
    done
    
    log_success "Teste de carga finalizado!"
    log "Total de requisições: $request_count"
    log "Sucessos: $success_count"
    log "Erros: $error_count"
    
    if [ $error_count -gt 0 ]; then
        local error_rate=$((error_count * 100 / request_count))
        if [ $error_rate -gt 10 ]; then
            log_error "Taxa de erro muito alta: $error_rate%"
            return 1
        else
            log_warning "Taxa de erro: $error_rate%"
        fi
    fi
}

# Função para monitorar recursos
monitor_resources() {
    log "Monitorando uso de recursos dos containers..."
    
    # Verificar se docker compose está rodando
    if ! docker compose ps | grep -q "Up"; then
        log_error "Containers não estão rodando"
        return 1
    fi
    
    # Mostrar estatísticas dos containers
    echo ""
    log "Estatísticas dos containers:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
        $(docker compose ps -q) 2>/dev/null || log_warning "Não foi possível obter estatísticas dos containers"
    echo ""
}

# Função para cleanup
cleanup() {
    log "Executando limpeza..."
    
    # Limpar usuários de teste
    log "Removendo usuários de teste..."
    USERS=$(curl -s "$API_URL/users/" 2>/dev/null || echo "[]")
    if echo "$USERS" | grep -q "test\|Test\|User[0-9]"; then
        echo "$USERS" | grep -o '"id":[0-9]*' | cut -d: -f2 | while read -r user_id; do
            curl -s -X DELETE "$API_URL/users/$user_id" > /dev/null 2>&1 || true
        done
        log_success "Usuários de teste removidos"
    fi
}

# Função principal
main() {
    local test_duration=${1:-$DEFAULT_TEST_DURATION}
    
    echo ""
    log "🚀 Iniciando teste da aplicação de gerenciamento de usuários"
    log "Duração do teste: $test_duration segundos"
    echo ""
    
    # Verificar se os serviços estão rodando
    if ! check_service "$API_URL/health" "Backend API"; then
        log_error "Backend não está disponível"
        exit 1
    fi
    
    if ! check_service "$FRONTEND_URL" "Frontend"; then
        log_warning "Frontend não está disponível, mas continuando com testes da API"
    fi
    
    # Executar testes funcionais
    if ! test_api_endpoints; then
        log_error "Testes funcionais falharam"
        exit 1
    fi
    
    # Monitorar recursos
    monitor_resources
    
    # Executar teste de carga
    if ! load_test "$test_duration"; then
        log_error "Teste de carga falhou"
        cleanup
        exit 1
    fi
    
    # Cleanup
    cleanup
    
    # Monitorar recursos após teste
    monitor_resources
    
    echo ""
    log_success "🎉 Todos os testes foram executados com sucesso!"
    log "Para acessar a aplicação:"
    log "- Frontend: $FRONTEND_URL"
    log "- API: $API_URL"
    log "- Documentação da API: $API_URL/docs"
    echo ""
}

# Trap para cleanup em caso de interrupção
trap cleanup EXIT

# Executar se o script foi chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
