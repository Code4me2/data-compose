#!/usr/bin/env python3
"""
Script to update existing opinions with judge names extracted from PDF text
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from pdf_processor import PDFProcessor
from processor import CourtProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_missing_judges():
    """Update opinions with 'Unknown' judges by extracting from PDF text"""
    
    db_url = os.getenv('DATABASE_URL')
    conn = psycopg2.connect(db_url)
    pdf_processor = PDFProcessor()
    court_processor = CourtProcessor()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Find all opinions with Unknown judges
            cur.execute("""
                SELECT o.id, o.pdf_path, o.court_code, o.docket_number, o.text_content, j.name as judge_name
                FROM court_data.opinions o
                JOIN court_data.judges j ON o.judge_id = j.id
                WHERE j.name = 'Unknown'
                AND o.pdf_path IS NOT NULL
            """)
            
            unknown_opinions = cur.fetchall()
            logger.info(f"Found {len(unknown_opinions)} opinions with unknown judges")
            
            updated_count = 0
            
            for opinion in unknown_opinions:
                try:
                    # Extract judge from text
                    text = opinion['text_content']
                    if not text and os.path.exists(opinion['pdf_path']):
                        # Re-extract text if needed
                        text, _ = pdf_processor.process_pdf(opinion['pdf_path'])
                    
                    if text:
                        extracted_judge = pdf_processor.extract_judges_from_text(text, opinion['court_code'])
                        
                        if extracted_judge and extracted_judge != 'Unknown':
                            logger.info(f"Opinion {opinion['docket_number']}: Found judge '{extracted_judge}'")
                            
                            # Get or create the judge
                            judge_id = court_processor.get_or_create_judge(conn, extracted_judge, opinion['court_code'])
                            
                            # Update the opinion
                            cur.execute("""
                                UPDATE court_data.opinions
                                SET judge_id = %s,
                                    metadata = jsonb_set(metadata, '{judge_name}', %s::jsonb),
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (judge_id, psycopg2.extras.Json(extracted_judge), opinion['id']))
                            
                            conn.commit()
                            updated_count += 1
                        else:
                            logger.debug(f"Opinion {opinion['docket_number']}: No judge found in text")
                            
                except Exception as e:
                    logger.error(f"Error processing opinion {opinion['id']}: {e}")
                    continue
            
            logger.info(f"Updated {updated_count} opinions with extracted judge names")
            
            # Show summary
            cur.execute("""
                SELECT j.name, COUNT(*) as count, o.court_code
                FROM court_data.opinions o
                JOIN court_data.judges j ON o.judge_id = j.id
                WHERE o.court_code IN ('ca9', 'cafc', 'uscfc', 'tax')
                GROUP BY j.name, o.court_code
                ORDER BY o.court_code, count DESC
            """)
            
            print("\nJudge summary by court:")
            for row in cur.fetchall():
                print(f"{row['court_code']:6} {row['name']:30} {row['count']:4} opinions")
                
    finally:
        conn.close()

if __name__ == "__main__":
    update_missing_judges()