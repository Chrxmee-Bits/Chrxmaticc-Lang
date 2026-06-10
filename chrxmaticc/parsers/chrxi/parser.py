"""
Chrxi Parser - The Pure Data Format
No syntax. No keywords. No structure enforcement.

Rules (or lack thereof):
    - key: value           (colon separates)
    - key -> value         (arrow separates)
    - key value            (space separates on single-line)
    - Indentation matters  (like YAML, but forgiving)
    - Lists use - or []    (either style)
    - Strings don't need quotes unless they contain special chars
    - Comments are --
    - Numbers are auto-detected
    - Booleans: true, false, yes, no, on, off
    - Null: null, none, nothing, empty
    - Multi-line strings with | or >
    - Multi-file references with @include

Upgrades over YAML:
    - No indentation police. 2 spaces, 4 spaces, tabs. It figures it out.
    - No ambiguous types. "no" is a boolean. "NO" is a string.
    - No anchors/aliases. Use @include for reuse instead.
    - Trailing commas allowed everywhere.
    - Duplicate keys are merged, not errors.
    - Keys can have spaces without quotes (mostly).
"""

import re
import json
from pathlib import Path
from typing import Any, Optional


# ============================================================
# LEXER - Tokenizes the chaos
# ============================================================

class Token:
    def __init__(self, type_: str, value: Any, line: int, col: int, indent: int = 0):
        self.type = type_
        self.value = value
        self.line = line
        self.col = col
        self.indent = indent

    def __repr__(self):
        return f"<{self.type}: {self.value!r} @ line {self.line}, indent {self.indent}>"


class ChrxiLexer:
    def __init__(self, source: str, filepath: str = ""):
        self.source = source
        self.filepath = filepath
        self.lines = source.split('\n')
        self.pos = 0
        self.tokens: list[Token] = []

    def tokenize(self) -> list[Token]:
        for line_num, line in enumerate(self.lines, 1):
            if not line.strip():
                self.tokens.append(Token('BLANK', None, line_num, 0, 0))
                continue

            indent = self._get_indent(line)
            stripped = line.strip()

            # Comment
            if stripped.startswith('--'):
                self.tokens.append(Token('COMMENT', stripped[2:].strip(), line_num, indent, indent))
                continue

            # Directive: @include
            if stripped.startswith('@include'):
                path = stripped[8:].strip().strip('"').strip("'")
                self.tokens.append(Token('INCLUDE', path, line_num, 0, indent))
                continue

            # Directive: @merge
            if stripped.startswith('@merge'):
                path = stripped[6:].strip().strip('"').strip("'")
                self.tokens.append(Token('MERGE', path, line_num, 0, indent))
                continue

            # List item
            if stripped.startswith('- '):
                value = self._parse_value(stripped[2:].strip())
                self.tokens.append(Token('LIST_ITEM', value, line_num, 2, indent))
                continue

            # Inline list: [a, b, c]
            if stripped.startswith('[') and stripped.endswith(']'):
                value = self._parse_inline_list(stripped[1:-1])
                self.tokens.append(Token('LIST', value, line_num, 0, indent))
                continue

            # Inline dict: {a: b, c: d}
            if stripped.startswith('{') and stripped.endswith('}'):
                value = self._parse_inline_dict(stripped[1:-1])
                self.tokens.append(Token('DICT', value, line_num, 0, indent))
                continue

            # Multi-line string continuation
            if stripped in ('|', '>', '|+', '>-', '|-'):
                self.tokens.append(Token('MULTILINE_MARKER', stripped, line_num, 0, indent))
                continue

            # Key-value pair
            key, separator, value_str = self._split_key_value(stripped)

            if key is not None:
                if value_str:
                    value = self._parse_value(value_str)
                else:
                    value = None  # Parent key with children
                self.tokens.append(Token('KEY_VALUE', (key, value, separator), line_num, 0, indent))
            else:
                # Just a value on its own (continuation, bare string, etc.)
                value = self._parse_value(stripped)
                self.tokens.append(Token('VALUE', value, line_num, 0, indent))

        return self.tokens

    def _get_indent(self, line: str) -> int:
        """Count leading whitespace. Tabs = 4 spaces."""
        count = 0
        for ch in line:
            if ch == ' ':
                count += 1
            elif ch == '\t':
                count += 4
            else:
                break
        return count

    def _split_key_value(self, text: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
        """Split 'key: value' or 'key -> value' or 'key value' intelligently."""
        # Arrow style
        if ' -> ' in text:
            idx = text.index(' -> ')
            return text[:idx].strip(), '->', text[idx + 4:].strip()

        # Colon style
        if ': ' in text:
            idx = text.index(': ')
            return text[:idx].strip(), ':', text[idx + 2:].strip()
        if ':' in text:
            idx = text.index(':')
            return text[:idx].strip(), ':', text[idx + 1:].strip()

        # Space style (only for simple single-line key value)
        parts = text.split(None, 1)
        if len(parts) == 2 and not any(ch in parts[0] for ch in '{}[]",:'):
            return parts[0], ' ', parts[1]

        return None, None, text

    def _parse_value(self, text: str) -> Any:
        """Auto-detect and convert value type."""
        if not text:
            return None

        text = text.strip().rstrip(',')

        # Quoted string
        if (text.startswith('"') and text.endswith('"')) or \
           (text.startswith("'") and text.endswith("'")):
            return text[1:-1]

        # Booleans (case-insensitive)
        lower = text.lower()
        if lower in ('true', 'yes', 'on'):
            return True
        if lower in ('false', 'no', 'off'):
            return False

        # Nulls
        if lower in ('null', 'none', 'nothing', 'empty', '~'):
            return None

        # Integer
        if re.match(r'^-?\d+$', text):
            return int(text)

        # Float
        if re.match(r'^-?\d+\.\d+$', text):
            return float(text)

        # Scientific notation
        if re.match(r'^-?\d+\.?\d*[eE][+-]?\d+$', text):
            return float(text)

        # Inline list (recursive)
        if text.startswith('[') and text.endswith(']'):
            return self._parse_inline_list(text[1:-1])

        # Inline dict (recursive)
        if text.startswith('{') and text.endswith('}'):
            return self._parse_inline_dict(text[1:-1])

        # Plain string
        return text

    def _parse_inline_list(self, text: str) -> list:
        """Parse comma-separated values inside brackets."""
        if not text.strip():
            return []
        parts = self._smart_split(text, ',')
        return [self._parse_value(p) for p in parts]

    def _parse_inline_dict(self, text: str) -> dict:
        """Parse comma-separated key:value pairs inside braces."""
        if not text.strip():
            return {}
        result = {}
        parts = self._smart_split(text, ',')
        for part in parts:
            key, _, value_str = self._split_key_value(part.strip())
            if key:
                result[key] = self._parse_value(value_str)
        return result

    def _smart_split(self, text: str, delimiter: str) -> list[str]:
        """Split by delimiter, respecting quotes and brackets."""
        parts = []
        current = []
        depth = 0
        in_quote = None

        for ch in text:
            if in_quote:
                current.append(ch)
                if ch == in_quote:
                    in_quote = None
            elif ch in ('"', "'"):
                in_quote = ch
                current.append(ch)
            elif ch in ('[', '{', '('):
                depth += 1
                current.append(ch)
            elif ch in (']', '}', ')'):
                depth -= 1
                current.append(ch)
            elif ch == delimiter and depth == 0:
                parts.append(''.join(current).strip())
                current = []
            else:
                current.append(ch)

        if current:
            parts.append(''.join(current).strip())

        return parts


# ============================================================
# PARSER - Builds structure from tokens
# ============================================================

class ChrxiParser:
    def __init__(self, tokens: list[Token], base_path: str = ""):
        self.tokens = tokens
        self.base_path = Path(base_path)
        self.pos = 0

    def parse(self) -> Any:
        """Parse into Python dict/list/primitive."""
        result = self._parse_block(0)

        # If the top level is a list of key-values, make it a dict
        if isinstance(result, list) and all(
            isinstance(item, tuple) and len(item) == 2 for item in result
        ):
            return dict(result)

        return result

    def _parse_block(self, current_indent: int) -> Any:
        """Parse a block of tokens at the given indent level."""
        items = []

        while self.pos < len(self.tokens):
            token = self.tokens[self.pos]

            # Skip blanks and comments
            if token.type in ('BLANK', 'COMMENT'):
                self.pos += 1
                continue

            # Stop if we're back to a lower indent (end of this block)
            if token.type != 'INCLUDE' and token.type != 'MERGE':
                if token.indent < current_indent:
                    break

            # Handle includes
            if token.type == 'INCLUDE':
                items.append(('@include', token.value))
                self.pos += 1
                continue

            if token.type == 'MERGE':
                items.append(('@merge', token.value))
                self.pos += 1
                continue

            # Key-value pair
            if token.type == 'KEY_VALUE':
                key, value, separator = token.value
                self.pos += 1

                # Check for children (next tokens at higher indent)
                if self.pos < len(self.tokens) and self.tokens[self.pos].indent > token.indent:
                    children = self._parse_block(self.tokens[self.pos].indent)
                    if value is not None:
                        # Key has both a value and children - merge them
                        child_dict = dict(children) if isinstance(children, list) else children
                        child_dict['_value'] = value
                        items.append((key, child_dict))
                    else:
                        child_dict = dict(children) if isinstance(children, list) else children
                        items.append((key, child_dict))
                else:
                    items.append((key, value))
                continue

            # List item
            if token.type == 'LIST_ITEM':
                value = token.value
                self.pos += 1

                # Check for children
                if self.pos < len(self.tokens) and self.tokens[self.pos].indent > token.indent:
                    children = self._parse_block(self.tokens[self.pos].indent)
                    child_dict = dict(children) if isinstance(children, list) else children
                    child_dict['_value'] = value
                    items.append(child_dict)
                else:
                    items.append(value)
                continue

            # Standalone list or dict
            if token.type in ('LIST', 'DICT'):
                items.append(token.value)
                self.pos += 1
                continue

            # Standalone value
            if token.type == 'VALUE':
                items.append(token.value)
                self.pos += 1
                continue

            # Multiline marker
            if token.type == 'MULTILINE_MARKER':
                self.pos += 1
                lines = []
                while self.pos < len(self.tokens) and self.tokens[self.pos].indent > token.indent:
                    if self.tokens[self.pos].type in ('VALUE', 'KEY_VALUE'):
                        val = self.tokens[self.pos].value
                        if isinstance(val, tuple):
                            lines.append(str(val[0]))
                        else:
                            lines.append(str(val))
                    self.pos += 1
                marker = token.value
                if '>' in marker:
                    items.append(' '.join(lines))
                else:
                    items.append('\n'.join(lines))
                continue

            # Unknown, skip
            self.pos += 1

        # Determine if items should be list or dict
        if not items:
            return {}

        # If all items are key-value tuples, it's a dict
        if all(isinstance(item, tuple) and len(item) == 2 for item in items):
            return items

        # If any item is a key-value tuple, it's a dict with some list values
        result = {}
        list_items = []
        for item in items:
            if isinstance(item, tuple) and len(item) == 2:
                key, value = item
                if key == '@include':
                    included = self._resolve_include(value)
                    result = {**result, **included} if isinstance(included, dict) else result
                elif key == '@merge':
                    merged = self._resolve_include(value)
                    if isinstance(merged, dict):
                        result = self._deep_merge(result, merged)
                else:
                    result[key] = value
            else:
                list_items.append(item)

        if list_items:
            if result:
                result['_items'] = list_items
            else:
                return list_items

        return result

    def _resolve_include(self, path: str) -> Any:
        """Load and parse an included file."""
        full_path = self.base_path / path if self.base_path else Path(path)

        if not full_path.exists():
            print(f"[Chrxi] Warning: Included file not found: {full_path}")
            return {}

        with open(full_path, 'r', encoding='utf-8') as f:
            source = f.read()

        lexer = ChrxiLexer(source, str(full_path))
        tokens = lexer.tokenize()
        parser = ChrxiParser(tokens, str(full_path.parent))
        return parser.parse()

    def _deep_merge(self, base: dict, overlay: dict) -> dict:
        """Recursively merge two dicts. Overlay wins on conflict."""
        result = base.copy()
        for key, value in overlay.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result


# ============================================================
# SERIALIZER - Chrxi back to string
# ============================================================

class ChrxiSerializer:
    @staticmethod
    def dumps(data: Any, indent: int = 0, indent_size: int = 4) -> str:
        """Convert Python data back to Chrxi format."""
        return ChrxiSerializer._serialize(data, indent, indent_size)

    @staticmethod
    def _serialize(data: Any, indent: int, indent_size: int) -> str:
        prefix = ' ' * indent
        next_prefix = ' ' * (indent + indent_size)

        if data is None:
            return 'null'

        if isinstance(data, bool):
            return 'true' if data else 'false'

        if isinstance(data, (int, float)):
            return str(data)

        if isinstance(data, str):
            # Check if quoting is needed
            if ChrxiSerializer._needs_quotes(data):
                return f'"{data}"'
            return data

        if isinstance(data, dict):
            if not data:
                return '{}'
            lines = []
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    lines.append(f'{next_prefix}{key}:')
                    lines.append(ChrxiSerializer._serialize(value, indent + indent_size, indent_size))
                else:
                    serialized = ChrxiSerializer._serialize(value, 0, indent_size)
                    lines.append(f'{next_prefix}{key}: {serialized}')
            return '\n'.join(lines)

        if isinstance(data, list):
            if not data:
                return '[]'
            # Check if it's a simple list
            if all(not isinstance(item, (dict, list)) for item in data):
                items = ', '.join(ChrxiSerializer._serialize(item, 0, indent_size) for item in data)
                if len(items) < 60:
                    return f'[{items}]'
            # Complex list
            lines = []
            for item in data:
                serialized = ChrxiSerializer._serialize(item, 0, indent_size)
                if isinstance(item, (dict, list)):
                    lines.append(f'{next_prefix}-')
                    lines.append(ChrxiSerializer._serialize(item, indent + indent_size + 2, indent_size))
                else:
                    lines.append(f'{next_prefix}- {serialized}')
            return '\n'.join(lines)

        return str(data)

    @staticmethod
    def _needs_quotes(text: str) -> bool:
        """Check if a string needs quotes."""
        special_chars = set('{}[]#&*!|>\'\"%@`-,:; ')
        if any(ch in text for ch in special_chars):
            return True
        lower = text.lower()
        reserved = {'true', 'false', 'yes', 'no', 'on', 'off', 'null', 'none', 'nothing', 'empty', '~'}
        if lower in reserved:
            return True
        if re.match(r'^-?\d+\.?\d*$', text):
            return True
        return False


# ============================================================
# PUBLIC API
# ============================================================

def load(path: str) -> Any:
    """Load and parse a .chrxi file. Returns Python dict/list/primitive."""
    filepath = Path(path)

    with open(filepath, 'r', encoding='utf-8') as f:
        source = f.read()

    lexer = ChrxiLexer(source, str(filepath))
    tokens = lexer.tokenize()
    parser = ChrxiParser(tokens, str(filepath.parent))
    return parser.parse()


def loads(source: str, base_path: str = "") -> Any:
    """Parse a Chrxi string. Returns Python dict/list/primitive."""
    lexer = ChrxiLexer(source, base_path)
    tokens = lexer.tokenize()
    parser = ChrxiParser(tokens, base_path)
    return parser.parse()


def dump(data: Any, path: str):
    """Serialize Python data to a .chrxi file."""
    serialized = ChrxiSerializer.dumps(data)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(serialized)
        f.write('\n')


def dumps(data: Any) -> str:
    """Serialize Python data to a Chrxi string."""
    return ChrxiSerializer.dumps(data)


def to_json(data: Any) -> str:
    """Convert loaded Chrxi data to JSON string."""
    return json.dumps(data, indent=2, ensure_ascii=False)


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Chrxi - The Pure Data Format")
        print("Usage: python parser.py <file.chrxi> [--json]")
        print("       python parser.py --parse '<chrxi string>'")
        sys.exit(0)

    if sys.argv[1] == '--parse':
        source = sys.argv[2]
        result = loads(source)
        print(dumps(result))
    else:
        path = sys.argv[1]
        result = load(path)

        if '--json' in sys.argv:
            print(to_json(result))
        else:
            print(dumps(result))
