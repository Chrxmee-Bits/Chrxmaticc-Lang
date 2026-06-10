"""
Chrxmaticc — Entry Point
Usage: python main.py <file.chrx*>
Detects format, dispatches to the right parser(s).
"""

import sys
import json
from pathlib import Path

# Add chrxmaticc to path
sys.path.insert(0, str(Path(__file__).parent / "chrxmaticc"))

from detector import detect, VALID

KEYWORDS_PATH = Path(__file__).parent / "chrxmaticc" / "shared" / "keywords.json"


def run_file(filepath):
    path = Path(filepath)

    if not path.exists():
        print(f"File not found: {filepath}")
        return

    ext = path.suffix.lower()

    if ext not in VALID:
        print(f"Not a Chrxmaticc file: {filepath}")
        print(f"Valid extensions: {', '.join(sorted(VALID))}")
        return

    # Show icon
    icon = detect(str(path))
    if icon:
        print(f"Icon: {icon}")

    # Determine formats
    fmt_str = ext.replace(".chrx", "")
    if fmt_str == "maticc":
        formats = ["m", "g", "w", "i", "s"]
    else:
        formats = list(fmt_str)

    print(f"File: {path.name}")
    print(f"Formats: {', '.join(formats)}")

    # Load keywords for fallback detection
    with open(KEYWORDS_PATH) as f:
        keywords = json.load(f)

    # Read source
    with open(path, "r", encoding="utf-8") as f:
        source = f.read()

    # Run parsers
    for fmt in formats:
        parser_path = Path(__file__).parent / "chrxmaticc" / "parsers" / f"chrx{fmt}" / "parser.py"

        if parser_path.exists():
            print(f"\n--- Running parser: chrx{fmt} ---")
            try:
                import importlib.util
                spec = importlib.util.spec_from_file_location(f"parser_{fmt}", parser_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                if hasattr(module, "run"):
                    module.run(source)
                elif hasattr(module, "parse"):
                    result = module.parse(source)
                    print(f"Parsed successfully: {type(result).__name__}")
                else:
                    print(f"Parser loaded, no run/parse function found.")
            except Exception as e:
                print(f"Parser error: {e}")
        else:
            print(f"\nParser not found: chrx{fmt} (expected at {parser_path})")


def main():
    if len(sys.argv) < 2:
        print("Chrxmaticc Language")
        print("Usage: python main.py <file.chrxm>")
        print("       python main.py <file.chrxmaticc>")
        print()
        print("Formats: .chrxm .chrxg .chrxw .chrxi .chrxs")
        print("Fusions: .chrxmg .chrxmw .chrxgs ... .chrxmaticc")
        print(f"Total extensions: {len(VALID)}")
        return

    run_file(sys.argv[1])


if __name__ == "__main__":
    main()
