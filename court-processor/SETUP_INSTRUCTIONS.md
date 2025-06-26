# Court Processor Setup Instructions for Data-Compose

## Prerequisites

- Data-compose is running with PostgreSQL
- Docker and Docker Compose installed
- Basic familiarity with Docker commands

## Step 1: Prepare the Integration

### 1.1 Copy Court Processor to Data-Compose

```bash
# Navigate to your data-compose directory
cd /path/to/data-compose

# Copy the court-processor directory
cp -r /path/to/court-processor .

# Create data directories
mkdir -p court-data/pdfs court-data/logs
chmod -R 755 court-data
```

### 1.2 Update Docker Compose

Add the court processor service to your `docker-compose.yml`:

```yaml
  # Add this service to your existing docker-compose.yml
  court-processor:
    build:
      context: ./court-processor
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      PYTHONPATH: /app
    volumes:
      - ./court-data/pdfs:/data/pdfs
      - ./court-data/logs:/data/logs
      - ./court-processor:/app
    depends_on:
      - db
    networks:
      - backend
    restart: unless-stopped
```

## Step 2: Initialize the Database

### 2.1 Build and Start Services

```bash
# Build the court processor image
docker-compose build court-processor

# Start all services
docker-compose up -d

# Verify court processor is running
docker-compose ps court-processor
```

### 2.2 Create Database Schema

```bash
# Option 1: Initialize through the processor
docker-compose exec court-processor python processor.py --init-db

# Option 2: Run SQL directly
docker-compose exec db psql -U postgres -d postgres < court-processor/scripts/init_db.sql
```

### 2.3 Verify Schema Creation

```bash
# Check if schema was created
docker-compose exec db psql -U postgres -d postgres -c "\dn court_data"

# List tables in court_data schema
docker-compose exec db psql -U postgres -d postgres -c "\dt court_data.*"
```

## Step 3: Test the Processor

### 3.1 Run Test Script

```bash
# Execute the test script
docker-compose exec court-processor python scripts/test_processor.py
```

Expected output:
- Court configuration loaded
- Database connection successful
- Schema and tables exist

### 3.2 Manual Test Scrape

```bash
# Test with Tax Court (small number of opinions)
docker-compose exec court-processor python processor.py --court tax

# Check logs
docker-compose exec court-processor tail -f /data/logs/court-processor.log
```

### 3.3 Verify Data Storage

```bash
# Check if judges were created
docker-compose exec db psql -U postgres -d postgres -c "SELECT * FROM court_data.judges;"

# Check if opinions were stored
docker-compose exec db psql -U postgres -d postgres -c "SELECT id, case_name, case_date, judge_id FROM court_data.opinions LIMIT 5;"

# Check processing log
docker-compose exec db psql -U postgres -d postgres -c "SELECT * FROM court_data.processing_log ORDER BY started_at DESC LIMIT 5;"
```

## Step 4: Enable Scheduled Updates

### 4.1 Verify Cron Schedule

```bash
# Check if cron is running in container
docker-compose exec court-processor service cron status

# View cron schedule
docker-compose exec court-processor crontab -l
```

### 4.2 Monitor Scheduled Runs

```bash
# Watch cron logs
docker-compose exec court-processor tail -f /data/logs/cron.log

# Check processing history
docker-compose exec db psql -U postgres -d postgres -c "
SELECT court_code, run_date, opinions_processed, status 
FROM court_data.processing_log 
ORDER BY started_at DESC 
LIMIT 10;"
```

## Step 5: Query Data for RAG

### 5.1 Query by Judge

```sql
-- Get all opinions by a specific judge
SELECT 
    j.name as judge_name,
    o.case_name,
    o.case_date,
    o.docket_number,
    LEFT(o.text_content, 200) as text_preview
FROM court_data.opinions o
JOIN court_data.judges j ON o.judge_id = j.id
WHERE j.name = 'Judge Smith'
ORDER BY o.case_date DESC
LIMIT 10;
```

### 5.2 Query Recent Opinions

```sql
-- Get recent opinions for RAG processing
SELECT 
    o.id,
    j.name as judge_name,
    o.case_name,
    o.case_date,
    o.text_content
FROM court_data.opinions o
JOIN court_data.judges j ON o.judge_id = j.id
WHERE o.vector_indexed = false
ORDER BY o.case_date DESC
LIMIT 100;
```

### 5.3 Full-Text Search

```sql
-- Search opinions by keyword
SELECT 
    j.name as judge_name,
    o.case_name,
    o.case_date,
    ts_headline('english', o.text_content, query) as excerpt
FROM court_data.opinions o
JOIN court_data.judges j ON o.judge_id = j.id,
plainto_tsquery('english', 'tax deduction') query
WHERE to_tsvector('english', o.text_content) @@ query
ORDER BY o.case_date DESC
LIMIT 20;
```

## Step 6: Integration with n8n Workflows

### 6.1 Create Opinion Processing Workflow

1. Open n8n interface: http://localhost:5678
2. Create new workflow
3. Add PostgreSQL node to query unprocessed opinions
4. Add Hierarchical Summarization node
5. Add update node to mark as processed

### 6.2 Sample n8n Query

```sql
-- For n8n PostgreSQL node
SELECT 
    o.id,
    o.text_content,
    json_build_object(
        'judge', j.name,
        'case_name', o.case_name,
        'case_date', o.case_date,
        'docket', o.docket_number
    ) as metadata
FROM court_data.opinions o
JOIN court_data.judges j ON o.judge_id = j.id
WHERE o.vector_indexed = false
LIMIT 10;
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs court-processor

# Rebuild if needed
docker-compose build --no-cache court-processor
```

### Database Connection Failed

```bash
# Verify environment variables
docker-compose exec court-processor env | grep DATABASE_URL

# Test connection manually
docker-compose exec court-processor python -c "
import os
import psycopg2
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
print('Connected successfully')
conn.close()
"
```

### No Opinions Downloaded

1. Check court website accessibility
2. Verify court code in configuration
3. Check logs for specific errors
4. Try running with a different court

### OCR Not Working

```bash
# Verify Tesseract installation
docker-compose exec court-processor tesseract --version

# Test OCR directly
docker-compose exec court-processor python -c "
import pytesseract
print(pytesseract.get_tesseract_version())
"
```

## Next Steps

1. **Configure Courts**: Edit `court-processor/config/courts.yaml` to enable/disable specific courts
2. **Adjust Schedule**: Modify `court-processor/scripts/court-schedule` for different timing
3. **Create RAG Pipeline**: Build n8n workflows to process opinions through your RAG system
4. **Monitor Performance**: Set up alerts for failed scrapes or processing errors
5. **Scale Processing**: Add more courts or increase processing frequency as needed

## Security Notes

- Court processor runs in isolated container
- No external API exposure
- Database credentials via environment variables
- PDF downloads to restricted directory
- All text is sanitized before storage