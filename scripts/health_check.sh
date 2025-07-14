#!/bin/bash

# Script para testar health checks da aplicação
# Uso: ./scripts/health_check.sh [url]

set -e

# Configurações
API_URL="${1:-http://localhost:8000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_endpoint() {
    local endpoint="$1"
    local description="$2"
    local expected_status="$3"
    
    log "Testing $description ($endpoint)..."
    
    # Faz a requisição e captura resposta e código HTTP
    local response=$(curl -s -w "\n%{http_code}" "$endpoint" 2>/dev/null)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" != "200" ]; then
        log_error "$description failed with HTTP $http_code"
        return 1
    fi
    
    # Verifica se contém o status esperado
    if echo "$body" | grep -q "\"status\":\"$expected_status\""; then
        log_success "$description OK"
        
        # Extrai informações adicionais se disponível
        if command -v jq >/dev/null 2>&1; then
            local parsed=$(echo "$body" | jq . 2>/dev/null)
            if [ $? -eq 0 ]; then
                echo "$parsed" | jq -r '
                    if .response_time_ms then
                        "  └─ Response time: " + (.response_time_ms | tostring) + "ms"
                    else empty end,
                    if .services then
                        "  └─ Services: " + ([.services | to_entries[] | .key + "=" + .value.status] | join(", "))
                    else empty end,
                    if .timestamp then
                        "  └─ Timestamp: " + .timestamp
                    else empty end
                ' 2>/dev/null || true
            fi
        fi
        
        return 0
    else
        log_error "$description returned unexpected status"
        echo "Response: $body"
        return 1
    fi
}

# Banner
echo "============================================"
echo "  🏥 Health Check Test Suite"
echo "  API URL: $API_URL"
echo "  $(date)"
echo "============================================"
echo

# Testa readiness check (rápido)
check_endpoint "$API_URL/health/ready" "Readiness Check" "ready"
echo

# Testa health check detalhado
check_endpoint "$API_URL/health" "Detailed Health Check" "healthy"
echo

# Teste de performance - múltiplas requisições
log "Testing performance with multiple requests..."
start_time=$(date +%s.%N)
for i in {1..5}; do
    curl -s "$API_URL/health/ready" > /dev/null
done
end_time=$(date +%s.%N)
total_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "N/A")
if [ "$total_time" != "N/A" ]; then
    avg_time=$(echo "scale=2; $total_time / 5 * 1000" | bc -l 2>/dev/null || echo "N/A")
    log_success "Average response time: ${avg_time}ms (5 requests)"
else
    log_warning "Could not calculate response time (bc not available)"
fi

echo
log_success "All health check tests completed!"
