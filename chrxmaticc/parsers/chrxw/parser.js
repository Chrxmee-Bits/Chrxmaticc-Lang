/**
 * ChrxWeb Parser - UI Definition Language
 * 
 * Defines: layout, panel, button, text, input, grid, slider, 
 *          toggle, dropdown, modal, tooltip, tabs, scroll, image,
 *          video, canvas, spacer, divider
 * 
 * Features:
 *   - Component-based UI with nesting
 *   - Data binding with live updates
 *   - Responsive sizing (px, %, vw, vh, auto)
 *   - Flexbox and grid layouts
 *   - Event system (click, hover, change, etc.)
 *   - Style references to .chrxs files
 *   - Template slots for reusable components
 *   - State management per component
 *   - Transitions between UI states
 */

// ============================================================
// TOKENIZER
// ============================================================

const TokenType = {
    // Keywords
    LAYOUT: 'LAYOUT',
    PANEL: 'PANEL',
    BUTTON: 'BUTTON',
    TEXT: 'TEXT',
    INPUT: 'INPUT',
    GRID: 'GRID',
    SLIDER: 'SLIDER',
    TOGGLE: 'TOGGLE',
    DROPDOWN: 'DROPDOWN',
    MODAL: 'MODAL',
    TOOLTIP: 'TOOLTIP',
    TABS: 'TABS',
    SCROLL: 'SCROLL',
    IMAGE: 'IMAGE',
    VIDEO: 'VIDEO',
    CANVAS: 'CANVAS',
    SPACER: 'SPACER',
    DIVIDER: 'DIVIDER',
    TEMPLATE: 'TEMPLATE',
    SLOT: 'SLOT',
    COMPONENT: 'COMPONENT',
    
    // Properties
    BIND: 'BIND',
    STYLE: 'STYLE',
    STATE: 'STATE',
    ANIMATE: 'ANIMATE',
    ON: 'ON',
    SHOW: 'SHOW',
    HIDE: 'HIDE',
    TRANSITION: 'TRANSITION',
    
    // Values
    IDENTIFIER: 'IDENTIFIER',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    COLOR: 'COLOR',
    BOOLEAN: 'BOOLEAN',
    SIZE: 'SIZE',      // 100px, 50%, 10vw, auto
    POSITION: 'POSITION', // center, top_left, etc.
    
    // Layout
    DIRECTION: 'DIRECTION',   // row, column, row_reverse, column_reverse
    ALIGN: 'ALIGN',           // start, center, end, stretch, between, around
    JUSTIFY: 'JUSTIFY',
    WRAP: 'WRAP',
    GAP: 'GAP',
    PADDING: 'PADDING',
    MARGIN: 'MARGIN',
    
    // Delimiters
    COLON: 'COLON',
    COMMA: 'COMMA',
    LBRACE: 'LBRACE',
    RBRACE: 'RBRACE',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    LBRACKET: 'LBRACKET',
    RBRACKET: 'RBRACKET',
    ARROW: 'ARROW',
    DOT: 'DOT',
    
    // Special
    NEWLINE: 'NEWLINE',
    EOF: 'EOF',
};

const KEYWORDS = {
    'layout': TokenType.LAYOUT,
    'panel': TokenType.PANEL,
    'button': TokenType.BUTTON,
    'text': TokenType.TEXT,
    'input': TokenType.INPUT,
    'grid': TokenType.GRID,
    'slider': TokenType.SLIDER,
    'toggle': TokenType.TOGGLE,
    'dropdown': TokenType.DROPDOWN,
    'modal': TokenType.MODAL,
    'tooltip': TokenType.TOOLTIP,
    'tabs': TokenType.TABS,
    'scroll': TokenType.SCROLL,
    'image': TokenType.IMAGE,
    'video': TokenType.VIDEO,
    'canvas': TokenType.CANVAS,
    'spacer': TokenType.SPACER,
    'divider': TokenType.DIVIDER,
    'template': TokenType.TEMPLATE,
    'slot': TokenType.SLOT,
    'component': TokenType.COMPONENT,
    'bind': TokenType.BIND,
    'style': TokenType.STYLE,
    'state': TokenType.STATE,
    'animate': TokenType.ANIMATE,
    'on': TokenType.ON,
    'show': TokenType.SHOW,
    'hide': TokenType.HIDE,
    'transition': TokenType.TRANSITION,
    'row': TokenType.DIRECTION,
    'column': TokenType.DIRECTION,
    'center': TokenType.ALIGN,
    'start': TokenType.ALIGN,
    'end': TokenType.ALIGN,
    'stretch': TokenType.ALIGN,
    'between': TokenType.ALIGN,
    'around': TokenType.ALIGN,
    'wrap': TokenType.WRAP,
    'gap': TokenType.GAP,
    'padding': TokenType.PADDING,
    'margin': TokenType.MARGIN,
    'true': TokenType.BOOLEAN,
    'false': TokenType.BOOLEAN,
    'top_left': TokenType.POSITION,
    'top_center': TokenType.POSITION,
    'top_right': TokenType.POSITION,
    'center_left': TokenType.POSITION,
    'center_right': TokenType.POSITION,
    'bottom_left': TokenType.POSITION,
    'bottom_center': TokenType.POSITION,
    'bottom_right': TokenType.POSITION,
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
        this.tokens.push(new Token(TokenType.EOF, '', this.line, this.col));
        return this.tokens;
    }

    isAtEnd() { return this.pos >= this.source.length; }

    advance() {
        this.col++;
        return this.source[this.pos++];
    }

    peek(offset = 0) {
        const idx = this.pos + offset;
        return idx < this.source.length ? this.source[idx] : '\0';
    }

    match(expected) {
        if (this.isAtEnd() || this.source[this.pos] !== expected) return false;
        this.pos++;
        this.col++;
        return true;
    }

    addToken(type, literal = null) {
        const lexeme = this.source.substring(this.start, this.pos);
        this.tokens.push(new Token(type, lexeme, this.line, this.col, literal));
    }

    scanToken() {
        const c = this.advance();

        switch (c) {
            case ':': return this.addToken(TokenType.COLON);
            case ',': return this.addToken(TokenType.COMMA);
            case '{': return this.addToken(TokenType.LBRACE);
            case '}': return this.addToken(TokenType.RBRACE);
            case '(': return this.addToken(TokenType.LPAREN);
            case ')': return this.addToken(TokenType.RPAREN);
            case '[': return this.addToken(TokenType.LBRACKET);
            case ']': return this.addToken(TokenType.RBRACKET);
            case '.': return this.addToken(TokenType.DOT);
            
            case '-':
                if (this.match('>')) return this.addToken(TokenType.ARROW);
                if (this.match('-')) {
                    while (this.peek() !== '\n' && !this.isAtEnd()) this.advance();
                    return;
                }
                return this.addToken(TokenType.MINUS);
            
            case ' ':
            case '\r':
            case '\t':
                return;
            
            case '\n':
                this.line++;
                this.col = 1;
                return this.addToken(TokenType.NEWLINE);
            
            case '#':
                while (/[0-9a-fA-F]/.test(this.peek())) this.advance();
                return this.addToken(TokenType.COLOR);
            
            case '"':
                return this.scanString();
            
            default:
                if (/[0-9]/.test(c)) return this.scanNumber();
                if (/[a-zA-Z_]/.test(c)) return this.scanIdentifier();
        }
    }

    scanString() {
        while (this.peek() !== '"' && !this.isAtEnd()) {
            if (this.peek() === '\n') { this.line++; this.col = 1; }
            if (this.peek() === '\\') this.advance();
            this.advance();
        }
        if (!this.isAtEnd()) this.advance();
        const value = this.source.substring(this.start + 1, this.pos - 1);
        this.addToken(TokenType.STRING, value);
    }

    scanNumber() {
        while (/[0-9]/.test(this.peek())) this.advance();
        if (this.peek() === '.' && /[0-9]/.test(this.peek(1))) {
            this.advance();
            while (/[0-9]/.test(this.peek())) this.advance();
        }
        // Check for size unit
        if (/[a-zA-Z%]/.test(this.peek())) {
            const unit = this.advance();
            if (unit === '%') {
                // It's a percentage size
            } else if (this.peek() === 'x' || this.peek() === 'p') {
                // px, em, vw, vh, etc.
                while (/[a-zA-Z%]/.test(this.peek())) this.advance();
            }
        }
        const value = parseFloat(this.source.substring(this.start, this.pos));
        this.addToken(TokenType.NUMBER, value);
    }

    scanIdentifier() {
        while (/[a-zA-Z0-9_-]/.test(this.peek())) this.advance();
        const text = this.source.substring(this.start, this.pos);
        const type = KEYWORDS[text] || TokenType.IDENTIFIER;
        let literal = null;
        if (type === TokenType.BOOLEAN) literal = text === 'true';
        this.addToken(type, literal);
    }
}


// ============================================================
// PARSER - Builds UI Component Tree
// ============================================================

class UIComponent {
    constructor(type, name = '') {
        this.type = type;
        this.name = name;
        this.children = [];
        this.properties = {};
        this.styles = [];
        this.bindings = {};       // Data bindings
        this.events = {};          // Event handlers
        this.states = {};          // Named states
        this.transitions = {};     // State transitions
        this.layout = {};          // Layout properties
        this.parent = null;
    }
}

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    parse() {
        const root = new UIComponent('root', 'root');
        
        while (!this.isAtEnd()) {
            while (this.match(TokenType.NEWLINE));
            if (this.isAtEnd()) break;
            
            const component = this.parseComponent();
            if (component) root.children.push(component);
        }
        
        return root;
    }

    isAtEnd() { return this.peek().type === TokenType.EOF; }
    peek() { return this.tokens[this.pos]; }
    advance() { return this.tokens[this.pos++]; }
    previous() { return this.tokens[this.pos - 1]; }

    match(...types) {
        for (const type of types) {
            if (this.peek().type === type) {
                this.pos++;
                return true;
            }
        }
        return false;
    }

    consume(type, errorMsg) {
        if (this.match(type)) return this.previous();
        throw new Error(`${errorMsg} at line ${this.peek().line}`);
    }

    parseComponent() {
        // Check for component type keywords
        const componentTypes = [
            TokenType.PANEL, TokenType.BUTTON, TokenType.TEXT, TokenType.INPUT,
            TokenType.GRID, TokenType.SLIDER, TokenType.TOGGLE, TokenType.DROPDOWN,
            TokenType.MODAL, TokenType.TOOLTIP, TokenType.TABS, TokenType.SCROLL,
            TokenType.IMAGE, TokenType.VIDEO, TokenType.CANVAS, TokenType.SPACER,
            TokenType.DIVIDER, TokenType.LAYOUT, TokenType.COMPONENT,
        ];

        let compType = 'element';
        for (const type of componentTypes) {
            if (this.match(type)) {
                compType = this.previous().lexeme;
                break;
            }
        }

        if (compType === 'element') {
            // Maybe it's a named instance
            if (this.match(TokenType.IDENTIFIER)) {
                const name = this.previous().lexeme;
                if (this.match(TokenType.LBRACE)) {
                    return this.parseComponentBody(new UIComponent('component', name));
                }
            }
            return null;
        }

        // Get name
        let name = '';
        if (this.match(TokenType.IDENTIFIER)) {
            name = this.previous().lexeme;
        }

        const component = new UIComponent(compType, name);

        if (this.match(TokenType.LBRACE)) {
            return this.parseComponentBody(component);
        }

        return component;
    }

    parseComponentBody(component) {
        while (!this.match(TokenType.RBRACE) && !this.isAtEnd()) {
            while (this.match(TokenType.NEWLINE));

            if (this.check(TokenType.RBRACE) || this.isAtEnd()) break;

            // Property assignment
            if (this.match(TokenType.IDENTIFIER)) {
                const propName = this.previous().lexeme;
                
                if (this.match(TokenType.COLON)) {
                    const value = this.parseValue();
                    this.setProperty(component, propName, value);
                } else if (this.match(TokenType.LBRACE)) {
                    // Nested block (layout, style, state, etc.)
                    this.parseNamedBlock(component, propName);
                }
                continue;
            }

            // Event handlers: on click, on hover, etc.
            if (this.match(TokenType.ON)) {
                const event = this.consume(TokenType.IDENTIFIER, 'Expected event name');
                if (this.match(TokenType.LBRACE)) {
                    component.events[event.lexeme] = this.parseBlock();
                }
                continue;
            }

            // Bind directive
            if (this.match(TokenType.BIND)) {
                const binding = this.consume(TokenType.IDENTIFIER, 'Expected binding target');
                component.bindings[binding.lexeme] = true;
                if (this.match(TokenType.COLON)) {
                    component.bindings[binding.lexeme] = this.parseValue();
                }
                continue;
            }

            // Style reference
            if (this.match(TokenType.STYLE)) {
                if (this.match(TokenType.COLON)) {
                    const styleRef = this.consume(TokenType.STRING, 'Expected style reference');
                    component.styles.push(styleRef.literal);
                }
                continue;
            }

            // Transition definition
            if (this.match(TokenType.TRANSITION)) {
                if (this.match(TokenType.LBRACE)) {
                    component.transitions = this.parseTransitionBlock();
                }
                continue;
            }

            // Child component
            const child = this.parseComponent();
            if (child) {
                child.parent = component;
                component.children.push(child);
            }
        }

        return component;
    }

    parseNamedBlock(component, name) {
        switch (name) {
            case 'layout':
                component.layout = this.parseLayoutBlock();
                break;
            case 'state':
                this.parseStateBlock(component);
                break;
            default:
                component.properties[name] = this.parseBlock();
        }
    }

    parseLayoutBlock() {
        const layout = {};
        
        while (!this.match(TokenType.RBRACE) && !this.isAtEnd()) {
            while (this.match(TokenType.NEWLINE));
            if (this.check(TokenType.RBRACE) || this.isAtEnd()) break;

            if (this.match(TokenType.IDENTIFIER)) {
                const key = this.previous().lexeme;
                this.consume(TokenType.COLON, 'Expected ":"');
                layout[key] = this.parseValue();
            }
        }
        
        return layout;
    }

    parseStateBlock(component) {
        while (!this.match(TokenType.RBRACE) && !this.isAtEnd()) {
            while (this.match(TokenType.NEWLINE));
            if (this.check(TokenType.RBRACE) || this.isAtEnd()) break;

            const stateName = this.consume(TokenType.IDENTIFIER, 'Expected state name');
            this.consume(TokenType.LBRACE, 'Expected "{"');
            
            const stateProps = {};
            while (!this.match(TokenType.RBRACE) && !this.isAtEnd()) {
                while (this.match(TokenType.NEWLINE));
                if (this.check(TokenType.RBRACE) || this.isAtEnd()) break;
                
                if (this.match(TokenType.IDENTIFIER)) {
                    const key = this.previous().lexeme;
                    this.consume(TokenType.COLON, 'Expected ":"');
                    stateProps[key] = this.parseValue();
                }
            }
            
            component.states[stateName.lexeme] = stateProps;
        }
    }

    parseTransitionBlock() {
        const transitions = {};
        
        while (!this.match(TokenType.RBRACE) && !this.isAtEnd()) {
            while (this.match(TokenType.NEWLINE));
            if (this.check(TokenType.RBRACE) || this.isAtEnd()) break;

            if (this.match(TokenType.IDENTIFIER)) {
                const key = this.previous().lexeme;
                this.consume(TokenType.COLON, 'Expected ":"');
                
                if (this.match(TokenType.LBRACE)) {
                    const transProps = {};
                    while (!this.match(TokenType.RBRACE)) {
                        while (this.match(TokenType.NEWLINE));
                        if (this.check(TokenType.RBRACE)) break;
                        
                        if (this.match(TokenType.IDENTIFIER)) {
                            const tKey = this.previous().lexeme;
                            this.consume(TokenType.COLON, 'Expected ":"');
                            transProps[tKey] = this.parseValue();
                        }
                    }
                    transitions[key] = transProps;
                }
            }
        }
        
        return transitions;
    }

    parseBlock() {
        const items = [];
        
        while (!this.match(TokenType.RBRACE) && !this.isAtEnd()) {
            while (this.match(TokenType.NEWLINE));
            if (this.check(TokenType.RBRACE) || this.isAtEnd()) break;
            
            if (this.match(TokenType.STRING)) {
                items.push(this.previous().literal);
            } else if (this.match(TokenType.NUMBER)) {
                items.push(this.previous().literal);
            } else if (this.match(TokenType.IDENTIFIER)) {
                items.push(this.previous().lexeme);
            } else {
                this.advance(); // Skip
            }
        }
        
        return items.length === 1 ? items[0] : items;
    }

    parseValue() {
        if (this.match(TokenType.STRING)) return this.previous().literal;
        if (this.match(TokenType.NUMBER)) return this.previous().literal;
        if (this.match(TokenType.BOOLEAN)) return this.previous().literal;
        if (this.match(TokenType.COLOR)) return this.previous().lexeme;
        if (this.match(TokenType.IDENTIFIER)) return this.previous().lexeme;
        if (this.match(TokenType.LBRACKET)) {
            const items = [];
            while (!this.match(TokenType.RBRACKET) && !this.isAtEnd()) {
                items.push(this.parseValue());
                this.match(TokenType.COMMA);
            }
            return items;
        }
        return null;
    }

    setProperty(component, name, value) {
        switch (name) {
            case 'width':
            case 'height':
            case 'min_width':
            case 'min_height':
            case 'max_width':
            case 'max_height':
                component.layout[name] = value;
                break;
            case 'position':
                component.layout[name] = value;
                break;
            case 'visible':
                component.properties[name] = value;
                break;
            case 'text':
            case 'placeholder':
            case 'src':
            case 'alt':
            case 'href':
            case 'value':
            case 'font':
            case 'font_size':
            case 'color':
            case 'background':
                component.properties[name] = value;
                break;
            default:
                component.properties[name] = value;
        }
    }

    check(type) {
        return this.peek().type === type;
    }
}


// ============================================================
// BUILDER - Converts component tree to DOM/Game UI
// ============================================================

class UIBuilder {
    /**
     * Build actual UI elements from the component tree.
     * @param {UIComponent} root - Parsed component tree
     * @param {HTMLElement} container - Target DOM container (null for game engine)
     * @param {object} dataContext - Data for bindings
     */
    constructor(root, container = null, dataContext = {}) {
        this.root = root;
        this.container = container || document.body;
        this.dataContext = dataContext;
        this.elementMap = new Map();  // component name -> DOM element
        this.styleResolver = null;    // .chrxs style resolver (future)
    }

    build() {
        this.container.innerHTML = '';
        for (const child of this.root.children) {
            const element = this.buildComponent(child);
            if (element) this.container.appendChild(element);
        }
    }

    buildComponent(component) {
        let element = null;

        switch (component.type) {
            case 'panel':
                element = this.buildPanel(component);
                break;
            case 'button':
                element = this.buildButton(component);
                break;
            case 'text':
                element = this.buildText(component);
                break;
            case 'input':
                element = this.buildInput(component);
                break;
            case 'image':
                element = this.buildImage(component);
                break;
            case 'grid':
                element = this.buildGrid(component);
                break;
            case 'slider':
                element = this.buildSlider(component);
                break;
            case 'toggle':
                element = this.buildToggle(component);
                break;
            case 'dropdown':
                element = this.buildDropdown(component);
                break;
            case 'modal':
                element = this.buildModal(component);
                break;
            case 'tabs':
                element = this.buildTabs(component);
                break;
            case 'scroll':
                element = this.buildScroll(component);
                break;
            case 'spacer':
                element = this.buildSpacer(component);
                break;
            case 'divider':
                element = this.buildDivider(component);
                break;
            case 'video':
                element = this.buildVideo(component);
                break;
            case 'canvas':
                element = this.buildCanvas(component);
                break;
            case 'layout':
                element = this.buildLayout(component);
                break;
            default:
                element = document.createElement('div');
        }

        if (element && component.name) {
            element.setAttribute('data-chrxw-name', component.name);
            this.elementMap.set(component.name, element);
        }

        // Apply layout
        if (element) {
            this.applyLayout(element, component.layout);
            this.applyProperties(element, component.properties);
            this.applyEvents(element, component.events);
            this.applyBindings(element, component.bindings);
        }

        // Build children
        if (element) {
            for (const child of component.children) {
                const childEl = this.buildComponent(child);
                if (childEl) element.appendChild(childEl);
            }
        }

        return element;
    }

    buildPanel(comp) {
        const el = document.createElement('div');
        el.style.display = 'flex';
        return el;
    }

    buildButton(comp) {
        const el = document.createElement('button');
        el.textContent = comp.properties.text || comp.name || '';
        return el;
    }

    buildText(comp) {
        const el = document.createElement('span');
        el.textContent = comp.properties.text || '';
        return el;
    }

    buildInput(comp) {
        const el = document.createElement('input');
        el.placeholder = comp.properties.placeholder || '';
        if (comp.properties.value) el.value = comp.properties.value;
        return el;
    }

    buildImage(comp) {
        const el = document.createElement('img');
        el.src = comp.properties.src || '';
        el.alt = comp.properties.alt || '';
        return el;
    }

    buildGrid(comp) {
        const el = document.createElement('div');
        el.style.display = 'grid';
        return el;
    }

    buildSlider(comp) {
        const el = document.createElement('input');
        el.type = 'range';
        if (comp.properties.min) el.min = comp.properties.min;
        if (comp.properties.max) el.max = comp.properties.max;
        if (comp.properties.value) el.value = comp.properties.value;
        return el;
    }

    buildToggle(comp) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        if (comp.properties.checked) checkbox.checked = true;
        label.appendChild(checkbox);
        if (comp.properties.text) {
            label.appendChild(document.createTextNode(' ' + comp.properties.text));
        }
        return label;
    }

    buildDropdown(comp) {
        const el = document.createElement('select');
        if (comp.properties.options) {
            for (const opt of comp.properties.options) {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                el.appendChild(option);
            }
        }
        return el;
    }

    buildModal(comp) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;
        `;
        const content = document.createElement('div');
        content.style.cssText = 'background: white; border-radius: 8px; padding: 24px; min-width: 300px;';
        overlay.appendChild(content);
        
        // Children go into content div
        for (const child of comp.children) {
            const childEl = this.buildComponent(child);
            if (childEl) content.appendChild(childEl);
        }
        
        if (comp.properties.visible === false) overlay.style.display = 'none';
        
        return overlay;
    }

    buildTabs(comp) {
        const container = document.createElement('div');
        const tabHeader = document.createElement('div');
        tabHeader.style.display = 'flex';
        tabHeader.style.gap = '4px';
        
        const tabContent = document.createElement('div');
        
        // Tab items are children
        const tabs = comp.children.filter(c => c.type === 'panel' || c.type === 'component');
        tabs.forEach((tab, i) => {
            const btn = document.createElement('button');
            btn.textContent = tab.properties.label || `Tab ${i + 1}`;
            btn.addEventListener('click', () => {
                tabContent.innerHTML = '';
                const tabEl = this.buildComponent(tab);
                if (tabEl) tabContent.appendChild(tabEl);
                // Highlight active tab
                tabHeader.querySelectorAll('button').forEach(b => b.style.fontWeight = 'normal');
                btn.style.fontWeight = 'bold';
            });
            tabHeader.appendChild(btn);
        });
        
        container.appendChild(tabHeader);
        container.appendChild(tabContent);
        
        // Activate first tab
        if (tabs.length > 0) {
            tabHeader.querySelector('button').click();
        }
        
        return container;
    }

    buildScroll(comp) {
        const el = document.createElement('div');
        el.style.overflow = 'auto';
        return el;
    }

    buildSpacer(comp) {
        const el = document.createElement('div');
        el.style.flexGrow = '1';
        return el;
    }

    buildDivider(comp) {
        const el = document.createElement('hr');
        return el;
    }

    buildVideo(comp) {
        const el = document.createElement('video');
        el.src = comp.properties.src || '';
        if (comp.properties.controls !== false) el.controls = true;
        if (comp.properties.autoplay) el.autoplay = true;
        if (comp.properties.loop) el.loop = true;
        return el;
    }

    buildCanvas(comp) {
        const el = document.createElement('canvas');
        el.width = comp.properties.width || 400;
        el.height = comp.properties.height || 300;
        return el;
    }

    buildLayout(comp) {
        const el = document.createElement('div');
        el.style.display = 'flex';
        return el;
    }

    applyLayout(element, layout) {
        if (!layout) return;

        const styleMap = {
            width: 'width',
            height: 'height',
            min_width: 'minWidth',
            min_height: 'minHeight',
            max_width: 'maxWidth',
            max_height: 'maxHeight',
            direction: 'flexDirection',
            align: 'alignItems',
            justify: 'justifyContent',
            wrap: 'flexWrap',
            gap: 'gap',
            padding: 'padding',
            margin: 'margin',
        };

        for (const [key, value] of Object.entries(layout)) {
            const cssKey = styleMap[key] || key;
            element.style[cssKey] = this.formatSize(value);
        }
    }

    applyProperties(element, props) {
        if (!props) return;

        if (props.font) element.style.fontFamily = props.font;
        if (props.font_size) element.style.fontSize = this.formatSize(props.font_size);
        if (props.color) element.style.color = props.color;
        if (props.background) element.style.background = props.background;
        if (props.visible === false) element.style.display = 'none';
    }

    applyEvents(element, events) {
        for (const [eventName, handler] of Object.entries(events)) {
            element.addEventListener(eventName, (e) => {
                console.log(`[ChrxWeb] Event: ${eventName} on ${element.getAttribute('data-chrxw-name')}`);
                // Future: dispatch to ChrxMedium script
            });
        }
    }

    applyBindings(element, bindings) {
        if (!bindings) return;
        
        for (const [target, expression] of Object.entries(bindings)) {
            if (this.dataContext[target] !== undefined) {
                if (element.tagName === 'SPAN' || element.tagName === 'P') {
                    element.textContent = this.dataContext[target];
                } else if (element.tagName === 'INPUT') {
                    element.value = this.dataContext[target];
                }
            }
        }
    }

    formatSize(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return `${value}px`;
        return String(value);
    }

    getElement(name) {
        return this.elementMap.get(name);
    }

    updateBindings(dataContext) {
        this.dataContext = { ...this.dataContext, ...dataContext };
        for (const [name, element] of this.elementMap) {
            const component = this.findComponentByName(this.root, name);
            if (component) {
                this.applyBindings(element, component.bindings);
            }
        }
    }

    findComponentByName(component, name) {
        if (component.name === name) return component;
        for (const child of component.children) {
            const found = this.findComponentByName(child, name);
            if (found) return found;
        }
        return null;
    }
}


// ============================================================
// PUBLIC API
// ============================================================

/**
 * Parse a .chrxw source string into a UI component tree.
 */
function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
}

/**
 * Parse and build UI into a DOM container.
 */
function build(source, container, dataContext = {}) {
    const root = parse(source);
    const builder = new UIBuilder(root, container, dataContext);
    builder.build();
    return builder;
}

/**
 * Load a .chrxw file, parse, and build.
 */
async function load(path, container, dataContext = {}) {
    const response = await fetch(path);
    const source = await response.text();
    return build(source, container, dataContext);
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parse, build, load, Lexer, Parser, UIBuilder, UIComponent };
} else {
    window.ChrxWeb = { parse, build, load };
}
