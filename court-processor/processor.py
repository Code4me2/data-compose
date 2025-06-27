"""
Main court opinion processor
Handles scraping, PDF processing, and database storage
"""
import os
import sys
import logging
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import re
from typing import List, Dict, Optional
import yaml
from dotenv import load_dotenv

from pdf_processor import PDFProcessor
# juriscraper imports will be done dynamically per court

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/data/logs/court-processor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CourtProcessor:
    """Main processor for court opinions"""
    
    def __init__(self):
        self.db_url = os.getenv('DATABASE_URL')
        self.pdf_processor = PDFProcessor()
        self.pdf_dir = Path('/data/pdfs')
        self.pdf_dir.mkdir(parents=True, exist_ok=True)
        
        # Load court configuration
        config_path = Path(__file__).parent / 'config' / 'courts.yaml'
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
    
    def get_db_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.db_url)
    
    def normalize_judge_name(self, judge_name: str) -> str:
        """Normalize judge name for consistent storage"""
        if not judge_name:
            return "Unknown"
        
        # Clean up the name
        judge_name = judge_name.strip()
        
        # Remove extra whitespace
        judge_name = re.sub(r'\s+', ' ', judge_name)
        
        # Standardize "Judge" prefix
        if not judge_name.lower().startswith('judge'):
            judge_name = f"Judge {judge_name}"
            
        return judge_name
    
    def get_or_create_judge(self, conn, judge_name: str, court: str) -> int:
        """Get or create judge in database"""
        normalized_name = self.normalize_judge_name(judge_name)
        
        with conn.cursor() as cur:
            # Use the database function
            cur.execute(
                "SELECT court_data.get_or_create_judge(%s, %s)",
                (normalized_name, court)
            )
            return cur.fetchone()[0]
    
    def download_pdf(self, url: str, court_code: str, docket_number: str) -> Optional[str]:
        """Download PDF and return local path"""
        try:
            # Create court-specific directory
            court_dir = self.pdf_dir / court_code
            court_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate filename
            safe_docket = re.sub(r'[^\w\-_]', '_', docket_number)
            filename = f"{safe_docket}_{datetime.now().strftime('%Y%m%d')}.pdf"
            filepath = court_dir / filename
            
            # Skip if already exists
            if filepath.exists():
                logger.info(f"PDF already exists: {filepath}")
                return str(filepath)
            
            # Download with timeout
            response = requests.get(url, timeout=60, stream=True)
            response.raise_for_status()
            
            # Verify it's a PDF
            content_type = response.headers.get('content-type', '')
            if 'pdf' not in content_type.lower():
                logger.warning(f"Non-PDF content type: {content_type}")
            
            # Save the file
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            logger.info(f"Downloaded PDF: {filepath}")
            return str(filepath)
            
        except Exception as e:
            logger.error(f"Error downloading PDF from {url}: {e}")
            return None
    
    def process_opinion(self, conn, opinion_data: Dict, court_code: str) -> bool:
        """Process a single opinion"""
        try:
            # Download PDF
            pdf_path = self.download_pdf(
                opinion_data['download_url'],
                court_code,
                opinion_data['docket_number']
            )
            
            if not pdf_path:
                logger.error(f"Failed to download PDF for {opinion_data['docket_number']}")
                return False
            
            # Extract text from PDF
            text, pdf_metadata = self.pdf_processor.process_pdf(pdf_path)
            
            if not text:
                logger.error(f"No text extracted from {pdf_path}")
                return False
            
            # Determine judge name - use metadata or extract from PDF
            judge_name = opinion_data.get('judge_name', '')
            if not judge_name or judge_name.lower() == 'unknown':
                # Try to extract from PDF text
                extracted_judge = self.pdf_processor.extract_judges_from_text(text, court_code)
                if extracted_judge:
                    judge_name = extracted_judge
                    logger.info(f"Extracted judge from PDF text: {judge_name}")
                else:
                    judge_name = 'Unknown'
            
            # Get or create judge
            judge_id = self.get_or_create_judge(
                conn,
                judge_name,
                court_code
            )
            
            # Create JSON-serializable version of opinion data
            opinion_metadata = {
                'case_name': opinion_data.get('case_name'),
                'case_date': str(opinion_data.get('case_date')) if opinion_data.get('case_date') else None,
                'docket_number': opinion_data.get('docket_number'),
                'judge_name': judge_name,  # Use the extracted/determined judge name
                'download_url': opinion_data.get('download_url'),
                'court_code': court_code
            }
            
            # Store in database
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO court_data.opinions (
                        judge_id, case_name, case_date, docket_number,
                        court_code, pdf_url, pdf_path, text_content,
                        metadata, pdf_metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (court_code, docket_number, case_date) 
                    DO UPDATE SET
                        text_content = EXCLUDED.text_content,
                        pdf_metadata = EXCLUDED.pdf_metadata,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                """, (
                    judge_id,
                    opinion_data.get('case_name'),
                    opinion_data.get('case_date'),
                    opinion_data.get('docket_number'),
                    court_code,
                    opinion_data.get('download_url'),
                    pdf_path,
                    text,
                    psycopg2.extras.Json(opinion_metadata),
                    psycopg2.extras.Json(pdf_metadata)
                ))
                
                opinion_id = cur.fetchone()[0]
                conn.commit()
                
                logger.info(f"Stored opinion {opinion_id}: {opinion_data['docket_number']}")
                return True
                
        except Exception as e:
            logger.error(f"Error processing opinion: {e}")
            conn.rollback()
            return False
    
    def scrape_court(self, court_code: str, days_back: int = 7) -> None:
        """Scrape opinions from a specific court"""
        logger.info(f"Starting scrape for court: {court_code}")
        
        conn = self.get_db_connection()
        
        # Start processing log
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO court_data.processing_log (court_code, run_date)
                VALUES (%s, %s)
                RETURNING id
            """, (court_code, datetime.now().date()))
            log_id = cur.fetchone()[0]
            conn.commit()
        
        opinions_found = 0
        opinions_processed = 0
        errors = []
        
        try:
            # Import the specific court scraper
            try:
                if court_code == 'tax':
                    from juriscraper.opinions.united_states.federal_special import tax
                    Site = tax.Site
                elif court_code == 'ca1':
                    from juriscraper.opinions.united_states.federal_appellate import ca1
                    Site = ca1.Site
                elif court_code == 'dc':
                    from juriscraper.opinions.united_states.federal_appellate import cadc
                    Site = cadc.Site
                elif court_code == 'ca9':
                    from juriscraper.opinions.united_states.federal_appellate import ca9_p
                    Site = ca9_p.Site
                elif court_code == 'cafc':
                    from juriscraper.opinions.united_states.federal_appellate import cafc
                    Site = cafc.Site
                elif court_code == 'uscfc':
                    from juriscraper.opinions.united_states.federal_special import uscfc
                    Site = uscfc.Site
                else:
                    logger.error(f"Unknown court code: {court_code}")
                    raise ValueError(f"Unknown court code: {court_code}")
                    
                # Initialize and run the scraper
                site = Site()
                site.parse()
                
            except ImportError as e:
                logger.error(f"Failed to import scraper for {court_code}: {e}")
                raise
            
            # Get recent opinions
            opinions_data = []
            for item in site:
                # Handle single items or lists
                download_urls = item.get('download_urls', [])
                case_dates = item.get('case_dates', [])
                judges = item.get('judges', [])
                docket_numbers = item.get('docket_numbers', [])
                case_names = item.get('case_names', [])
                
                # Ensure all are lists
                if not isinstance(download_urls, list):
                    download_urls = [download_urls] if download_urls else []
                if not isinstance(case_dates, list):
                    case_dates = [case_dates] if case_dates else []
                if not isinstance(judges, list):
                    judges = [judges] if judges else []
                if not isinstance(docket_numbers, list):
                    docket_numbers = [docket_numbers] if docket_numbers else []
                if not isinstance(case_names, list):
                    case_names = [case_names] if case_names else []
                
                # Process each opinion
                max_items = max(len(download_urls), len(case_dates), len(judges), 
                               len(docket_numbers), len(case_names))
                
                for i in range(max_items):
                    opinion_data = {
                        'download_url': download_urls[i] if i < len(download_urls) else '',
                        'case_date': case_dates[i] if i < len(case_dates) else None,
                        'judge_name': judges[i] if i < len(judges) else '',
                        'docket_number': docket_numbers[i] if i < len(docket_numbers) else '',
                        'case_name': case_names[i] if i < len(case_names) else '',
                    }
                    
                    # Skip if missing required fields
                    if opinion_data['download_url'] and opinion_data['case_date']:
                        opinions_data.append(opinion_data)
                        opinions_found += 1
                    else:
                        logger.warning(f"Skipping opinion with missing data: {opinion_data}")
                        
            # Process each opinion
            for opinion_data in opinions_data:
                
                # Process the opinion
                if self.process_opinion(conn, opinion_data, court_code):
                    opinions_processed += 1
                else:
                    errors.append(f"Failed to process: {opinion_data['docket_number']}")
            
            # Update processing log
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE court_data.processing_log
                    SET opinions_found = %s,
                        opinions_processed = %s,
                        errors_count = %s,
                        error_details = %s,
                        completed_at = CURRENT_TIMESTAMP,
                        status = %s
                    WHERE id = %s
                """, (
                    opinions_found,
                    opinions_processed,
                    len(errors),
                    psycopg2.extras.Json(errors) if errors else None,
                    'completed',
                    log_id
                ))
                conn.commit()
            
            logger.info(f"Completed scraping {court_code}: {opinions_processed}/{opinions_found} processed")
            
        except Exception as e:
            logger.error(f"Error scraping court {court_code}: {e}")
            
            # Update log with error
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE court_data.processing_log
                    SET status = 'error',
                        error_details = %s,
                        completed_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (psycopg2.extras.Json({'error': str(e)}), log_id))
                conn.commit()
        
        finally:
            conn.close()
    
    def run_all_courts(self):
        """Run scraping for all configured courts"""
        active_courts = [
            code for code, config in self.config.get('courts', {}).items()
            if config.get('active', True)
        ]
        
        logger.info(f"Processing {len(active_courts)} active courts")
        
        for court_code in active_courts:
            try:
                self.scrape_court(court_code)
            except Exception as e:
                logger.error(f"Failed to process court {court_code}: {e}")
                continue

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Court Opinion Processor')
    parser.add_argument('--court', type=str, help='Specific court to process')
    parser.add_argument('--all', action='store_true', help='Process all courts')
    parser.add_argument('--init-db', action='store_true', help='Initialize database schema')
    
    args = parser.parse_args()
    
    processor = CourtProcessor()
    
    if args.init_db:
        # Initialize database
        conn = processor.get_db_connection()
        with open('scripts/init_db.sql', 'r') as f:
            conn.cursor().execute(f.read())
        conn.commit()
        conn.close()
        logger.info("Database initialized")
        
    elif args.court:
        processor.scrape_court(args.court)
        
    elif args.all:
        processor.run_all_courts()
        
    else:
        parser.print_help()

if __name__ == '__main__':
    main()