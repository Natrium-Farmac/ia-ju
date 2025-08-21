# Etapa 1: Construir a aplicação React
# Usamos uma imagem base do Node.js para instalar as dependências e construir o projeto.
FROM node:18-alpine AS builder

# Define o diretório de trabalho no contêiner.
WORKDIR /app

# Copia os arquivos de definição de pacotes.
COPY package*.json ./

# Instala todas as dependências do projeto.
RUN npm install

# Copia todos os arquivos do projeto para o contêiner.
COPY . .

# Constrói a aplicação React para produção, gerando a pasta 'dist'.
RUN npm run build

# Etapa 2: Servir a aplicação com Nginx
# Usamos uma imagem base do Nginx, que é leve e eficiente.
FROM nginx:alpine

# Remove a configuração padrão do Nginx.
RUN rm /etc/nginx/conf.d/default.conf

# Copia os arquivos de build (produção) da etapa anterior para o diretório de serviço do Nginx.
# A pasta 'dist' é o resultado do 'npm run build'.
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a nossa configuração personalizada do Nginx para a pasta de configuração.
# O arquivo nginx.conf deve estar no mesmo diretório do Dockerfile.
COPY nginx.conf /etc/nginx/conf.d/chatbot.conf

# Expõe a porta 80 do contêiner.
EXPOSE 80

# Comando para iniciar o Nginx de forma que ele não rode em background,
# o que é o ideal para contêineres Docker.
CMD ["nginx", "-g", "daemon off;"]

