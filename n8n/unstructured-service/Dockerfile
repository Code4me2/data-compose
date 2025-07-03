FROM python:3.13-slim

WORKDIR /app

# Copy only requirements first for better caching
#COPY requirements.txt .
#RUN pip install --no-cache-dir -r requirements.txt


# Copy application code
#COPY . .


# Run the application
CMD ["uvicorn", "unstructured_service:app", "--host", "0.0.0.0", "--port", "8880", "--reload"]