"""
Chrxmaticc — Entry Point
Usage: python main.py <file.chrx*>
"""

import sys
import importlib.util
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "chrxmaticc"))

from detector import detect, VALID

PARSERS_DIR = Path(__file__).parent / "chrxmaticc" / "parsers"


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

    icon = detect(str(path))
    if icon:
        print(f"Icon: {icon}")

    fmt_str = ext.replace(".chrx", "")
    if fmt_str == "maticc":
        formats = ["m", "g", "w", "i", "s"]
    else:
        formats = list(fmt_str)

    print(f"File: {path.name}")
    print(f"Formats: {', '.join(formats)}")

    with open(path, "r", encoding="utf-8") as f:
        source = f.read()

    if source.startswith("~chrx"):
        source = source.split("\n", 1)[1] if "\n" in source else ""

    for fmt in formats:
        parser_dir = PARSERS_DIR / f"chrx{fmt}"

        if not parser_dir.exists():
            print(f"\nParser folder not found: chrx{fmt}")
            continue

        print(f"\n--- Running parser: chrx{fmt} ---")

        py_parser = parser_dir / "parser.py"
        if py_parser.exists():
            try:
                spec = importlib.util.spec_from_file_location(f"parser_{fmt}", py_parser)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                if hasattr(module, "run"):
                    result = module.run(source)
                    if result:
                        print(result)
                elif hasattr(module, "parse"):
                    result = module.parse(source)
                    print(f"Parsed: {type(result).__name__}")
                else:
                    print("No run/parse function found.")
            except Exception as e:
                print(f"Error: {e}")
            continue

        js_parser = parser_dir / "parser.js"
        if js_parser.exists():
            print(f"JS parser found (run with Node.js directly)")
            continue

        cpp_parser = parser_dir / "parser.cpp"
        if cpp_parser.exists():
            print(f"C++ parser found (compile and run separately)")
            continue

        print(f"No parser file found.")


def main():
    if len(sys.argv) < 2:
        print("Chrxmaticc Language")
        print("Usage: python main.py <file.chrx*>")
        print()
        print("Formats: .chrxm .chrxg .chrxw .chrxi .chrxs")
        print("Fusions: .chrxmg .chrxmw .chrxgs ... .chrxmaticc")
        print(f"Total extensions: {len(VALID)}")
        return

    run_file(sys.argv[1])


if __name__ == "__main__":
    main()