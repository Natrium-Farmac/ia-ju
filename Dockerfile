# Dockerfile
# Use uma imagem base Python oficial
FROM python:3.10-bookworm

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie o arquivo requirements.txt para o diretório de trabalho
COPY requirements.txt .

# Instale as dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copie o restante dos arquivos da sua aplicação para o contêiner
# Isso inclui main.py, e a pasta 'data'
COPY . .

# Exponha a porta em que o FastAPI rodará
EXPOSE 8000

# Comando para iniciar a aplicação quando o contêiner for executado
# Usamos Uvicorn diretamente
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]