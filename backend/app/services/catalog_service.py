from typing import List, Dict, Any, Optional
from backend.app.catalog.components import COMPONENTS_CATALOG
from backend.app.catalog.boards import BOARDS
from backend.app.database.db import (
    upsert_catalog_entry,
    get_all_catalog_entries,
    get_catalog_entry
)
from backend.app.models.project import ComponentCatalogEntry

class ComponentCatalogService:
    """
    Data-driven component and microcontroller board registry.
    Serves authentic verified electronic components with electrical characteristics,
    pinout constraints, datasheets, and simulator mapping.
    """

    @classmethod
    def initialize_catalog(cls):
        """Seeds the persistent SQLite catalog from verified manufacturer data."""
        for part_id, comp_data in COMPONENTS_CATALOG.items():
            upsert_catalog_entry(comp_data)

    @classmethod
    def list_components(cls, category: Optional[str] = None) -> List[Dict[str, Any]]:
        # Fetch from database; if empty, initialize first
        records = get_all_catalog_entries(category)
        if not records:
            cls.initialize_catalog()
            records = get_all_catalog_entries(category)
        return records

    @classmethod
    def get_component(cls, part_id: str) -> Optional[Dict[str, Any]]:
        record = get_catalog_entry(part_id)
        if not record:
            cls.initialize_catalog()
            record = get_catalog_entry(part_id)
        return record

    @classmethod
    def upsert_component(cls, entry: ComponentCatalogEntry) -> Dict[str, Any]:
        upsert_catalog_entry(entry.model_dump())
        return cls.get_component(entry.part_id) or entry.model_dump()

    @classmethod
    def list_boards(cls) -> Dict[str, Any]:
        return BOARDS

    @classmethod
    def get_board(cls, board_type: str) -> Optional[Dict[str, Any]]:
        return BOARDS.get(board_type)
