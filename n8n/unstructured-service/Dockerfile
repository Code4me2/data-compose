FROM python:3.13

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for better caching
COPY requirements.txt ./
RUN pip install -r requirements.txt

#RUN pip install fastapi uvicorn


# Copy application code
COPY . .


# Run the application
CMD ["uvicorn", "unstructured_service:app", "--host", "0.0.0.0", "--port", "8880", "--reload"]