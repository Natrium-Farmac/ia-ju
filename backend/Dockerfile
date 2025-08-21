# Usa uma imagem base do Python
FROM python:3.9-slim

# Define o diretório de trabalho no contêiner
WORKDIR /app

# Copia os arquivos de definição de pacotes
COPY requirements.txt ./

# Instala as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da aplicação
COPY . .

# Comando de inicialização. O 'uvicorn' servirá a aplicação.
# O 'command' no docker-compose.yml irá sobrescrever este,
# mas é bom ter uma opção de fallback aqui.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]