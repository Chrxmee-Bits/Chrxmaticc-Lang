from pathlib import Path

ICON = Path(__file__).parent / "chrxmaticc.svg"

VALID = {
    ".chrxm", ".chrxg", ".chrxw", ".chrxi", ".chrxs",
    ".chrxmg", ".chrxmw", ".chrxmi", ".chrxms",
    ".chrxgw", ".chrxgi", ".chrxgs",
    ".chrxwi", ".chrxws",
    ".chrxsi",
    ".chrxmgw", ".chrxmgi", ".chrxmgs", ".chrxmwi", ".chrxmws",
    ".chrxgwi", ".chrxgws", ".chrxgsi",
    ".chrxwsi", ".chrxmsi",
    ".chrxmgwi", ".chrxmgws", ".chrxmgsi", ".chrxgwsi", ".chrxmwsi",
    ".chrxmaticc",
}

def detect(filepath):
    ext = Path(filepath).suffix.lower()
    if ext in VALID:
        return str(ICON) if ICON.exists() else None
    return None