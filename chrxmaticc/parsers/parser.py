"""
ChrxMedium Parser & Interpreter
Handles: fn, if/then/else/end, loop/while/forever/times, let, return,
         match/when, break, continue, pipe (|>), ranges, arrow functions,
         string interpolation, null safety (?), default parameters
"""

from enum import Enum, auto
from dataclasses import dataclass
from typing import Optional, Any
import sys
import math
import random
import time


# ============================================================
# TOKENS
# ============================================================

class T(Enum):
    """Token types. T instead of TokenType for brevity."""
    # Keywords
    FN = auto(); IF = auto(); THEN = auto(); ELSE = auto(); END = auto()
    LOOP = auto(); WHILE = auto(); FOREVER = auto(); TIMES = auto()
    LET = auto(); RETURN = auto(); MATCH = auto(); WHEN = auto()
    BREAK = auto(); CONTINUE = auto()
    AND = auto(); OR = auto(); NOT = auto()
    TRUE = auto(); FALSE = auto(); NULL = auto()

    # Literals
    IDENT = auto(); NUM = auto(); STR = auto()

    # Operators
    PLUS = auto(); MINUS = auto(); STAR = auto(); SLASH = auto()
    MOD = auto()
    EQ = auto(); EQ_EQ = auto(); NOT_EQ = auto()
    LT = auto(); LT_EQ = auto(); GT = auto(); GT_EQ = auto()
    PIPE = auto(); ARROW = auto(); FAT_ARROW = auto()

    # Delimiters
    LPAREN = auto(); RPAREN = auto()
    LBRACK = auto(); RBRACK = auto()
    LBRACE = auto(); RBRACE = auto()
    COMMA = auto(); DOT = auto(); COLON = auto()
    DOT_DOT = auto()   # Range: ..
    QUESTION = auto()  # Null safety
    DOLLAR = auto()    # Interpolation

    NEWLINE = auto()
    EOF = auto()


KEYWORDS = {
    "fn": T.FN, "if": T.IF, "then": T.THEN, "else": T.ELSE, "end": T.END,
    "loop": T.LOOP, "while": T.WHILE, "forever": T.FOREVER, "times": T.TIMES,
    "let": T.LET, "return": T.RETURN, "match": T.MATCH, "when": T.WHEN,
    "break": T.BREAK, "continue": T.CONTINUE,
    "and": T.AND, "or": T.OR, "not": T.NOT,
    "true": T.TRUE, "false": T.FALSE, "null": T.NULL,
}


@dataclass
class Token:
    type: T
    lexeme: str
    line: int
    col: int
    literal: Any = None

    def __repr__(self):
        lit = f" [{self.literal}]" if self.literal is not None else ""
        return f"<{self.type.name} '{self.lexeme}'{lit}>"


# ============================================================
# LEXER
# ============================================================

class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.tokens: list[Token] = []
        self.start = 0
        self.pos = 0
        self.line = 1
        self.col = 1

    def tokenize(self) -> list[Token]:
        while self.pos < len(self.source):
            self.start = self.pos
            self._scan()
        self.tokens.append(Token(T.EOF, "", self.line, self.col))
        return self.tokens

    def _advance(self) -> str:
        c = self.source[self.pos]
        self.pos += 1
        self.col += 1
        return c

    def _peek(self, offset: int = 0) -> str:
        idx = self.pos + offset
        return self.source[idx] if idx < len(self.source) else '\0'

    def _match(self, expected: str) -> bool:
        if self._peek() != expected:
            return False
        self.pos += 1
        self.col += 1
        return True

    def _add(self, type_: T, literal: Any = None):
        lexeme = self.source[self.start:self.pos]
        self.tokens.append(Token(type_, lexeme, self.line, self.col, literal))

    def _scan(self):
        c = self._advance()

        # Single characters
        single_chars = {
            '(': T.LPAREN, ')': T.RPAREN, '[': T.LBRACK, ']': T.RBRACK,
            '{': T.LBRACE, '}': T.RBRACE, ',': T.COMMA, ':': T.COLON,
            '+': T.PLUS, '*': T.STAR, '/': T.SLASH, '%': T.MOD,
            '?': T.QUESTION, '$': T.DOLLAR,
        }
        if c in single_chars:
            return self._add(single_chars[c])

        # Multi-character operators
        if c == '-':
            if self._match('>'):
                return self._add(T.ARROW)
            if self._match('-'):
                while self._peek() not in ('\n', '\0'):
                    self._advance()
                return
            return self._add(T.MINUS)

        if c == '=':
            if self._match('>'):
                return self._add(T.FAT_ARROW)
            return self._add(T.EQ_EQ if self._match('=') else T.EQ)

        if c == '!':
            return self._add(T.NOT_EQ if self._match('=') else T.NOT)

        if c == '<':
            return self._add(T.LT_EQ if self._match('=') else T.LT)

        if c == '>':
            return self._add(T.GT_EQ if self._match('=') else T.GT)

        if c == '|':
            return self._add(T.PIPE if self._match('>') else None)

        if c == '.':
            if self._match('.'):
                return self._add(T.DOT_DOT)
            return self._add(T.DOT)

        # Whitespace
        if c in (' ', '\r', '\t'):
            return

        if c == '\n':
            self._add(T.NEWLINE)
            self.line += 1
            self.col = 1
            return

        # Strings
        if c == '"':
            return self._string()

        # Numbers
        if c.isdigit():
            return self._number()

        # Identifiers
        if c.isalpha() or c == '_':
            return self._identifier()

    def _string(self):
        parts = []
        while self._peek() not in ('"', '\0'):
            if self._peek() == '\n':
                self.line += 1
                self.col = 1
            elif self._peek() == '\\':
                self._advance()
                escapes = {'n': '\n', 't': '\t', '"': '"', '\\': '\\'}
                parts.append(escapes.get(self._advance(), '\\'))
                continue
            parts.append(self._advance())

        if self._peek() == '"':
            self._advance()
        self._add(T.STR, ''.join(parts))

    def _number(self):
        while self._peek().isdigit():
            self._advance()
        if self._peek() == '.' and self._peek(1).isdigit():
            self._advance()
            while self._peek().isdigit():
                self._advance()
        self._add(T.NUM, float(self.source[self.start:self.pos]))

    def _identifier(self):
        while self._peek().isalnum() or self._peek() == '_':
            self._advance()
        text = self.source[self.start:self.pos]
        type_ = KEYWORDS.get(text, T.IDENT)
        literal = None
        if type_ == T.TRUE:
            literal = True
        elif type_ == T.FALSE:
            literal = False
        elif type_ == T.NULL:
            literal = None
        self._add(type_, literal)


# ============================================================
# AST NODES
# ============================================================

class AST:
    pass

class Program(AST):
    def __init__(self, stmts): self.stmts = stmts

class NumLit(AST):
    def __init__(self, v): self.v = v

class StrLit(AST):
    def __init__(self, v): self.v = v

class BoolLit(AST):
    def __init__(self, v): self.v = v

class NullLit(AST):
    pass

class Var(AST):
    def __init__(self, name): self.name = name

class VarDecl(AST):
    def __init__(self, name, value, mutable=True): self.name = name; self.value = value; self.mutable = mutable

class Assign(AST):
    def __init__(self, target, value): self.target = target; self.value = value

class Binary(AST):
    def __init__(self, left, op, right): self.left = left; self.op = op; self.right = right

class Unary(AST):
    def __init__(self, op, operand): self.op = op; self.operand = operand

class Call(AST):
    def __init__(self, callee, args): self.callee = callee; self.args = args

class FnDecl(AST):
    def __init__(self, name, params, defaults, body):
        self.name = name; self.params = params; self.defaults = defaults; self.body = body

class Return(AST):
    def __init__(self, value): self.value = value

class IfExpr(AST):
    def __init__(self, cond, then_body, else_ifs, else_body):
        self.cond = cond; self.then_body = then_body
        self.else_ifs = else_ifs; self.else_body = else_body

class MatchExpr(AST):
    def __init__(self, value, cases, default):
        self.value = value; self.cases = cases; self.default = default

class Loop(AST):
    def __init__(self, loop_type, condition, body):
        self.loop_type = loop_type; self.condition = condition; self.body = body

class BreakStmt(AST):
    pass

class ContinueStmt(AST):
    pass

class RangeLit(AST):
    def __init__(self, start, end): self.start = start; self.end = end

class ListLit(AST):
    def __init__(self, elements): self.elements = elements

class DictLit(AST):
    def __init__(self, pairs): self.pairs = pairs

class IndexAccess(AST):
    def __init__(self, obj, index): self.obj = obj; self.index = index

class FieldAccess(AST):
    def __init__(self, obj, field): self.obj = obj; self.field = field

class MethodCall(AST):
    def __init__(self, obj, method, args): self.obj = obj; self.method = method; self.args = args

class NullSafe(AST):
    def __init__(self, expr): self.expr = expr

class InterpolatedStr(AST):
    def __init__(self, parts): self.parts = parts  # list of str and expr

class PipeExpr(AST):
    def __init__(self, left, right): self.left = left; self.right = right

class ArrowFn(AST):
    def __init__(self, params, body): self.params = params; self.body = body


# ============================================================
# PARSER
# ============================================================

class ParseError(Exception):
    def __init__(self, token: Token, msg: str):
        super().__init__(f"[Line {token.line}] {msg}\n  near: '{token.lexeme}'")

class Parser:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0

    def parse(self) -> Program:
        stmts = []
        while not self._at_end():
            while self._match(T.NEWLINE): pass
            if self._at_end(): break
            stmts.append(self._declaration())
        return Program(stmts)

    # --- Helpers ---
    def _at_end(self): return self._peek().type == T.EOF
    def _peek(self): return self.tokens[self.pos]
    def _prev(self): return self.tokens[self.pos - 1]

    def _match(self, *types) -> bool:
        for t in types:
            if self._peek().type == t:
                self.pos += 1
                return True
        return False

    def _check(self, t: T) -> bool:
        return self._peek().type == t

    def _consume(self, t: T, msg: str) -> Token:
        if self._check(t):
            self.pos += 1
            return self._prev()
        raise ParseError(self._peek(), msg)

    # --- Declarations ---
    def _declaration(self):
        if self._match(T.FN): return self._fn_decl()
        if self._match(T.LET): return self._var_decl()
        return self._statement()

    def _fn_decl(self):
        name = self._consume(T.IDENT, "Expected function name.")
        self._consume(T.LPAREN, "Expected '('.")
        params, defaults = [], []
        if not self._check(T.RPAREN):
            params, defaults = self._parameters()
        self._consume(T.RPAREN, "Expected ')'.")
        while self._match(T.NEWLINE): pass
        body = self._block()
        return FnDecl(name.lexeme, params, defaults, body)

    def _parameters(self):
        params, defaults = [], []
        param = self._consume(T.IDENT, "Expected parameter name.")
        params.append(param.lexeme)
        if self._match(T.EQ):
            defaults.append(self._expression())
        else:
            defaults.append(None)
        while self._match(T.COMMA):
            param = self._consume(T.IDENT, "Expected parameter name.")
            params.append(param.lexeme)
            if self._match(T.EQ):
                defaults.append(self._expression())
            else:
                defaults.append(None)
        return params, defaults

    def _var_decl(self):
        name = self._consume(T.IDENT, "Expected variable name.")
        self._consume(T.EQ, "Expected '='.")
        value = self._expression()
        return VarDecl(name.lexeme, value)

    # --- Statements ---
    def _statement(self):
        if self._match(T.IF): return self._if_stmt()
        if self._match(T.MATCH): return self._match_stmt()
        if self._match(T.LOOP): return self._loop_stmt()
        if self._match(T.RETURN): return self._return_stmt()
        if self._match(T.BREAK): return BreakStmt()
        if self._match(T.CONTINUE): return ContinueStmt()

        expr = self._expression()
        if self._match(T.EQ):
            value = self._expression()
            return Assign(expr, value)
        return expr

    def _if_stmt(self):
        cond = self._expression()
        self._consume(T.THEN, "Expected 'then'.")
        while self._match(T.NEWLINE): pass
        then_body = self._block()
        else_ifs = []
        while self._match(T.ELSE):
            if self._match(T.IF):
                econd = self._expression()
                self._consume(T.THEN, "Expected 'then'.")
                while self._match(T.NEWLINE): pass
                else_ifs.append((econd, self._block()))
            else:
                while self._match(T.NEWLINE): pass
                return IfExpr(cond, then_body, else_ifs, self._block())
        return IfExpr(cond, then_body, else_ifs, None)

    def _match_stmt(self):
        value = self._expression()
        while self._match(T.NEWLINE): pass
        self._consume(T.LBRACE, "Expected '{'.")
        while self._match(T.NEWLINE): pass
        cases = []
        while self._match(T.WHEN):
            pattern = self._expression()
            self._consume(T.FAT_ARROW, "Expected '=>'.")
            while self._match(T.NEWLINE): pass
            body = []
            while not self._check(T.WHEN) and not self._check(T.RBRACE) and not self._check(T.EOF):
                while self._match(T.NEWLINE): pass
                if self._check(T.WHEN) or self._check(T.RBRACE) or self._check(T.EOF):
                    break
                body.append(self._declaration())
            cases.append((pattern, body))
            while self._match(T.NEWLINE): pass
        default = None
        if self._match(T.ELSE):
            self._consume(T.FAT_ARROW, "Expected '=>'.")
            while self._match(T.NEWLINE): pass
            default = []
            while not self._check(T.RBRACE) and not self._check(T.EOF):
                while self._match(T.NEWLINE): pass
                if self._check(T.RBRACE) or self._check(T.EOF): break
                default.append(self._declaration())
        self._consume(T.RBRACE, "Expected '}'.")
        return MatchExpr(value, cases, default)

    def _loop_stmt(self):
        if self._match(T.FOREVER):
            while self._match(T.NEWLINE): pass
            return Loop("forever", None, self._block())
        if self._match(T.WHILE):
            cond = self._expression()
            while self._match(T.NEWLINE): pass
            return Loop("while", cond, self._block())
        count = self._expression()
        self._consume(T.TIMES, "Expected 'times'.")
        while self._match(T.NEWLINE): pass
        return Loop("times", count, self._block())

    def _return_stmt(self):
        if self._check(T.NEWLINE) or self._check(T.END) or self._check(T.EOF):
            return Return(None)
        return Return(self._expression())

    def _block(self) -> list:
        stmts = []
        while not self._check(T.END) and not self._check(T.ELSE) and not self._check(T.WHEN) and not self._check(T.RBRACE) and not self._check(T.EOF):
            while self._match(T.NEWLINE): pass
            if self._check(T.END) or self._check(T.ELSE) or self._check(T.WHEN) or self._check(T.RBRACE) or self._check(T.EOF):
                break
            stmts.append(self._declaration())
        self._consume(T.END, "Expected 'end'.")
        return stmts

    # --- Expressions ---
    def _expression(self):
        return self._pipe()

    def _pipe(self):
        expr = self._or_expr()
        while self._match(T.PIPE):
            right = self._or_expr()
            expr = PipeExpr(expr, right)
        return expr

    def _or_expr(self):
        expr = self._and_expr()
        while self._match(T.OR):
            expr = Binary(expr, T.OR, self._and_expr())
        return expr

    def _and_expr(self):
        expr = self._equality()
        while self._match(T.AND):
            expr = Binary(expr, T.AND, self._equality())
        return expr

    def _equality(self):
        expr = self._comparison()
        while self._match(T.EQ_EQ, T.NOT_EQ):
            expr = Binary(expr, self._prev().type, self._comparison())
        return expr

    def _comparison(self):
        expr = self._range()
        while self._match(T.LT, T.LT_EQ, T.GT, T.GT_EQ):
            expr = Binary(expr, self._prev().type, self._range())
        return expr

    def _range(self):
        expr = self._term()
        if self._match(T.DOT_DOT):
            end = self._term()
            return RangeLit(expr, end)
        return expr

    def _term(self):
        expr = self._factor()
        while self._match(T.PLUS, T.MINUS):
            expr = Binary(expr, self._prev().type, self._factor())
        return expr

    def _factor(self):
        expr = self._unary()
        while self._match(T.STAR, T.SLASH, T.MOD):
            expr = Binary(expr, self._prev().type, self._unary())
        return expr

    def _unary(self):
        if self._match(T.MINUS, T.NOT):
            return Unary(self._prev().type, self._unary())
        return self._null_safe()

    def _null_safe(self):
        expr = self._call()
        while self._match(T.QUESTION):
            expr = NullSafe(expr)
        return expr

    def _call(self):
        expr = self._primary()
        while True:
            if self._match(T.LPAREN):
                expr = self._finish_call(expr)
            elif self._match(T.DOT):
                name = self._consume(T.IDENT, "Expected field name.")
                if self._match(T.LPAREN):
                    expr = self._finish_method(expr, name.lexeme)
                else:
                    expr = FieldAccess(expr, name.lexeme)
            elif self._match(T.LBRACK):
                idx = self._expression()
                self._consume(T.RBRACK, "Expected ']'.")
                expr = IndexAccess(expr, idx)
            else:
                break
        return expr

    def _finish_call(self, callee):
        args = []
        if not self._check(T.RPAREN):
            args.append(self._expression())
            while self._match(T.COMMA):
                args.append(self._expression())
        self._consume(T.RPAREN, "Expected ')'.")
        return Call(callee, args)

    def _finish_method(self, obj, method):
        args = []
        if not self._check(T.RPAREN):
            args.append(self._expression())
            while self._match(T.COMMA):
                args.append(self._expression())
        self._consume(T.RPAREN, "Expected ')'.")
        return MethodCall(obj, method, args)

    def _primary(self):
        if self._match(T.NUM): return NumLit(self._prev().literal)
        if self._match(T.STR): return StrLit(self._prev().literal)
        if self._match(T.TRUE): return BoolLit(True)
        if self._match(T.FALSE): return BoolLit(False)
        if self._match(T.NULL): return NullLit()
        if self._match(T.IDENT): return Var(self._prev().lexeme)

        if self._match(T.DOLLAR):
            self._consume(T.LPAREN, "Expected '(' after '$'.")
            expr = self._expression()
            self._consume(T.RPAREN, "Expected ')'.")
            return expr

        if self._match(T.LPAREN):
            # Check for arrow function: (params) -> expr
            if self._match(T.RPAREN):
                self._consume(T.FAT_ARROW, "Expected '=>'.")
                return ArrowFn([], self._expression())
            expr = self._expression()
            if self._match(T.COMMA):
                # Multi-param arrow function
                params = [self._extract_param(expr)]
                params.append(self._consume(T.IDENT, "Expected parameter name.").lexeme)
                while self._match(T.COMMA):
                    params.append(self._consume(T.IDENT, "Expected parameter name.").lexeme)
                self._consume(T.RPAREN, "Expected ')'.")
                self._consume(T.FAT_ARROW, "Expected '=>'.")
                return ArrowFn(params, self._expression())
            if self._match(T.RPAREN):
                if self._match(T.FAT_ARROW):
                    return ArrowFn([self._extract_param(expr)], self._expression())
                return expr
            self._consume(T.RPAREN, "Expected ')'.")
            return expr

        if self._match(T.LBRACK):
            elements = []
            if not self._check(T.RBRACK):
                elements.append(self._expression())
                while self._match(T.COMMA):
                    elements.append(self._expression())
            self._consume(T.RBRACK, "Expected ']'.")
            return ListLit(elements)

        if self._match(T.LBRACE):
            pairs = []
            if not self._check(T.RBRACE):
                key = self._expression()
                self._consume(T.COLON, "Expected ':'.")
                value = self._expression()
                pairs.append((key, value))
                while self._match(T.COMMA):
                    key = self._expression()
                    self._consume(T.COLON, "Expected ':'.")
                    value = self._expression()
                    pairs.append((key, value))
            self._consume(T.RBRACE, "Expected '}'.")
            return DictLit(pairs)

        raise ParseError(self._peek(), "Expected expression.")

    def _extract_param(self, expr):
        if isinstance(expr, Var):
            return expr.name
        raise ParseError(self._peek(), "Expected parameter name.")


# ============================================================
# INTERPRETER
# ============================================================

class BreakException(Exception): pass
class ContinueException(Exception): pass

class ReturnException(Exception):
    def __init__(self, value): self.value = value

class Environment:
    def __init__(self, parent=None):
        self.vars: dict[str, Any] = {}
        self.parent = parent

    def define(self, name: str, value: Any):
        self.vars[name] = value

    def get(self, name: str) -> Any:
        if name in self.vars:
            return self.vars[name]
        if self.parent:
            return self.parent.get(name)
        raise RuntimeError(f"Undefined variable: '{name}'")

    def assign(self, name: str, value: Any):
        if name in self.vars:
            self.vars[name] = value
            return
        if self.parent:
            self.parent.assign(name, value)
            return
        raise RuntimeError(f"Cannot assign to undefined variable: '{name}'")


class ChrxmFunction:
    def __init__(self, name, params, defaults, body, env):
        self.name = name
        self.params = params
        self.defaults = defaults
        self.body = body
        self.env = env

    def call(self, interpreter, args):
        env = Environment(self.env)
        for i, param in enumerate(self.params):
            if i < len(args):
                env.define(param, args[i])
            elif self.defaults[i] is not None:
                env.define(param, interpreter._eval(self.defaults[i]))
            else:
                raise RuntimeError(f"Missing argument: '{param}' in '{self.name}'")
        return interpreter._execute_block(self.body, env)


class NativeFunction:
    def __init__(self, name, func, arity=None):
        self.name = name
        self.func = func
        self.arity = arity

    def call(self, interpreter, args):
        return self.func(args)


class Interpreter:
    def __init__(self):
        self.globals = Environment()
        self.env = self.globals
        self._register_natives()
        self.output = []  # Capture printed output

    def _register_natives(self):
        def p(args): self.output.append(' '.join(str(a) for a in args)); print(*args)
        def inp(args): return input(args[0] if args else "")
        def rnd(args):
            if len(args) == 1: return random.random() * args[0]
            if len(args) == 2: return random.uniform(args[0], args[1])
            return random.random()
        def rnd_int(args): return random.randint(int(args[0]), int(args[1]))
        def flr(args): return math.floor(args[0])
        def ceil(args): return math.ceil(args[0])
        def sqrt(args): return math.sqrt(args[0])
        def abs_(args): return abs(args[0])
        def typeof(args): return type(args[0]).__name__
        def clock(args): return time.time()

        self.globals.define("print", NativeFunction("print", p))
        self.globals.define("input", NativeFunction("input", inp))
        self.globals.define("random", NativeFunction("random", rnd))
        self.globals.define("randint", NativeFunction("randint", rnd_int))
        self.globals.define("floor", NativeFunction("floor", flr))
        self.globals.define("ceil", NativeFunction("ceil", ceil))
        self.globals.define("sqrt", NativeFunction("sqrt", sqrt))
        self.globals.define("abs", NativeFunction("abs", abs_))
        self.globals.define("type", NativeFunction("type", typeof))
        self.globals.define("clock", NativeFunction("clock", clock))

    def run(self, program: Program):
        try:
            for stmt in program.stmts:
                self._exec(stmt)
        except ReturnException:
            pass

    def _exec(self, node):
        method = f"_exec_{type(node).__name__}"
        if hasattr(self, method):
            return getattr(self, method)(node)
        return self._eval(node)

    def _eval(self, node):
        method = f"_eval_{type(node).__name__}"
        if hasattr(self, method):
            return getattr(self, method)(node)
        raise RuntimeError(f"No evaluator for {type(node).__name__}")

    def _execute_block(self, stmts, env):
        prev = self.env
        self.env = env
        try:
            for stmt in stmts:
                self._exec(stmt)
        except ReturnException as e:
            return e.value
        finally:
            self.env = prev
        return None

    # --- Execution ---
    def _exec_Program(self, node):
        for stmt in node.stmts:
            self._exec(stmt)

    def _exec_VarDecl(self, node):
        value = self._eval(node.value)
        self.env.define(node.name, value)

    def _exec_FnDecl(self, node):
        fn = ChrxmFunction(node.name, node.params, node.defaults, node.body, self.env)
        self.env.define(node.name, fn)

    def _exec_Assign(self, node):
        value = self._eval(node.value)
        if isinstance(node.target, Var):
            self.env.assign(node.target.name, value)
        elif isinstance(node.target, FieldAccess):
            obj = self._eval(node.target.obj)
            if isinstance(obj, dict):
                obj[node.target.field] = value
            else:
                setattr(obj, node.target.field, value)
        elif isinstance(node.target, IndexAccess):
            obj = self._eval(node.target.obj)
            idx = self._eval(node.target.index)
            obj[int(idx)] = value
        else:
            raise RuntimeError("Invalid assignment target.")

    def _exec_IfExpr(self, node):
        if self._eval(node.cond):
            for stmt in node.then_body:
                self._exec(stmt)
        else:
            for econd, ebody in node.else_ifs:
                if self._eval(econd):
                    for stmt in ebody:
                        self._exec(stmt)
                    return
            if node.else_body:
                for stmt in node.else_body:
                    self._exec(stmt)

    def _exec_MatchExpr(self, node):
        val = self._eval(node.value)
        for pattern, body in node.cases:
            pat_val = self._eval(pattern)
            if val == pat_val:
                for stmt in body:
                    self._exec(stmt)
                return
        if node.default:
            for stmt in node.default:
                self._exec(stmt)

    def _exec_Loop(self, node):
        if node.loop_type == "forever":
            while True:
                try:
                    for stmt in node.body:
                        self._exec(stmt)
                except BreakException:
                    break
                except ContinueException:
                    continue
        elif node.loop_type == "while":
            while self._eval(node.condition):
                try:
                    for stmt in node.body:
                        self._exec(stmt)
                except BreakException:
                    break
                except ContinueException:
                    continue
        elif node.loop_type == "times":
            count = int(self._eval(node.condition))
            for _ in range(count):
                try:
                    for stmt in node.body:
                        self._exec(stmt)
                except BreakException:
                    break
                except ContinueException:
                    continue

    def _exec_Return(self, node):
        raise ReturnException(self._eval(node.value) if node.value else None)

    def _exec_BreakStmt(self, node):
        raise BreakException()

    def _exec_ContinueStmt(self, node):
        raise ContinueException()

    # --- Evaluation ---
    def _eval_NumLit(self, node): return node.v
    def _eval_StrLit(self, node): return node.v
    def _eval_BoolLit(self, node): return node.v
    def _eval_NullLit(self, node): return None

    def _eval_Var(self, node): return self.env.get(node.name)

    def _eval_Binary(self, node):
        left = self._eval(node.left)
        op = node.op
        if op == T.AND:
            return left and self._eval(node.right)
        if op == T.OR:
            return left or self._eval(node.right)
        right = self._eval(node.right)
        ops = {
            T.PLUS: lambda a, b: a + b,
            T.MINUS: lambda a, b: a - b,
            T.STAR: lambda a, b: a * b,
            T.SLASH: lambda a, b: a / b,
            T.MOD: lambda a, b: a % b,
            T.EQ_EQ: lambda a, b: a == b,
            T.NOT_EQ: lambda a, b: a != b,
            T.LT: lambda a, b: a < b,
            T.LT_EQ: lambda a, b: a <= b,
            T.GT: lambda a, b: a > b,
            T.GT_EQ: lambda a, b: a >= b,
        }
        return ops[op](left, right)

    def _eval_Unary(self, node):
        operand = self._eval(node.operand)
        if node.op == T.MINUS: return -operand
        if node.op == T.NOT: return not operand

    def _eval_Call(self, node):
        callee = self._eval(node.callee)
        args = [self._eval(a) for a in node.args]
        if isinstance(callee, (ChrxmFunction, NativeFunction)):
            return callee.call(self, args)
        raise RuntimeError(f"'{node.callee}' is not callable.")

    def _eval_ArrowFn(self, node):
        return ChrxmFunction("<arrow>", node.params, [], [Return(node.body)], self.env)

    def _eval_ListLit(self, node):
        return [self._eval(e) for e in node.elements]

    def _eval_DictLit(self, node):
        result = {}
        for k, v in node.pairs:
            result[self._eval(k)] = self._eval(v)
        return result

    def _eval_IndexAccess(self, node):
        obj = self._eval(node.obj)
        idx = self._eval(node.index)
        return obj[int(idx)]

    def _eval_FieldAccess(self, node):
        obj = self._eval(node.obj)
        if isinstance(obj, dict):
            return obj.get(node.field)
        return getattr(obj, node.field, None)

    def _eval_MethodCall(self, node):
        obj = self._eval(node.obj)
        args = [self._eval(a) for a in node.args]
        if isinstance(obj, list):
            methods = {
                "add": lambda: obj.append(*args),
                "remove": lambda: obj.remove(args[0]) if args else None,
                "pop": lambda: obj.pop(),
                "length": lambda: len(obj),
                "clear": lambda: obj.clear(),
                "contains": lambda: args[0] in obj,
                "find": lambda: obj.index(args[0]) if args[0] in obj else -1,
            }
            if node.method in methods:
                return methods[node.method]()
        if isinstance(obj, str):
            methods = {
                "length": lambda: len(obj),
                "upper": lambda: obj.upper(),
                "lower": lambda: obj.lower(),
                "contains": lambda: args[0] in obj,
                "replace": lambda: obj.replace(args[0], args[1]) if len(args) >= 2 else obj,
                "split": lambda: obj.split(args[0]) if args else obj.split(),
            }
            if node.method in methods:
                return methods[node.method]()
        if isinstance(obj, dict):
            methods = {
                "keys": lambda: list(obj.keys()),
                "values": lambda: list(obj.values()),
                "has": lambda: args[0] in obj,
                "length": lambda: len(obj),
            }
            if node.method in methods:
                return methods[node.method]()
        raise RuntimeError(f"No method '{node.method}' on {type(obj).__name__}")

    def _eval_RangeLit(self, node):
        start = int(self._eval(node.start))
        end = int(self._eval(node.end))
        return list(range(start, end))

    def _eval_NullSafe(self, node):
        try:
            return self._eval(node.expr)
        except RuntimeError:
            return None

    def _eval_PipeExpr(self, node):
        value = self._eval(node.left)
        if isinstance(node.right, Call):
            node.right.args.insert(0, NumLit(value))
        else:
            node.right.args.insert(0, None)  # Placeholder
            node.right.args[0] = NumLit(value)
        return self._eval(node.right)


# ============================================================
# PUBLIC API
# ============================================================

def run(source: str):
    """Parse and execute a ChrxMedium script."""
    lexer = Lexer(source)
    tokens = lexer.tokenize()
    parser = Parser(tokens)
    ast = parser.parse()
    interpreter = Interpreter()
    interpreter.run(ast)
    return interpreter.output
