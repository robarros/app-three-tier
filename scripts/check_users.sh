#!/bin/bash

# URL of the API
API_URL="http://localhost:8000"

echo "Verificando usuários restantes..."

# Get all users
response=$(curl -s "$API_URL/users/")
remaining=$(echo "$response" | grep -o '"id":[0-9]*' | wc -l)

echo "Usuários ainda no sistema: $remaining"
