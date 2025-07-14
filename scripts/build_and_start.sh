#!/bin/bash

echo "Realizando build e iniciando a aplicação com Docker Compose..."
docker compose down
docker compose build
docker compose up -d

echo "Aguardando serviços subirem..."
sleep 10

echo "Verificando status dos serviços..."
docker compose ps

echo "Aplicação disponível em:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- Saúde da API: http://localhost:8000/health"

echo "Para verificar logs use: docker compose logs -f"
