import sys
import os
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent))

from .services.sukraa_soap import SukraaSOAPClient
from .database import SessionLocal
from . import models
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sync_consumables():
    client = SukraaSOAPClient()
    db = SessionLocal()
    
    # Common prefixes to search for to populate the initial list
    # The 'SearchInventoryItem' usually returns items based on prefix
    prefixes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", 
                "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
    
    total_added = 0
    total_updated = 0
    
    try:
        seen_ids = set()
        
        for prefix in prefixes:
            logger.info(f"Fetching items starting with '{prefix}'...")
            items = client.get_inventory_items(prefix, count=200)
            
            for item_data in items:
                item_id = item_data.get("id")
                if not item_id or item_id in seen_ids:
                    continue
                
                seen_ids.add(item_id)
                
                name = item_data.get("name")
                price_str = item_data.get("price", "0")
                try:
                    price = float(price_str.replace(',', ''))
                except:
                    price = 0.0
                
                # Check if exists
                db_item = db.query(models.Consumable).filter(models.Consumable.name == name).first()
                if db_item:
                    db_item.price = price
                    total_updated += 1
                else:
                    new_item = models.Consumable(
                        name=name,
                        price=price,
                        category="Inventory",
                        unit="pcs",
                        is_active=True
                    )
                    db.add(new_item)
                    total_added += 1
            
            db.commit()
            
        logger.info(f"Sync complete. Added: {total_added}, Updated: {total_updated}")
        
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    sync_consumables()
