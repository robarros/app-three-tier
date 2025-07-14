#!/bin/bash

# URL of the API
API_URL="http://localhost:8000"

echo "Iniciando processo de deleção..."

while true; do
    echo "Buscando usuários..."
    
    # Get first page of users
    users_response=$(curl -s "$API_URL/users/")
    
    # Extract IDs
    ids=$(echo "$users_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    
    # Count users
    total=$(echo "$ids" | wc -w)
    

    if [ $total -eq 0 ]; then
        echo "Nenhum usuário encontrado. Processo concluído!"
        exit 0
    fi
    
    echo "Encontrados $total usuários para deletar."
    
    for id in $ids; do
        echo -n "Deletando usuário $id... "
        
        # DELETE request with proper status code checking
        response=$(curl -i -s -X DELETE "$API_URL/users/$id")
        status_code=$(echo "$response" | grep -E "^HTTP/[0-9.]+ [0-9]+" | cut -d' ' -f2)
        
        if [ "$status_code" = "204" ] || [ "$status_code" = "200" ]; then
            echo "OK"
        else
            echo "FALHOU (Status: $status_code)"
            echo "Resposta completa:"
            echo "$response"
        fi
        
        # Small delay to avoid overwhelming the server
        sleep 0.1
    done
    
    # Check if we still have users
    echo "Verificando usuários restantes..."
    remaining=$(curl -s "$API_URL/users/" | grep -o '"id":[0-9]*' | wc -l)
    
    if [ "$remaining" -eq 0 ]; then
        echo "Todos os usuários foram deletados com sucesso!"
        break
    else
        echo "Ainda restam $remaining usuários. Continuando..."
        echo "-----------------------------------"
    fi
done

# Final verification
echo "Fazendo verificação final..."
remaining=$(curl -s "$API_URL/users/" | grep -o '"id":[0-9]*' | wc -l)
echo "Verificação final: $remaining usuários no sistema."
