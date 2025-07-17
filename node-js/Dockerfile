FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o restante dos arquivos
COPY . .

# Expor a porta que o app vai usar
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "server.js"]
