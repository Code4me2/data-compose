FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # For PDF processing
    poppler-utils \
    # For OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    # For database connection
    libpq-dev \
    gcc \
    # For cron
    cron \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for data
RUN mkdir -p /data/pdfs /data/logs

# Copy cron job file
COPY scripts/court-schedule /etc/cron.d/court-schedule
RUN chmod 0644 /etc/cron.d/court-schedule && \
    crontab /etc/cron.d/court-schedule

# Add Python3 symlink for compatibility
RUN ln -s /usr/bin/python3 /usr/bin/python || true

# Entrypoint script is copied with application code
ENTRYPOINT ["/app/entrypoint.sh"]