FROM python:3.13-slim

WORKDIR /app

# Copy only requirements first for better caching
COPY requirements-minimal.txt .
RUN pip install --no-cache-dir -r requirements-minimal.txt


# Set environment variable for model cache
ENV SENTENCE_TRANSFORMERS_HOME=/app/models

# Copy application code
COPY . .


# Run the application
CMD ["uvicorn", "unstructured_service:app", "--host", "0.0.0.0", "--port", "8880", "--reload"]