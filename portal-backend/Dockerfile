# Dockerfile para Google Cloud Run - Portal Entregador (MuvLog) Backend
# Multi-stage: build menor = deploy mais rápido e barato

FROM python:3.11-slim

# Variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema (psycopg2 precisa de libs C)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar apenas o código da aplicação (ver .dockerignore)
COPY src/ ./src/
COPY main.py .
COPY generate_pdf.py* ./

# Porta que o Cloud Run espera (8080 por padrão)
EXPOSE 8080

# Iniciar com gunicorn (já está no requirements.txt)
CMD exec gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 120 --access-logfile - "src.main:app"
