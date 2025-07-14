#!/bin/bash

# URL of the API
API_URL="http://localhost:8000"

echo "Buscando todos os usuários..."

# Get all users with proper error handling and debug output
response=$(curl -v "$API_URL/users/" 2>&1)
if [ $? -ne 0 ]; then
    echo "Erro ao conectar com a API"
    exit 1
fi

# Print the full response for debugging
echo "Resposta da API:"
echo "$response"

# Save response to a temporary file for processing
echo "$response" > temp_users.json

# Extract user IDs using proper JSON parsing
user_ids=$(cat temp_users.json | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

# Count total users
total_users=$(echo "$user_ids" | wc -w)

if [ $total_users -eq 0 ]; then
    echo "Nenhum usuário encontrado"
    rm temp_users.json
    exit 0
fi

echo "Iniciando exclusão de $total_users usuários..."
echo "Progresso: 0%"

count=0
failed=0

# Loop through each user ID and delete
for id in $user_ids
do
    # Send DELETE request with error checking
    delete_response=$(curl -s -w "%{http_code}" -X DELETE "$API_URL/users/$id")
    status_code=${delete_response: -3}
    
    if [ "$status_code" = "204" ] || [ "$status_code" = "200" ]; then
        count=$((count + 1))
    else
        failed=$((failed + 1))
        echo -e "\nErro ao deletar usuário $id (Status: $status_code)"
    fi
    
    # Update progress
    progress=$((count * 100 / total_users))
    echo -ne "\rProgresso: $progress% (Deletados: $count, Falhas: $failed)"
done

# Clean up
rm temp_users.json

echo -e "\nProcesso concluído!"
echo "Total de usuários processados: $total_users"
echo "Deletados com sucesso: $count"
echo "Falhas: $failed"
