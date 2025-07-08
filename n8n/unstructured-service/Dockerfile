FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for better caching
COPY n8n/unstructured-service/requirements.txt .
RUN pip install -r requirements.txt


# Copy application code
COPY . .

COPY n8n/unstructured-service/unstructured_service.py .


# Run the application
CMD ["uvicorn", "unstructured_service:app", "--host", "0.0.0.0", "--port", "8880", "--reload"]