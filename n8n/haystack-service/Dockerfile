FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements-minimal.txt .
RUN pip install --no-cache-dir -r requirements-minimal.txt

# Install Elasticsearch integration separately
RUN pip install --no-cache-dir "elasticsearch-haystack>=1.0.0" || echo "Elasticsearch integration will be handled differently"

# Download the model during build to avoid startup delays
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')"

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application (using the simplified version)
CMD ["uvicorn", "haystack_service_simple:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]