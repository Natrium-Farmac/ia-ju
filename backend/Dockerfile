# Usa a imagem oficial do Python 3.10 como base
FROM python:3.10-slim

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia o arquivo de requisitos para o contêiner
COPY requirements.txt .

# Instala as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da aplicação
COPY . .

# Copia a pasta 'data' para o contêiner
COPY data ./data

# Expõe a porta 5000 para que o mundo exterior possa se comunicar com o contêiner
EXPOSE 5000

# Define o comando para executar a aplicação quando o contêiner iniciar
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
