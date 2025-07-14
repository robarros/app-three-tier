#!/bin/bash

# URL of the API
API_URL="http://localhost:8000"

# Function to generate a random age between 18 and 80
random_age() {
    echo $((RANDOM % 62 + 18))
}

# Function to generate a random name
random_name() {
    local names=("João" "Maria" "Pedro" "Ana" "Carlos" "Sandra" "Lucas" "Julia" "Paulo" "Beatriz" 
                "Fernando" "Patricia" "Ricardo" "Camila" "Rafael" "Amanda" "Bruno" "Laura" "Diego" "Mariana")
    local surnames=("Silva" "Santos" "Oliveira" "Souza" "Rodrigues" "Ferreira" "Alves" "Pereira" "Lima" "Costa"
                   "Carvalho" "Gomes" "Martins" "Araujo" "Melo" "Barbosa" "Ribeiro" "Almeida" "Pinto" "Cardoso")
    
    local first_name=${names[$((RANDOM % ${#names[@]}))]}
    local last_name=${surnames[$((RANDOM % ${#surnames[@]}))]}
    echo "$first_name $last_name"
}

# Function to generate a random email based on name
random_email() {
    local name=$1
    local domains=("gmail.com" "hotmail.com" "yahoo.com" "outlook.com")
    local domain=${domains[$((RANDOM % ${#domains[@]}))]}
    
    # Convert name to lowercase and replace spaces with dots
    local email_name=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '.')
    echo "${email_name}@${domain}"
}

echo "Iniciando criação de 100 usuários..."
echo "Progresso: 0%"

for i in {1..100}
do
    name=$(random_name)
    email=$(random_email "$name")
    age=$(random_age)
    
    # Create JSON payload
    json_data="{\"name\":\"$name\",\"email\":\"$email\",\"age\":$age}"
    
    # Send POST request
    curl -s -X POST "$API_URL/users/" \
         -H "Content-Type: application/json" \
         -d "$json_data" > /dev/null
    
    # Calculate and show progress
    progress=$((i * 100 / 300))
    echo -ne "\rProgresso: $progress%"
done

echo -e "\nCriação de usuários concluída!"
