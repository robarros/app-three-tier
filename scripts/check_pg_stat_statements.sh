#!/bin/bash

# Script para verificar se a extensão pg_stat_statements está instalada
# e funcionando corretamente

echo "Verificando a extensão pg_stat_statements no PostgreSQL..."

# Conectar ao banco e verificar a extensão
docker exec app_postgres psql -U appuser -d userdb -c "
SELECT 
    extname as extension_name,
    extversion as version,
    nspname as schema
FROM pg_extension 
JOIN pg_namespace ON pg_extension.extnamespace = pg_namespace.oid 
WHERE extname = 'pg_stat_statements';
"

echo ""
echo "Verificando se pg_stat_statements está coletando dados..."

# Verificar se há dados sendo coletados
docker exec app_postgres psql -U appuser -d userdb -c "
SELECT COUNT(*) as statements_count 
FROM pg_stat_statements;
"

echo ""
echo "Verificando configurações do shared_preload_libraries..."

# Verificar se shared_preload_libraries está configurado
docker exec app_postgres psql -U appuser -d userdb -c "
SHOW shared_preload_libraries;
"

echo ""
echo "Verificando configurações específicas do pg_stat_statements..."

# Verificar configurações específicas
docker exec app_postgres psql -U appuser -d userdb -c "
SELECT name, setting, unit, context
FROM pg_settings 
WHERE name LIKE 'pg_stat_statements%';
"
