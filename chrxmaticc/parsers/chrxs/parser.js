/**
 * Chrxs Parser - Style, Animation & Vector Graphics Engine
 * 
 * Handles:
 *   - Vector shapes (rect, circle, ellipse, line, poly, path)
 *   - SVG-like path data (M, L, C, Q, A commands)
 *   - Fills, strokes, gradients (linear, radial)
 *   - Filters (blur, glow, shadow, noise)
 *   - Animations (keyframe, tween, spring, timeline)
 *   - Sprite sheets (frame definitions, playback)
 *   - Particles (emitters, behaviors)
 *   - Transforms (translate, rotate, scale, skew)
 *   - Blend modes and opacity
 *   - Reusable styles and themes
 *   - Export to SVG, Canvas, or game engine format
 */

// ============================================================
// TOKENIZER
// ============================================================

const T = {
    // Shape types
    SHAPE: 'SHAPE', RECT: 'RECT', CIRCLE: 'CIRCLE', ELLIPSE: 'ELLIPSE',
    LINE: 'LINE', POLY: 'POLY', PATH: 'PATH', GROUP: 'GROUP',
    TEXT_SHAPE: 'TEXT_SHAPE', IMAGE_SHAPE: 'IMAGE_SHAPE',
    
    // Style
    STYLE: 'STYLE', THEME: 'THEME', CLASS: 'CLASS',
    FILL: 'FILL', STROKE: 'STROKE', STROKE_WIDTH: 'STROKE_WIDTH',
    OPACITY: 'OPACITY', BLEND: 'BLEND',
    
    // Gradient
    GRADIENT: 'GRADIENT', LINEAR_GRAD: 'LINEAR_GRAD', RADIAL_GRAD: 'RADIAL_GRAD',
    STOP: 'STOP', ANGLE: 'ANGLE',
    
    // Filter
    FILTER: 'FILTER', BLUR: 'BLUR', GLOW: 'GLOW', SHADOW: 'SHADOW',
    NOISE: 'NOISE', COLOR_MATRIX: 'COLOR_MATRIX',
    
    // Transform
    TRANSFORM: 'TRANSFORM', TRANSLATE: 'TRANSLATE', ROTATE: 'ROTATE',
    SCALE: 'SCALE', SKEW: 'SKEW', ORIGIN: 'ORIGIN',
    
    // Animation
    ANIMATION: 'ANIMATION', KEYFRAME: 'KEYFRAME', TWEEN: 'TWEEN',
    SPRING: 'SPRING', TIMELINE: 'TIMELINE', DURATION: 'DURATION',
    DELAY: 'DELAY', EASING: 'EASING', LOOP: 'LOOP', YOYO: 'YOYO',
    PLAY: 'PLAY', PAUSE: 'PAUSE', STOP: 'STOP',
    
    // Sprite
    SPRITE: 'SPRITE', SPRITESHEET: 'SPRITESHEET', FRAME: 'FRAME',
    FPS: 'FPS', SOURCE: 'SOURCE', TILE: 'TILE',
    
    // Particle
    PARTICLE: 'PARTICLE', EMITTER: 'EMITTER', BURST: 'BURST',
    COUNT: 'COUNT', SPEED: 'SPEED', LIFETIME: 'LIFETIME',
    GRAVITY: 'GRAVITY', SPREAD: 'SPREAD',
    
    // Path commands (SVG-like)
    MOVE: 'MOVE', LINE_TO: 'LINE_TO', CURVE: 'CURVE',
    QUAD: 'QUAD', ARC: 'ARC', CLOSE: 'CLOSE',
    
    // Values
    IDENT: 'IDENT', NUM: 'NUM', STR: 'STR', COLOR: 'COLOR',
    BOOL: 'BOOL', PERCENT: 'PERCENT', PIXEL: 'PIXEL',
    
    // Delimiters
    COLON: 'COLON', COMMA: 'COMMA', SEMI: 'SEMI',
    LBRACE: 'LBRACE', RBRACE: 'RBRACE',
    LPAREN: 'LPAREN', RPAREN: 'RPAREN',
    LBRACK: 'LBRACK', RBRACK: 'RBRACK',
    ARROW: 'ARROW', AT: 'AT', DOT: 'DOT',
    
    NEWLINE: 'NEWLINE', EOF: 'EOF',
};

const KEYWORDS = {
    'shape': T.SHAPE, 'rect': T.RECT, 'circle': T.CIRCLE,
    'ellipse': T.ELLIPSE, 'line': T.LINE, 'poly': T.POLY,
    'path': T.PATH, 'group': T.GROUP, 'text': T.TEXT_SHAPE,
    'image': T.IMAGE_SHAPE,
    'style': T.STYLE, 'theme': T.THEME, 'class': T.CLASS,
    'fill': T.FILL, 'stroke': T.STROKE, 'stroke_width': T.STROKE_WIDTH,
    'opacity': T.OPACITY, 'blend': T.BLEND,
    'gradient': T.GRADIENT, 'linear': T.LINEAR_GRAD, 'radial': T.RADIAL_GRAD,
    'stop': T.STOP, 'angle': T.ANGLE,
    'filter': T.FILTER, 'blur': T.BLUR, 'glow': T.GLOW,
    'shadow': T.SHADOW, 'noise': T.NOISE, 'color_matrix': T.COLOR_MATRIX,
    'transform': T.TRANSFORM, 'translate': T.TRANSLATE, 'rotate': T.ROTATE,
    'scale': T.SCALE, 'skew': T.SKEW, 'origin': T.ORIGIN,
    'animation': T.ANIMATION, 'keyframe': T.KEYFRAME, 'tween': T.TWEEN,
    'spring': T.SPRING, 'timeline': T.TIMELINE, 'duration': T.DURATION,
    'delay': T.DELAY, 'easing': T.EASING, 'loop': T.LOOP, 'yoyo': T.YOYO,
    'play': T.PLAY, 'pause': T.PAUSE, 'stop': T.STOP,
    'sprite': T.SPRITE, 'spritesheet': T.SPRITESHEET, 'frame': T.FRAME,
    'fps': T.FPS, 'source': T.SOURCE, 'tile': T.TILE,
    'particle': T.PARTICLE, 'emitter': T.EMITTER, 'burst': T.BURST,
    'count': T.COUNT, 'speed': T.SPEED, 'lifetime': T.LIFETIME,
    'gravity': T.GRAVITY, 'spread': T.SPREAD,
    'true': T.BOOL, 'false': T.BOOL,
    'ease_in': T.EASING, 'ease_out': T.EASING, 'ease_in_out': T.EASING,
    'linear_ease': T.EASING, 'bounce': T.EASING, 'elastic': T.EASING,
    'cubic_bezier': T.EASING,
};

// Path command keywords
const PATH_COMMANDS = {
    'M': T.MOVE, 'm': T.MOVE,
    'L': T.LINE_TO, 'l': T.LINE_TO,
    'H': T.LINE_TO, 'h': T.LINE_TO,
    'V': T.LINE_TO, 'v': T.LINE_TO,
    'C': T.CURVE, 'c': T.CURVE,
    'S': T.CURVE, 's': T.CURVE,
    'Q': T.QUAD, 'q': T.QUAD,
    'T': T.QUAD, 't': T.QUAD,
    'A': T.ARC, 'a': T.ARC,
    'Z': T.CLOSE, 'z': T.CLOSE,
};

class Token {
    constructor(type, lexeme, line, col, literal = null) {
        this.type = type;
        this.lexeme = lexeme;
        this.line = line;
        this.col = col;
        this.literal = literal;
    }
}

class Lexer {
    constructor(source) {
        this.source = source;
        this.tokens = [];
        this.start = 0;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
    }

    tokenize() {
        while (!this.isAtEnd()) {
            this.start = this.pos;
            this.scanToken();
        }
        this.tokens.push(new Token(T.EOF, '', this.line, this.col));
        return this.tokens;
    }

    isAtEnd() { return this.pos >= this.source.length; }
    advance() { this.col++; return this.source[this.pos++]; }
    peek(o = 0) { const i = this.pos + o; return i < this.source.length ? this.source[i] : '\0'; }
    
    match(expected) {
        if (this.isAtEnd() || this.source[this.pos] !== expected) return false;
        this.pos++; this.col++; return true;
    }

    add(type, literal = null) {
        const lex = this.source.substring(this.start, this.pos);
        this.tokens.push(new Token(type, lex, this.line, this.col, literal));
    }

    scanToken() {
        const c = this.advance();
        switch (c) {
            case ':': return this.add(T.COLON);
            case ',': return this.add(T.COMMA);
            case ';': return this.add(T.SEMI);
            case '{': return this.add(T.LBRACE);
            case '}': return this.add(T.RBRACE);
            case '(': return this.add(T.LPAREN);
            case ')': return this.add(T.RPAREN);
            case '[': return this.add(T.LBRACK);
            case ']': return this.add(T.RBRACK);
            case '.': return this.add(T.DOT);
            case '@': return this.add(T.AT);
            case '#': this.scanColor(); return;
            case '-':
                if (this.match('>')) return this.add(T.ARROW);
                if (this.match('-')) { while (this.peek() !== '\n' && !this.isAtEnd()) this.advance(); return; }
                return this.add(T.MINUS);
            case ' ': case '\r': case '\t': return;
            case '\n': this.line++; this.col = 1; return this.add(T.NEWLINE);
            case '"': case "'": this.scanString(c); return;
            default:
                if (/[0-9]/.test(c)) { this.scanNumber(); return; }
                if (/[a-zA-Z_]/.test(c)) { this.scanIdentifier(); return; }
        }
    }

    scanColor() {
        while (/[0-9a-fA-F]/.test(this.peek())) this.advance();
        this.add(T.COLOR, this.source.substring(this.start, this.pos));
    }

    scanString(quote) {
        while (this.peek() !== quote && !this.isAtEnd()) {
            if (this.peek() === '\n') { this.line++; this.col = 1; }
            if (this.peek() === '\\') this.advance();
            this.advance();
        }
        if (!this.isAtEnd()) this.advance();
        this.add(T.STR, this.source.substring(this.start + 1, this.pos - 1));
    }

    scanNumber() {
        while (/[0-9]/.test(this.peek())) this.advance();
        if (this.peek() === '.' && /[0-9]/.test(this.peek(1))) {
            this.advance();
            while (/[0-9]/.test(this.peek())) this.advance();
        }
        if (this.peek() === '%') {
            this.advance();
            this.add(T.PERCENT, parseFloat(this.source.substring(this.start, this.pos - 1)));
            return;
        }
        if (/[a-zA-Z]/.test(this.peek())) {
            while (/[a-zA-Z]/.test(this.peek())) this.advance();
        }
        this.add(T.NUM, parseFloat(this.source.substring(this.start, this.pos)));
    }

    scanIdentifier() {
        while (/[a-zA-Z0-9_-]/.test(this.peek())) this.advance();
        const text = this.source.substring(this.start, this.pos);
        
        // Check path commands
        if (text.length === 1 && PATH_COMMANDS[text]) {
            this.add(PATH_COMMANDS[text], text);
            return;
        }
        
        const type = KEYWORDS[text] || T.IDENT;
        let literal = null;
        if (type === T.BOOL) literal = text === 'true';
        this.add(type, literal);
    }
}


// ============================================================
// AST NODES
// ============================================================

class ChrxsNode {
    constructor(type) { this.type = type; this.children = []; this.properties = {}; }
}

class ChrxsDocument extends ChrxsNode {
    constructor() { super('document'); this.styles = {}; this.themes = {}; this.animations = {}; this.defs = {}; }
}

class ShapeNode extends ChrxsNode {
    constructor(shapeType) { super('shape'); this.shapeType = shapeType; }
}

class StyleNode extends ChrxsNode {
    constructor(name) { super('style'); this.name = name; }
}

class AnimationNode extends ChrxsNode {
    constructor(name) { super('animation'); this.name = name; this.keyframes = []; }
}

class SpriteNode extends ChrxsNode {
    constructor(name) { super('sprite'); this.name = name; this.frames = []; }
}

class ParticleNode extends ChrxsNode {
    constructor(name) { super('particle'); this.name = name; }
}

class FilterNode extends ChrxsNode {
    constructor(filterType) { super('filter'); this.filterType = filterType; }
}

class GradientNode extends ChrxsNode {
    constructor(gradType) { super('gradient'); this.gradientType = gradType; this.stops = []; }
}


// ============================================================
// PARSER
// ============================================================

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    parse() {
        const doc = new ChrxsDocument();
        
        while (!this.isAtEnd()) {
            while (this.match(T.NEWLINE));
            if (this.isAtEnd()) break;
            
            if (this.match(T.STYLE) || this.match(T.CLASS)) {
                const style = this.parseStyle();
                if (style) doc.styles[style.name] = style;
            } else if (this.match(T.THEME)) {
                const theme = this.parseTheme();
                if (theme) doc.themes[theme.name] = theme;
            } else if (this.match(T.ANIMATION)) {
                const anim = this.parseAnimation();
                if (anim) doc.animations[anim.name] = anim;
            } else if (this.match(T.SPRITE) || this.match(T.SPRITESHEET)) {
                const sprite = this.parseSprite();
                if (sprite) doc.defs[sprite.name] = sprite;
            } else if (this.match(T.PARTICLE) || this.match(T.EMITTER)) {
                const particle = this.parseParticle();
                if (particle) doc.defs[particle.name] = particle;
            } else if (this.match(T.FILTER)) {
                const filter = this.parseFilter();
                if (filter) doc.defs[filter.name || filter.filterType] = filter;
            } else if (this.match(T.GRADIENT)) {
                const grad = this.parseGradient();
                if (grad) doc.defs[grad.name || 'gradient'] = grad;
            } else {
                const shape = this.parseShape();
                if (shape) doc.children.push(shape);
            }
        }
        
        return doc;
    }

    isAtEnd() { return this.peek().type === T.EOF; }
    peek() { return this.tokens[this.pos]; }
    advance() { return this.tokens[this.pos++]; }
    previous() { return this.tokens[this.pos - 1]; }
    
    match(...types) {
        for (const t of types) {
            if (this.peek().type === t) { this.pos++; return true; }
        }
        return false;
    }

    consume(type, msg) {
        if (this.match(type)) return this.previous();
        throw new Error(`${msg} at line ${this.peek().line}`);
    }

    parseShape() {
        let shapeType = null;
        let name = null;
        
        // Check for shape type keyword
        const shapeTypes = [T.RECT, T.CIRCLE, T.ELLIPSE, T.LINE, T.POLY, T.PATH, T.GROUP, T.TEXT_SHAPE, T.IMAGE_SHAPE, T.SHAPE];
        
        for (const st of shapeTypes) {
            if (this.match(st)) {
                shapeType = this.previous().lexeme;
                break;
            }
        }
        
        if (!shapeType) {
            // Might be a named style application
            if (this.match(T.IDENT)) {
                name = this.previous().lexeme;
                if (this.peek().type === T.IDENT) {
                    shapeType = this.advance().lexeme;
                } else if (this.peek().type === T.LBRACE) {
                    shapeType = 'group';
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
        
        if (!name && this.match(T.IDENT)) {
            name = this.previous().lexeme;
        }
        
        const shape = new ShapeNode(shapeType);
        if (name) shape.name = name;
        
        if (this.match(T.LBRACE)) {
            this.parseBlock(shape);
        }
        
        return shape;
    }

    parseBlock(node) {
        while (!this.match(T.RBRACE) && !this.isAtEnd()) {
            while (this.match(T.NEWLINE));
            if (this.check(T.RBRACE) || this.isAtEnd()) break;
            
            // Path data
            if (this.check(T.MOVE) || this.check(T.LINE_TO) || this.check(T.CURVE) ||
                this.check(T.QUAD) || this.check(T.ARC) || this.check(T.CLOSE)) {
                node.properties.path_data = this.parsePathData();
                continue;
            }
            
            // Property: key: value
            if (this.match(T.IDENT)) {
                const key = this.previous().lexeme;
                
                if (this.match(T.COLON)) {
                    node.properties[key] = this.parseValue();
                } else if (this.match(T.LBRACE)) {
                    // Nested block
                    const child = new ShapeNode(key);
                    this.parseBlock(child);
                    node.children.push(child);
                }
                continue;
            }
            
            // Nested shape
            const child = this.parseShape();
            if (child) {
                node.children.push(child);
            } else {
                this.advance(); // skip unknown
            }
        }
        return node;
    }

    parsePathData() {
        const commands = [];
        while (this.check(T.MOVE) || this.check(T.LINE_TO) || this.check(T.CURVE) ||
               this.check(T.QUAD) || this.check(T.ARC) || this.check(T.CLOSE) ||
               this.check(T.NUM)) {
            const cmd = {};
            if (this.match(T.MOVE)) { cmd.command = this.previous().literal || this.previous().lexeme; }
            else if (this.match(T.LINE_TO)) { cmd.command = this.previous().literal || this.previous().lexeme; }
            else if (this.match(T.CURVE)) { cmd.command = this.previous().literal || this.previous().lexeme; }
            else if (this.match(T.QUAD)) { cmd.command = this.previous().literal || this.previous().lexeme; }
            else if (this.match(T.ARC)) { cmd.command = this.previous().literal || this.previous().lexeme; }
            else if (this.match(T.CLOSE)) { cmd.command = this.previous().literal || this.previous().lexeme; commands.push(cmd); continue; }
            
            // Collect numeric parameters
            cmd.params = [];
            while (this.check(T.NUM) || this.check(T.COMMA)) {
                if (this.match(T.COMMA)) continue;
                cmd.params.push(this.advance().literal);
            }
            commands.push(cmd);
        }
        return commands;
    }

    parseValue() {
        if (this.match(T.NUM)) return { type: 'number', value: this.previous().literal };
        if (this.match(T.PERCENT)) return { type: 'percent', value: this.previous().literal };
        if (this.match(T.STR)) return { type: 'string', value: this.previous().literal };
        if (this.match(T.COLOR)) return { type: 'color', value: this.previous().literal };
        if (this.match(T.BOOL)) return { type: 'boolean', value: this.previous().literal };
        if (this.match(T.IDENT)) return { type: 'identifier', value: this.previous().lexeme };
        
        // List: [val1, val2, ...]
        if (this.match(T.LBRACK)) {
            const items = [];
            while (!this.match(T.RBRACK) && !this.isAtEnd()) {
                items.push(this.parseValue());
                this.match(T.COMMA);
            }
            return { type: 'list', value: items };
        }
        
        return { type: 'unknown', value: null };
    }

    parseStyle() {
        const name = this.consume(T.IDENT, 'Expected style name');
        const style = new StyleNode(name.lexeme);
        if (this.match(T.LBRACE)) this.parseBlock(style);
        return style;
    }

    parseTheme() {
        const name = this.consume(T.IDENT, 'Expected theme name');
        const theme = new ChrxsNode('theme');
        theme.name = name.lexeme;
        if (this.match(T.LBRACE)) this.parseBlock(theme);
        return theme;
    }

    parseAnimation() {
        const name = this.consume(T.IDENT, 'Expected animation name');
        const anim = new AnimationNode(name.lexeme);
        
        if (this.match(T.LBRACE)) {
            while (!this.match(T.RBRACE) && !this.isAtEnd()) {
                while (this.match(T.NEWLINE));
                if (this.check(T.RBRACE) || this.isAtEnd()) break;
                
                if (this.match(T.KEYFRAME)) {
                    const kf = this.parseKeyframe();
                    if (kf) anim.keyframes.push(kf);
                } else if (this.match(T.IDENT)) {
                    const key = this.previous().lexeme;
                    this.consume(T.COLON, 'Expected ":"');
                    anim.properties[key] = this.parseValue();
                } else {
                    this.advance();
                }
            }
        }
        
        return anim;
    }

    parseKeyframe() {
        const kf = { time: 0, properties: {} };
        
        // time: number or 'from'/'to'
        if (this.match(T.NUM)) {
            kf.time = this.previous().literal;
        } else if (this.match(T.IDENT)) {
            const id = this.previous().lexeme;
            if (id === 'from') kf.time = 0;
            else if (id === 'to') kf.time = 1;
            else kf.time = 0;
        }
        
        if (this.match(T.LBRACE)) {
            while (!this.match(T.RBRACE) && !this.isAtEnd()) {
                while (this.match(T.NEWLINE));
                if (this.check(T.RBRACE) || this.isAtEnd()) break;
                
                if (this.match(T.IDENT)) {
                    const key = this.previous().lexeme;
                    this.consume(T.COLON, 'Expected ":"');
                    kf.properties[key] = this.parseValue();
                } else {
                    this.advance();
                }
            }
        }
        
        return kf;
    }

    parseSprite() {
        const name = this.consume(T.IDENT, 'Expected sprite name');
        const sprite = new SpriteNode(name.lexeme);
        
        if (this.match(T.LBRACE)) {
            while (!this.match(T.RBRACE) && !this.isAtEnd()) {
                while (this.match(T.NEWLINE));
                if (this.check(T.RBRACE) || this.isAtEnd()) break;
                
                if (this.match(T.FRAME)) {
                    const frame = {};
                    if (this.match(T.LBRACE)) {
                        while (!this.match(T.RBRACE)) {
                            while (this.match(T.NEWLINE));
                            if (this.check(T.RBRACE)) break;
                            if (this.match(T.IDENT)) {
                                const key = this.previous().lexeme;
                                this.consume(T.COLON, 'Expected ":"');
                                frame[key] = this.parseValue();
                            } else { this.advance(); }
                        }
                    }
                    sprite.frames.push(frame);
                } else if (this.match(T.IDENT)) {
                    const key = this.previous().lexeme;
                    this.consume(T.COLON, 'Expected ":"');
                    sprite.properties[key] = this.parseValue();
                } else {
                    this.advance();
                }
            }
        }
        
        return sprite;
    }

    parseParticle() {
        const name = this.consume(T.IDENT, 'Expected particle name');
        const particle = new ParticleNode(name.lexeme);
        if (this.match(T.LBRACE)) this.parseBlock(particle);
        return particle;
    }

    parseFilter() {
        let filterType = 'custom';
        let name = null;
        
        if (this.match(T.BLUR)) filterType = 'blur';
        else if (this.match(T.GLOW)) filterType = 'glow';
        else if (this.match(T.SHADOW)) filterType = 'shadow';
        else if (this.match(T.NOISE)) filterType = 'noise';
        
        if (this.match(T.IDENT)) name = this.previous().lexeme;
        
        const filter = new FilterNode(filterType);
        if (name) filter.name = name;
        if (this.match(T.LBRACE)) this.parseBlock(filter);
        return filter;
    }

    parseGradient() {
        let gradType = 'linear';
        if (this.match(T.LINEAR_GRAD)) gradType = 'linear';
        else if (this.match(T.RADIAL_GRAD)) gradType = 'radial';
        
        const name = this.match(T.IDENT) ? this.previous().lexeme : null;
        const grad = new GradientNode(gradType);
        if (name) grad.name = name;
        
        if (this.match(T.LBRACE)) {
            while (!this.match(T.RBRACE) && !this.isAtEnd()) {
                while (this.match(T.NEWLINE));
                if (this.check(T.RBRACE) || this.isAtEnd()) break;
                
                if (this.match(T.STOP)) {
                    const stop = {};
                    if (this.match(T.LBRACE)) {
                        while (!this.match(T.RBRACE)) {
                            while (this.match(T.NEWLINE));
                            if (this.check(T.RBRACE)) break;
                            if (this.match(T.IDENT)) {
                                const key = this.previous().lexeme;
                                this.consume(T.COLON, 'Expected ":"');
                                stop[key] = this.parseValue();
                            } else { this.advance(); }
                        }
                    }
                    grad.stops.push(stop);
                } else if (this.match(T.IDENT)) {
                    const key = this.previous().lexeme;
                    this.consume(T.COLON, 'Expected ":"');
                    grad.properties[key] = this.parseValue();
                } else {
                    this.advance();
                }
            }
        }
        
        return grad;
    }

    check(type) { return this.peek().type === type; }
}


// ============================================================
// SVG RENDERER
// ============================================================

class SVGRenderer {
    constructor(doc) {
        this.doc = doc;
        this.defs = '';
        this.elements = '';
        this.svgNS = 'http://www.w3.org/2000/svg';
    }

    render(width = 800, height = 600) {
        this.elements = '';
        this.defs = '';
        
        // Render defs first (gradients, filters, etc.)
        this.renderDefs();
        
        // Render shapes
        for (const shape of this.doc.children) {
            this.elements += this.renderShape(shape);
        }
        
        return this.wrapSVG(width, height);
    }

    wrapSVG(width, height) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
${this.defs}  </defs>
${this.elements}</svg>`;
    }

    renderDefs() {
        for (const [name, def] of Object.entries(this.doc.defs)) {
            if (def instanceof GradientNode) {
                this.defs += this.renderGradient(def, name) + '\n';
            } else if (def instanceof FilterNode) {
                this.defs += this.renderFilter(def, name) + '\n';
            }
        }
    }

    renderGradient(grad, id) {
        const tag = grad.gradientType === 'radial' ? 'radialGradient' : 'linearGradient';
        let attrs = `id="${id}"`;
        if (grad.properties.angle) {
            const angle = this.extractValue(grad.properties.angle);
            attrs += ` gradientTransform="rotate(${angle})"`;
        }
        
        let stops = '';
        for (const stop of grad.stops) {
            const offset = stop.offset ? this.extractValue(stop.offset) : '0%';
            const color = stop.color ? this.extractValue(stop.color) : '#000';
            const opacity = stop.opacity ? this.extractValue(stop.opacity) : '1';
            stops += `      <stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>\n`;
        }
        
        return `    <${tag} ${attrs}>\n${stops}    </${tag}>`;
    }

    renderFilter(filter, id) {
        let content = '';
        switch (filter.filterType) {
            case 'blur':
                const blurAmount = filter.properties.amount ? this.extractValue(filter.properties.amount) : '5';
                content = `      <feGaussianBlur stdDeviation="${blurAmount}"/>\n`;
                break;
            case 'glow':
                const glowColor = filter.properties.color ? this.extractValue(filter.properties.color) : '#fff';
                const glowRadius = filter.properties.radius ? this.extractValue(filter.properties.radius) : '10';
                content = `      <feGaussianBlur stdDeviation="${glowRadius}" result="blur"/>\n      <feFlood flood-color="${glowColor}" flood-opacity="1" result="color"/>\n      <feComposite in="color" in2="blur" operator="in" result="glow"/>\n      <feMerge>\n        <feMergeNode in="glow"/>\n        <feMergeNode in="SourceGraphic"/>\n      </feMerge>\n`;
                break;
            case 'shadow':
                const sx = filter.properties.x ? this.extractValue(filter.properties.x) : '3';
                const sy = filter.properties.y ? this.extractValue(filter.properties.y) : '3';
                const sblur = filter.properties.blur ? this.extractValue(filter.properties.blur) : '5';
                const scolor = filter.properties.color ? this.extractValue(filter.properties.color) : '#00000088';
                content = `      <feDropShadow dx="${sx}" dy="${sy}" stdDeviation="${sblur}" flood-color="${scolor}"/>\n`;
                break;
        }
        return `    <filter id="${id}">\n${content}    </filter>`;
    }

    renderShape(shape, indent = '  ') {
        let result = '';
        const props = shape.properties;
        let tag = 'g';
        let attrs = '';
        
        // Apply transforms
        if (props.transform || props.translate || props.rotate || props.scale) {
            let transform = '';
            if (props.translate) transform += ` translate(${this.extractValue(props.translate)})`;
            if (props.rotate) transform += ` rotate(${this.extractValue(props.rotate)})`;
            if (props.scale) transform += ` scale(${this.extractValue(props.scale)})`;
            if (props.transform) transform += ` ${this.extractValue(props.transform)}`;
            attrs += ` transform="${transform.trim()}"`;
        }
        
        // Opacity
        if (props.opacity) {
            attrs += ` opacity="${this.extractValue(props.opacity)}"`;
        }
        
        // Fill and stroke
        const fill = props.fill ? this.extractValue(props.fill) : null;
        const stroke = props.stroke ? this.extractValue(props.stroke) : null;
        const strokeWidth = props.stroke_width ? this.extractValue(props.stroke_width) : null;
        
        switch (shape.shapeType) {
            case 'rect':
                tag = 'rect';
                attrs += ` x="${props.x ? this.extractValue(props.x) : '0'}"`;
                attrs += ` y="${props.y ? this.extractValue(props.y) : '0'}"`;
                attrs += ` width="${props.width ? this.extractValue(props.width) : '100'}"`;
                attrs += ` height="${props.height ? this.extractValue(props.height) : '100'}"`;
                if (props.rx) attrs += ` rx="${this.extractValue(props.rx)}"`;
                if (props.ry) attrs += ` ry="${this.extractValue(props.ry)}"`;
                break;
                
            case 'circle':
                tag = 'circle';
                attrs += ` cx="${props.cx ? this.extractValue(props.cx) : '0'}"`;
                attrs += ` cy="${props.cy ? this.extractValue(props.cy) : '0'}"`;
                attrs += ` r="${props.r ? this.extractValue(props.r) : '50'}"`;
                break;
                
            case 'ellipse':
                tag = 'ellipse';
                attrs += ` cx="${props.cx ? this.extractValue(props.cx) : '0'}"`;
                attrs += ` cy="${props.cy ? this.extractValue(props.cy) : '0'}"`;
                attrs += ` rx="${props.rx ? this.extractValue(props.rx) : '50'}"`;
                attrs += ` ry="${props.ry ? this.extractValue(props.ry) : '30'}"`;
                break;
                
            case 'line':
                tag = 'line';
                attrs += ` x1="${props.x1 ? this.extractValue(props.x1) : '0'}"`;
                attrs += ` y1="${props.y1 ? this.extractValue(props.y1) : '0'}"`;
                attrs += ` x2="${props.x2 ? this.extractValue(props.x2) : '100'}"`;
                attrs += ` y2="${props.y2 ? this.extractValue(props.y2) : '100'}"`;
                break;
                
            case 'poly':
                tag = 'polygon';
                if (props.points) {
                    attrs += ` points="${this.extractValue(props.points)}"`;
                }
                break;
                
            case 'path':
                tag = 'path';
                if (props.path_data) {
                    const d = props.path_data.map(cmd => {
                        return cmd.command + (cmd.params ? cmd.params.join(' ') : '');
                    }).join(' ');
                    attrs += ` d="${d}"`;
                }
                break;
                
            case 'text':
                tag = 'text';
                attrs += ` x="${props.x ? this.extractValue(props.x) : '0'}"`;
                attrs += ` y="${props.y ? this.extractValue(props.y) : '0'}"`;
                if (props.font) attrs += ` font-family="${this.extractValue(props.font)}"`;
                if (props.font_size) attrs += ` font-size="${this.extractValue(props.font_size)}"`;
                result = `${indent}<${tag}${attrs}`;
                if (fill) attrs += ` fill="${fill}"`;
                const textContent = props.text ? this.extractValue(props.text) : '';
                result += `>${textContent}</${tag}>\n`;
                return result;
                
            case 'image':
                tag = 'image';
                attrs += ` href="${props.src ? this.extractValue(props.src) : ''}"`;
                attrs += ` x="${props.x ? this.extractValue(props.x) : '0'}"`;
                attrs += ` y="${props.y ? this.extractValue(props.y) : '0'}"`;
                attrs += ` width="${props.width ? this.extractValue(props.width) : '100'}"`;
                attrs += ` height="${props.height ? this.extractValue(props.height) : '100'}"`;
                break;
                
            case 'group':
            default:
                tag = 'g';
                break;
        }
        
        // Common attributes
        if (fill) attrs += ` fill="${fill}"`;
        else if (tag !== 'g' && tag !== 'line') attrs += ` fill="none"`;
        if (stroke) attrs += ` stroke="${stroke}"`;
        if (strokeWidth) attrs += ` stroke-width="${strokeWidth}"`;
        
        // Filter reference
        if (props.filter) {
            attrs += ` filter="url(#${this.extractValue(props.filter)})"`;
        }
        
        if (shape.children.length === 0 && tag !== 'text') {
            result += `${indent}<${tag}${attrs}/>\n`;
        } else {
            result += `${indent}<${tag}${attrs}>\n`;
            for (const child of shape.children) {
                result += this.renderShape(child, indent + '  ');
            }
            result += `${indent}</${tag}>\n`;
        }
        
        return result;
    }

    extractValue(val) {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return String(val);
        if (val.type === 'number') return String(val.value);
        if (val.type === 'percent') return val.value + '%';
        if (val.type === 'string') return val.value;
        if (val.type === 'color') return val.value;
        if (val.type === 'identifier') return val.value;
        if (val.type === 'boolean') return val.value ? 'true' : 'false';
        return String(val.value || '');
    }
}


// ============================================================
// CANVAS RENDERER (for game engine output)
// ============================================================

class CanvasRenderer {
    constructor(doc) {
        this.doc = doc;
    }

    render(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
        for (const shape of this.doc.children) {
            this.renderShape(ctx, shape);
        }
    }

    renderShape(ctx, shape) {
        ctx.save();
        
        const props = shape.properties;
        
        // Opacity
        if (props.opacity) ctx.globalAlpha = parseFloat(props.opacity.value || props.opacity);
        
        // Transforms
        if (props.translate) {
            const [x, y] = String(props.translate.value || props.translate).split(/[\s,]+/).map(Number);
            ctx.translate(x || 0, y || 0);
        }
        if (props.rotate) {
            ctx.rotate(parseFloat(props.rotate.value || props.rotate) * Math.PI / 180);
        }
        if (props.scale) {
            const [sx, sy = sx] = String(props.scale.value || props.scale).split(/[\s,]+/).map(Number);
            ctx.scale(sx || 1, sy || 1);
        }
        
        // Fill and stroke
        if (props.fill && props.fill.value !== 'none') ctx.fillStyle = props.fill.value || props.fill;
        if (props.stroke) ctx.strokeStyle = props.stroke.value || props.stroke;
        if (props.stroke_width) ctx.lineWidth = parseFloat(props.stroke_width.value || props.stroke_width);
        
        switch (shape.shapeType) {
            case 'rect':
                const rx = parseFloat(props.x?.value || props.x || 0);
                const ry = parseFloat(props.y?.value || props.y || 0);
                const rw = parseFloat(props.width?.value || props.width || 100);
                const rh = parseFloat(props.height?.value || props.height || 100);
                if (props.fill && props.fill.value !== 'none') ctx.fillRect(rx, ry, rw, rh);
                if (props.stroke) ctx.strokeRect(rx, ry, rw, rh);
                break;
                
            case 'circle':
                ctx.beginPath();
                ctx.arc(
                    parseFloat(props.cx?.value || props.cx || 0),
                    parseFloat(props.cy?.value || props.cy || 0),
                    parseFloat(props.r?.value || props.r || 50),
                    0, Math.PI * 2
                );
                if (props.fill && props.fill.value !== 'none') ctx.fill();
                if (props.stroke) ctx.stroke();
                break;
                
            case 'path':
                if (props.path_data) {
                    ctx.beginPath();
                    let cx = 0, cy = 0;
                    for (const cmd of props.path_data) {
                        const params = (cmd.params || []).map(Number);
                        switch (cmd.command.toUpperCase()) {
                            case 'M':
                                cx = params[0]; cy = params[1];
                                ctx.moveTo(cx, cy);
                                break;
                            case 'L':
                                cx = params[0]; cy = params[1];
                                ctx.lineTo(cx, cy);
                                break;
                            case 'C':
                                ctx.bezierCurveTo(params[0], params[1], params[2], params[3], params[4], params[5]);
                                cx = params[4]; cy = params[5];
                                break;
                            case 'Q':
                                ctx.quadraticCurveTo(params[0], params[1], params[2], params[3]);
                                cx = params[2]; cy = params[3];
                                break;
                            case 'Z':
                                ctx.closePath();
                                break;
                        }
                    }
                    if (props.fill && props.fill.value !== 'none') ctx.fill();
                    if (props.stroke) ctx.stroke();
                }
                break;
        }
        
        // Render children
        for (const child of shape.children) {
            this.renderShape(ctx, child);
        }
        
        ctx.restore();
    }
}


// ============================================================
// PUBLIC API
// ============================================================

function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
}

function renderSVG(source, width = 800, height = 600) {
    const doc = parse(source);
    const renderer = new SVGRenderer(doc);
    return renderer.render(width, height);
}

function renderCanvas(source, canvas, width, height) {
    const doc = parse(source);
    const ctx = canvas.getContext('2d');
    const renderer = new CanvasRenderer(doc);
    renderer.render(ctx, width || canvas.width, height || canvas.height);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parse, renderSVG, renderCanvas, Lexer, Parser, SVGRenderer, CanvasRenderer };
} else {
    window.ChrxStyle = { parse, renderSVG, renderCanvas };
}
