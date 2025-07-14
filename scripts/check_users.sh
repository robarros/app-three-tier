#!/bin/bash

# URL of the API
API_URL="http://localhost:8000"

echo "Verificando usuários restantes..."

# Get all users with a high limit to ensure we get all of them
response=$(curl -s "$API_URL/users/?skip=0&limit=1000")
remaining=$(echo "$response" | grep -o '"id":[0-9]*' | wc -l)

echo "Usuários ainda no sistema: $remaining"

