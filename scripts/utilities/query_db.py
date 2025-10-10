# scripts/query_db.py
import json
import sys
from pathlib import Path

# Add project root to path to allow importing from src and utils
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlmodel import Session, create_engine, select
from src.unified_database import UnifiedJob


def get_recent_jobs(limit: int = 15):
    """Queries the unified database and returns recent jobs as a JSON string."""
    db_path = project_root / "data" / "jobs_unified.sqlite"
    if not db_path.exists():
        print(json.dumps([]))
        return

    engine = create_engine(f"sqlite:///{db_path}")
    
    with Session(engine) as session:
        statement = select(UnifiedJob).order_by(UnifiedJob.created_at.desc()).limit(limit)
        results = session.exec(statement).all()
        
        # Convert SQLModel objects to dictionaries for JSON serialization
        jobs_list = [
            {
                "Title": job.title,
                "Company": job.company,
                "Score": f"{job.score:.0%}", # Format as percentage
                "Url": job.url
            }
            for job in results
        ]
        print(json.dumps(jobs_list, indent=2))

if __name__ == "__main__":
    get_recent_jobs()
