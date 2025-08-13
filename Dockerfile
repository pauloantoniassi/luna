# Usamos uma única imagem base para todo o processo
FROM node:20-slim

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de definição de dependências
COPY package*.json ./

# Instala TODAS as dependências (dev e produção)
RUN npm install

# Copia todo o resto do código-fonte e arquivos de mídia
COPY . .

# Compila o TypeScript para JavaScript, criando a pasta /dist em Produção
RUN npm run build

# Define o comando para iniciar a aplicação
CMD [ "node", "dist/index.js" ]
