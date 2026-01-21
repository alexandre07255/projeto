# Usa uma imagem leve do Python
FROM python:3.10-slim

# Define diretório de trabalho
WORKDIR /app

# Instala dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código fonte
COPY . .

# Comando para rodar a API na porta 3000 (requisito do PDF)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]