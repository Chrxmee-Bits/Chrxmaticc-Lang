/*
 * parser.cpp - ChrxGame
 * C++ implementation for .chrxg files
 * 
 * Handles: scene, entity, spawn, camera, position, encounter, arena,
 *          level, quest, background, music, viewport, collision, patrol,
 *          trigger, pathfinding, physics, layers, tiles, terrain
 * 
 * Features:
 *   - Header-only for easy embedding in game engines
 *   - Zero-copy string views for fast parsing
 *   - Scene graph with transform hierarchy
 *   - Entity component system (ECS) ready
 *   - Hot-reload support with state preservation
 *   - Spatial partitioning for fast queries
 *   - Built-in physics integration points
 */

#pragma once

#include <string>
#include <string_view>
#include <vector>
#include <unordered_map>
#include <variant>
#include <memory>
#include <optional>
#include <functional>
#include <fstream>
#include <sstream>
#include <iostream>
#include <cmath>
#include <algorithm>
#include <chrono>
#include <filesystem>

namespace chrxg {

// ============================================================
// FORWARD DECLARATIONS
// ============================================================

struct Vec2;
struct Vec3;
struct Color;
struct Transform;
struct Entity;
struct Scene;
class Parser;
class Engine;

// ============================================================
// MATH TYPES
// ============================================================

struct Vec2 {
    float x = 0.0f, y = 0.0f;
    
    Vec2() = default;
    Vec2(float x, float y) : x(x), y(y) {}
    
    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator-(const Vec2& o) const { return {x - o.x, y - o.y}; }
    Vec2 operator*(float s) const { return {x * s, y * s}; }
    Vec2 operator/(float s) const { return {x / s, y / s}; }
    
    float length() const { return std::sqrt(x * x + y * y); }
    Vec2 normalized() const { 
        float len = length();
        return len > 0 ? Vec2{x / len, y / len} : Vec2{};
    }
    
    float dot(const Vec2& o) const { return x * o.x + y * o.y; }
    float cross(const Vec2& o) const { return x * o.y - y * o.x; }
    
    bool operator==(const Vec2& o) const { return x == o.x && y == o.y; }
    bool operator!=(const Vec2& o) const { return !(*this == o); }
};

struct Vec3 {
    float x = 0.0f, y = 0.0f, z = 0.0f;
    
    Vec3() = default;
    Vec3(float x, float y, float z) : x(x), y(y), z(z) {}
    Vec3(const Vec2& v, float z = 0.0f) : x(v.x), y(v.y), z(z) {}
    
    Vec2 xy() const { return {x, y}; }
    
    Vec3 operator+(const Vec3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    Vec3 operator-(const Vec3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    Vec3 operator*(float s) const { return {x * s, y * s, z * s}; }
    
    float length() const { return std::sqrt(x * x + y * y + z * z); }
    Vec3 normalized() const {
        float len = length();
        return len > 0 ? Vec3{x / len, y / len, z / len} : Vec3{};
    }
};

struct Color {
    float r = 1.0f, g = 1.0f, b = 1.0f, a = 1.0f;
    
    Color() = default;
    Color(float r, float g, float b, float a = 1.0f) : r(r), g(g), b(b), a(a) {}
    
    static Color from_hex(const std::string& hex) {
        if (hex.empty() || hex[0] != '#') return {};
        
        std::string h = hex.substr(1);
        if (h.length() == 3) {
            h = {h[0], h[0], h[1], h[1], h[2], h[2]};
        }
        
        if (h.length() < 6) return {};
        
        auto parse_byte = [](const std::string& s, size_t pos) -> float {
            try {
                return std::stoi(s.substr(pos, 2), nullptr, 16) / 255.0f;
            } catch (...) {
                return 0.0f;
            }
        };
        
        Color c;
        c.r = parse_byte(h, 0);
        c.g = parse_byte(h, 2);
        c.b = parse_byte(h, 4);
        c.a = h.length() >= 8 ? parse_byte(h, 6) : 1.0f;
        return c;
    }
    
    Color operator*(float s) const { return {r * s, g * s, b * s, a}; }
    Color operator+(const Color& o) const { return {r + o.r, g + o.g, b + o.b, a + o.a}; }
    
    Color lerp(const Color& o, float t) const {
        return {
            r + (o.r - r) * t,
            g + (o.g - g) * t,
            b + (o.b - b) * t,
            a + (o.a - a) * t
        };
    }
};

struct AABB {
    Vec2 min, max;
    
    AABB() = default;
    AABB(const Vec2& min, const Vec2& max) : min(min), max(max) {}
    
    bool contains(const Vec2& point) const {
        return point.x >= min.x && point.x <= max.x &&
               point.y >= min.y && point.y <= max.y;
    }
    
    bool overlaps(const AABB& other) const {
        return !(max.x < other.min.x || min.x > other.max.x ||
                 max.y < other.min.y || min.y > other.max.y);
    }
    
    Vec2 center() const { return {(min.x + max.x) * 0.5f, (min.y + max.y) * 0.5f}; }
    Vec2 size() const { return {max.x - min.x, max.y - min.y}; }
};

// ============================================================
// TRANSFORM HIERARCHY
// ============================================================

struct Transform {
    Vec3 position;
    Vec3 rotation;   // Euler angles in degrees
    Vec3 scale{1.0f, 1.0f, 1.0f};
    
    Transform* parent = nullptr;
    std::vector<std::unique_ptr<Transform>> children;
    
    Vec3 get_world_position() const {
        if (parent) {
            return parent->get_world_position() + position;
        }
        return position;
    }
    
    void add_child(std::unique_ptr<Transform> child) {
        child->parent = this;
        children.push_back(std::move(child));
    }
};

// ============================================================
// TOKEN TYPES
// ============================================================

enum class TokenType {
    // Keywords
    SCENE, ENTITY, SPAWN, CAMERA, POSITION, ROTATION, SCALE,
    ENCOUNTER, ARENA, LEVEL, QUEST, BACKGROUND, MUSIC,
    VIEWPORT, COLLISION, PATROL, TRIGGER, PATHFINDING,
    PHYSICS, LAYER, TILE, TERRAIN, PREFAB, TEMPLATE,
    BOUNDS, VELOCITY, MASS, FRICTION, BOUNCE,
    ON_START, ON_UPDATE, ON_COLLISION, ON_TRIGGER,
    
    // Values
    IDENTIFIER, NUMBER, STRING, BOOLEAN, COLOR_HEX,
    
    // Operators
    EQUALS, COLON, COMMA, DOT, ARROW,
    PLUS, MINUS, STAR, SLASH,
    
    // Delimiters
    LPAREN, RPAREN, LBRACK, RBRACK, LBRACE, RBRACE,
    NEWLINE, INDENT, DEDENT,
    
    // Special
    END_OF_FILE, UNKNOWN
};

struct Token {
    TokenType type;
    std::string_view lexeme;
    size_t line, column;
    
    float number_value = 0.0f;
    bool bool_value = false;
    
    Token(TokenType t, std::string_view lex, size_t ln, size_t col)
        : type(t), lexeme(lex), line(ln), column(col) {}
};

// ============================================================
// LEXER
// ============================================================

class Lexer {
public:
    explicit Lexer(std::string_view source) 
        : source_(source), pos_(0), line_(1), col_(1) {}
    
    std::vector<Token> tokenize() {
        std::vector<Token> tokens;
        while (!is_at_end()) {
            start_ = pos_;
            auto token = scan_token();
            if (token.type != TokenType::NEWLINE && token.type != TokenType::UNKNOWN) {
                tokens.push_back(std::move(token));
            } else if (token.type == TokenType::NEWLINE) {
                // Only keep significant newlines
                if (!tokens.empty() && tokens.back().type != TokenType::NEWLINE) {
                    tokens.push_back(std::move(token));
                }
            }
        }
        tokens.push_back(Token(TokenType::END_OF_FILE, "", line_, col_));
        return tokens;
    }

private:
    std::string_view source_;
    size_t start_, pos_;
    size_t line_, col_;
    
    static const std::unordered_map<std::string_view, TokenType> keywords_;
    
    bool is_at_end() const { return pos_ >= source_.size(); }
    
    char advance() {
        col_++;
        return source_[pos_++];
    }
    
    char peek(size_t offset = 0) const {
        size_t idx = pos_ + offset;
        return idx < source_.size() ? source_[idx] : '\0';
    }
    
    bool match(char expected) {
        if (is_at_end() || source_[pos_] != expected) return false;
        pos_++;
        col_++;
        return true;
    }
    
    void skip_whitespace() {
        while (!is_at_end()) {
            char c = peek();
            if (c == ' ' || c == '\t' || c == '\r') {
                advance();
            } else if (c == '-' && peek(1) == '-') {
                // Comment
                while (!is_at_end() && peek() != '\n') advance();
            } else {
                break;
            }
        }
    }
    
    Token make_token(TokenType type, float num = 0.0f, bool b = false) {
        std::string_view lex = source_.substr(start_, pos_ - start_);
        Token t(type, lex, line_, col_);
        t.number_value = num;
        t.bool_value = b;
        return t;
    }
    
    Token scan_token() {
        skip_whitespace();
        if (is_at_end()) return make_token(TokenType::END_OF_FILE);
        
        start_ = pos_;
        char c = advance();
        
        // Single characters
        switch (c) {
            case '\n': line_++; col_ = 1; return make_token(TokenType::NEWLINE);
            case ':': return make_token(TokenType::COLON);
            case ',': return make_token(TokenType::COMMA);
            case '.': return make_token(TokenType.DOT);
            case '(': return make_token(TokenType::LPAREN);
            case ')': return make_token(TokenType::RPAREN);
            case '[': return make_token(TokenType::LBRACK);
            case ']': return make_token(TokenType::RBRACK);
            case '{': return make_token(TokenType::LBRACE);
            case '}': return make_token(TokenType::RBRACE);
            case '+': return make_token(TokenType::PLUS);
            case '*': return make_token(TokenType::STAR);
            case '/': return make_token(TokenType::SLASH);
            case '=': 
                if (match('>')) return make_token(TokenType::ARROW);
                return make_token(TokenType::EQUALS);
            case '-':
                if (match('>')) return make_token(TokenType::ARROW);
                return make_token(TokenType::MINUS);
            case '#':
                return scan_color();
            case '"':
                return scan_string();
        }
        
        // Numbers
        if (std::isdigit(c) || (c == '-' && std::isdigit(peek()))) {
            return scan_number();
        }
        
        // Identifiers
        if (std::isalpha(c) || c == '_') {
            return scan_identifier();
        }
        
        return make_token(TokenType::UNKNOWN);
    }
    
    Token scan_string() {
        while (!is_at_end() && peek() != '"') {
            if (peek() == '\n') { line_++; col_ = 1; }
            if (peek() == '\\') advance(); // Skip escape chars
            advance();
        }
        if (!is_at_end()) advance(); // Closing quote
        return make_token(TokenType::STRING);
    }
    
    Token scan_number() {
        while (!is_at_end() && (std::isdigit(peek()) || peek() == '.')) {
            advance();
        }
        float value = 0.0f;
        try {
            std::string num_str(source_.substr(start_, pos_ - start_));
            value = std::stof(num_str);
        } catch (...) {}
        return make_token(TokenType::NUMBER, value);
    }
    
    Token scan_color() {
        while (!is_at_end() && (std::isxdigit(peek()) || std::isalpha(peek()))) {
            advance();
        }
        return make_token(TokenType::COLOR_HEX);
    }
    
    Token scan_identifier() {
        while (!is_at_end() && (std::isalnum(peek()) || peek() == '_')) {
            advance();
        }
        std::string_view lex = source_.substr(start_, pos_ - start_);
        
        auto it = keywords_.find(lex);
        if (it != keywords_.end()) {
            return make_token(it->second);
        }
        
        // Check for booleans
        if (lex == "true") return make_token(TokenType::BOOLEAN, 0.0f, true);
        if (lex == "false") return make_token(TokenType::BOOLEAN, 0.0f, false);
        
        return make_token(TokenType::IDENTIFIER);
    }
};

const std::unordered_map<std::string_view, TokenType> Lexer::keywords_ = {
    {"scene", TokenType::SCENE},
    {"entity", TokenType::ENTITY},
    {"spawn", TokenType::SPAWN},
    {"camera", TokenType::CAMERA},
    {"position", TokenType::POSITION},
    {"rotation", TokenType::ROTATION},
    {"scale", TokenType::SCALE},
    {"encounter", TokenType::ENCOUNTER},
    {"arena", TokenType::ARENA},
    {"level", TokenType::LEVEL},
    {"quest", TokenType::QUEST},
    {"background", TokenType::BACKGROUND},
    {"music", TokenType::MUSIC},
    {"viewport", TokenType::VIEWPORT},
    {"collision", TokenType::COLLISION},
    {"patrol", TokenType::PATROL},
    {"trigger", TokenType::TRIGGER},
    {"pathfinding", TokenType::PATHFINDING},
    {"physics", TokenType::PHYSICS},
    {"layer", TokenType::LAYER},
    {"tile", TokenType::TILE},
    {"terrain", TokenType::TERRAIN},
    {"prefab", TokenType::PREFAB},
    {"template", TokenType::TEMPLATE},
    {"bounds", TokenType::BOUNDS},
    {"velocity", TokenType::VELOCITY},
    {"mass", TokenType::MASS},
    {"friction", TokenType::FRICTION},
    {"bounce", TokenType::BOUNCE},
    {"on_start", TokenType::ON_START},
    {"on_update", TokenType::ON_UPDATE},
    {"on_collision", TokenType::ON_COLLISION},
    {"on_trigger", TokenType::ON_TRIGGER},
};

// ============================================================
// SCENE GRAPH NODES
// ============================================================

struct Camera {
    Vec2 position;
    float zoom = 1.0f;
    float rotation = 0.0f;
    Vec2 viewport_size{800, 600};
    std::string target_entity;
    float smooth_speed = 5.0f;
    
    Vec2 world_to_screen(const Vec2& world_pos) const {
        Vec2 centered = world_pos - position;
        return centered * zoom + viewport_size * 0.5f;
    }
    
    Vec2 screen_to_world(const Vec2& screen_pos) const {
        Vec2 centered = screen_pos - viewport_size * 0.5f;
        return centered / zoom + position;
    }
};

struct CollisionShape {
    enum class Type { BOX, CIRCLE, POLYGON };
    
    Type type = Type::BOX;
    Vec2 size{32, 32};     // For box: width, height. For circle: radius x, radius y
    Vec2 offset;            // Offset from entity position
    std::vector<Vec2> vertices; // For polygon
    
    bool is_trigger = false;
    std::string layer = "default";
    
    AABB get_aabb(const Vec2& world_pos) const {
        Vec2 world_min = world_pos + offset - size * 0.5f;
        Vec2 world_max = world_pos + offset + size * 0.5f;
        return AABB(world_min, world_max);
    }
};

struct PhysicsBody {
    enum class Type { STATIC, DYNAMIC, KINEMATIC };
    
    Type type = Type::DYNAMIC;
    Vec2 velocity;
    Vec2 acceleration;
    float mass = 1.0f;
    float friction = 0.3f;
    float bounce = 0.0f;
    float gravity_scale = 1.0f;
    bool use_gravity = true;
};

struct PatrolPath {
    std::vector<Vec2> waypoints;
    float speed = 100.0f;
    float wait_time = 1.0f;
    bool loop = true;
    bool ping_pong = false;
};

struct EntityTemplate {
    std::string name;
    std::string sprite;
    Vec2 size{32, 32};
    std::vector<CollisionShape> collisions;
    PhysicsBody physics;
    std::optional<PatrolPath> patrol;
    std::unordered_map<std::string, std::string> properties;
};

struct Entity {
    std::string id;
    std::string name;
    std::string template_name;
    Vec2 position;
    float rotation = 0.0f;
    Vec2 scale{1.0f, 1.0f};
    std::string sprite;
    int layer = 0;
    bool visible = true;
    bool active = true;
    
    std::vector<CollisionShape> collisions;
    std::optional<PhysicsBody> physics;
    std::optional<PatrolPath> patrol;
    
    std::unordered_map<std::string, std::string> properties;
    
    // Runtime state (not serialized)
    size_t current_waypoint = 0;
    float waypoint_timer = 0.0f;
    bool moving_forward = true;
    
    AABB get_aabb() const {
        if (!collisions.empty()) {
            return collisions[0].get_aabb(position);
        }
        Vec2 half_size{16, 16};
        return AABB(position - half_size, position + half_size);
    }
    
    bool overlaps(const Entity& other) const {
        if (!active || !other.active) return false;
        if (!collisions.empty() && !other.collisions.empty()) {
            return collisions[0].get_aabb(position).overlaps(
                   other.collisions[0].get_aabb(other.position));
        }
        return get_aabb().overlaps(other.get_aabb());
    }
};

struct Tile {
    int id = 0;
    std::string texture;
    Vec2 position;
    bool solid = false;
    std::string layer = "ground";
    std::unordered_map<std::string, std::string> properties;
};

struct Tilemap {
    Vec2 tile_size{32, 32};
    Vec2 size; // In tiles
    std::vector<std::vector<Tile>> tiles;
    std::string tileset_texture;
    
    Tile* get_tile(int x, int y) {
        if (x >= 0 && x < size.x && y >= 0 && y < size.y) {
            return &tiles[y][x];
        }
        return nullptr;
    }
    
    std::vector<Tile*> get_tiles_in_rect(const AABB& rect) {
        std::vector<Tile*> result;
        int min_x = std::max(0, (int)(rect.min.x / tile_size.x));
        int min_y = std::max(0, (int)(rect.min.y / tile_size.y));
        int max_x = std::min((int)size.x - 1, (int)(rect.max.x / tile_size.x));
        int max_y = std::min((int)size.y - 1, (int)(rect.max.y / tile_size.y));
        
        for (int y = min_y; y <= max_y; y++) {
            for (int x = min_x; x <= max_x; x++) {
                result.push_back(&tiles[y][x]);
            }
        }
        return result;
    }
};

struct Quest {
    std::string id;
    std::string name;
    std::string description;
    std::string objective;
    int objective_needed = 0;
    int objective_current = 0;
    std::string reward;
    bool is_active = false;
    bool is_complete = false;
    std::vector<std::string> prerequisites;
    
    bool can_activate() const {
        // Checked against completed quests in scene
        return true;
    }
    
    float progress() const {
        if (objective_needed == 0) return 0.0f;
        return (float)objective_current / objective_needed;
    }
};

struct TriggerZone {
    std::string id;
    AABB bounds;
    std::string trigger_type; // "once", "repeat", "while_inside"
    std::string on_enter_event;
    std::string on_exit_event;
    bool triggered = false;
    std::vector<std::string> entities_inside;
};

struct Encounter {
    std::string id;
    std::vector<std::string> enemy_templates;
    AABB spawn_area;
    int enemy_count = 1;
    float spawn_delay = 1.0f;
    std::string trigger_entity;
    bool triggered = false;
    bool completed = false;
};

// ============================================================
// SCENE
// ============================================================

struct Scene {
    std::string name;
    std::string background_texture;
    Color background_color{0.1f, 0.1f, 0.2f, 1.0f};
    std::string music;
    float music_volume = 1.0f;
    
    Vec2 world_bounds_min;
    Vec2 world_bounds_max{800, 600};
    
    Camera camera;
    
    std::vector<std::unique_ptr<Entity>> entities;
    std::vector<Tilemap> tilemaps;
    std::vector<TriggerZone> triggers;
    std::vector<Encounter> encounters;
    std::vector<Quest> quests;
    std::vector<std::string> completed_quests;
    
    std::unordered_map<std::string, EntityTemplate> templates;
    std::unordered_map<std::string, Entity*> entity_map;
    
    // Spatial hash for fast queries
    float cell_size = 100.0f;
    std::unordered_map<int64_t, std::vector<Entity*>> spatial_hash;
    
    // Scene callbacks
    std::function<void()> on_start;
    std::function<void(float)> on_update;
    
    void add_entity(std::unique_ptr<Entity> entity) {
        Entity* ptr = entity.get();
        entities.push_back(std::move(entity));
        entity_map[ptr->id] = ptr;
        update_spatial_hash(ptr);
    }
    
    Entity* get_entity(const std::string& id) {
        auto it = entity_map.find(id);
        return it != entity_map.end() ? it->second : nullptr;
    }
    
    void remove_entity(const std::string& id) {
        auto it = entity_map.find(id);
        if (it != entity_map.end()) {
            it->second->active = false;
            // Mark for removal
        }
    }
    
    void update_spatial_hash(Entity* entity) {
        if (!entity->active) return;
        
        AABB bounds = entity->get_aabb();
        int min_cx = (int)(bounds.min.x / cell_size);
        int min_cy = (int)(bounds.min.y / cell_size);
        int max_cx = (int)(bounds.max.x / cell_size);
        int max_cy = (int)(bounds.max.y / cell_size);
        
        for (int cy = min_cy; cy <= max_cy; cy++) {
            for (int cx = min_cx; cx <= max_cx; cx++) {
                int64_t key = ((int64_t)cx << 32) | (uint32_t)cy;
                spatial_hash[key].push_back(entity);
            }
        }
    }
    
    std::vector<Entity*> query_entities_in_range(const Vec2& position, float radius) {
        std::vector<Entity*> result;
        
        int min_cx = (int)((position.x - radius) / cell_size);
        int min_cy = (int)((position.y - radius) / cell_size);
        int max_cx = (int)((position.x + radius) / cell_size);
        int max_cy = (int)((position.y + radius) / cell_size);
        
        for (int cy = min_cy; cy <= max_cy; cy++) {
            for (int cx = min_cx; cx <= max_cx; cx++) {
                int64_t key = ((int64_t)cx << 32) | (uint32_t)cy;
                auto it = spatial_hash.find(key);
                if (it != spatial_hash.end()) {
                    for (auto* entity : it->second) {
                        if (entity->active) {
                            Vec2 delta = entity->position - position;
                            if (delta.length() <= radius) {
                                result.push_back(entity);
                            }
                        }
                    }
                }
            }
        }
        
        return result;
    }
    
    void update(float dt) {
        // Update physics
        for (auto& entity : entities) {
            if (!entity->active || !entity->physics) continue;
            
            auto& phys = *entity->physics;
            if (phys.type == PhysicsBody::Type::STATIC) continue;
            
            // Apply gravity
            if (phys.use_gravity) {
                phys.acceleration.y += 980.0f * phys.gravity_scale;
            }
            
            // Update velocity
            phys.velocity = phys.velocity + phys.acceleration * dt;
            
            // Apply friction
            phys.velocity = phys.velocity * (1.0f - phys.friction * dt);
            
            // Update position
            entity->position = entity->position + phys.velocity * dt;
            
            // Reset acceleration
            phys.acceleration = {0, 0};
        }
        
        // Update patrol paths
        for (auto& entity : entities) {
            if (!entity->active || !entity->patrol) continue;
            
            auto& patrol = *entity->patrol;
            if (patrol.waypoints.empty()) continue;
            
            if (entity->waypoint_timer > 0) {
                entity->waypoint_timer -= dt;
                continue;
            }
            
            Vec2 target = patrol.waypoints[entity->current_waypoint];
            Vec2 direction = target - entity->position;
            float distance = direction.length();
            
            if (distance < 5.0f) {
                entity->waypoint_timer = patrol.wait_time;
                
                if (patrol.ping_pong) {
                    if (entity->moving_forward) {
                        if (entity->current_waypoint >= patrol.waypoints.size() - 1) {
                            entity->moving_forward = false;
                            entity->current_waypoint--;
                        } else {
                            entity->current_waypoint++;
                        }
                    } else {
                        if (entity->current_waypoint == 0) {
                            entity->moving_forward = true;
                            entity->current_waypoint++;
                        } else {
                            entity->current_waypoint--;
                        }
                    }
                } else {
                    entity->current_waypoint = (entity->current_waypoint + 1) % patrol.waypoints.size();
                    if (!patrol.loop && entity->current_waypoint == 0) {
                        entity->current_waypoint = patrol.waypoints.size() - 1;
                    }
                }
            } else {
                entity->position = entity->position + direction.normalized() * patrol.speed * dt;
            }
        }
        
        // Check triggers
        for (auto& trigger : triggers) {
            for (auto& entity : entities) {
                if (!entity->active) continue;
                
                bool inside = trigger.bounds.contains(entity->position);
                bool was_inside = std::find(trigger.entities_inside.begin(), 
                                           trigger.entities_inside.end(), 
                                           entity->id) != trigger.entities_inside.end();
                
                if (inside && !was_inside) {
                    trigger.entities_inside.push_back(entity->id);
                    // Fire on_enter_event
                } else if (!inside && was_inside) {
                    trigger.entities_inside.erase(
                        std::remove(trigger.entities_inside.begin(), 
                                   trigger.entities_inside.end(), 
                                   entity->id),
                        trigger.entities_inside.end());
                    // Fire on_exit_event
                }
            }
        }
        
        // Check encounters
        for (auto& encounter : encounters) {
            if (encounter.triggered || encounter.completed) continue;
            
            auto* trigger_entity = get_entity(encounter.trigger_entity);
            if (trigger_entity && encounter.spawn_area.contains(trigger_entity->position)) {
                encounter.triggered = true;
                // Spawn enemies
            }
        }
        
        if (on_update) on_update(dt);
    }
    
    void start() {
        if (on_start) on_start();
    }
};

// ============================================================
// PARSER
// ============================================================

class Parser {
public:
    explicit Parser(std::string_view source) : lexer_(source) {
        tokens_ = lexer_.tokenize();
    }
    
    std::unique_ptr<Scene> parse_scene() {
        auto scene = std::make_unique<Scene>();
        
        while (!is_at_end()) {
            if (match(TokenType::SCENE)) {
                parse_scene_block(scene.get());
            } else if (match(TokenType::ENTITY)) {
                auto entity = parse_entity();
                if (entity) scene->add_entity(std::move(entity));
            } else if (match(TokenType::TEMPLATE)) {
                parse_template(scene.get());
            } else if (match(TokenType::TILE)) {
                parse_tilemap(scene.get());
            } else if (match(TokenType::TRIGGER)) {
                parse_trigger(scene.get());
            } else if (match(TokenType::ENCOUNTER)) {
                parse_encounter(scene.get());
            } else if (match(TokenType::QUEST)) {
                parse_quest(scene.get());
            } else {
                advance(); // Skip unknown
            }
        }
        
        return scene;
    }

private:
    Lexer lexer_;
    std::vector<Token> tokens_;
    size_t pos_ = 0;
    
    bool is_at_end() const { return pos_ >= tokens_.size(); }
    const Token& peek() const { return tokens_[pos_]; }
    const Token& advance() { return tokens_[pos_++]; }
    const Token& previous() const { return tokens_[pos_ - 1]; }
    
    bool match(TokenType type) {
        if (peek().type == type) {
            advance();
            return true;
        }
        return false;
    }
    
    void consume(TokenType type, const std::string& error_msg) {
        if (!match(type)) {
            throw std::runtime_error(error_msg + " at line " + 
                                    std::to_string(peek().line));
        }
    }
    
    void parse_scene_block(Scene* scene) {
        scene->name = advance().lexeme; // Scene name
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (match(TokenType::BACKGROUND)) {
                if (peek().type == TokenType::STRING) {
                    scene->background_texture = std::string(advance().lexeme);
                } else if (peek().type == TokenType::COLOR_HEX) {
                    scene->background_color = Color::from_hex(std::string(advance().lexeme));
                }
            } else if (match(TokenType::MUSIC)) {
                consume(TokenType::STRING, "Expected music filename");
                scene->music = std::string(previous().lexeme);
            } else if (match(TokenType::BOUNDS)) {
                scene->world_bounds_min = parse_vec2();
                scene->world_bounds_max = parse_vec2();
            } else if (match(TokenType::CAMERA)) {
                parse_camera(&scene->camera);
            } else {
                advance();
            }
        }
    }
    
    std::unique_ptr<Entity> parse_entity() {
        auto entity = std::make_unique<Entity>();
        entity->id = std::string(advance().lexeme); // Entity name/id
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (match(TokenType::POSITION)) {
                entity->position = parse_vec2();
            } else if (match(TokenType::ROTATION)) {
                entity->rotation = advance().number_value;
            } else if (match(TokenType::SCALE)) {
                entity->scale = parse_vec2();
            } else if (match(TokenType::SPRITE) || peek().lexeme == "sprite") {
                if (peek().type == TokenType::IDENTIFIER) advance(); // Skip "sprite" if present
                consume(TokenType::STRING, "Expected sprite filename");
                entity->sprite = std::string(previous().lexeme);
            } else if (match(TokenType::COLLISION)) {
                entity->collisions.push_back(parse_collision_shape());
            } else if (match(TokenType::PHYSICS)) {
                entity->physics = parse_physics_body();
            } else if (match(TokenType::PATROL)) {
                entity->patrol = parse_patrol_path();
            } else if (match(TokenType::LAYER)) {
                entity->layer = (int)advance().number_value;
            } else if (match(TokenType::TEMPLATE)) {
                entity->template_name = std::string(advance().lexeme);
            } else {
                advance();
            }
        }
        
        return entity;
    }
    
    Vec2 parse_vec2() {
        float x = advance().number_value;
        consume(TokenType::COMMA, "Expected ',' in vec2");
        float y = advance().number_value;
        return {x, y};
    }
    
    void parse_camera(Camera* camera) {
        while (!match(TokenType::END) && !is_at_end()) {
            if (match(TokenType::POSITION)) {
                camera->position = parse_vec2();
            } else if (peek().lexeme == "zoom") {
                advance();
                camera->zoom = advance().number_value;
            } else if (peek().lexeme == "target") {
                advance();
                camera->target_entity = std::string(advance().lexeme);
            } else if (peek().lexeme == "smooth_speed") {
                advance();
                camera->smooth_speed = advance().number_value;
            } else {
                advance();
            }
        }
    }
    
    CollisionShape parse_collision_shape() {
        CollisionShape shape;
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (peek().lexeme == "type") {
                advance();
                std::string type_str(advance().lexeme);
                if (type_str == "box") shape.type = CollisionShape::Type::BOX;
                else if (type_str == "circle") shape.type = CollisionShape::Type::CIRCLE;
                else if (type_str == "polygon") shape.type = CollisionShape::Type::POLYGON;
            } else if (peek().lexeme == "size") {
                advance();
                shape.size = parse_vec2();
            } else if (peek().lexeme == "offset") {
                advance();
                shape.offset = parse_vec2();
            } else if (peek().lexeme == "trigger") {
                advance();
                shape.is_trigger = advance().bool_value;
            } else if (peek().lexeme == "layer") {
                advance();
                shape.layer = std::string(advance().lexeme);
            } else {
                advance();
            }
        }
        
        return shape;
    }
    
    PhysicsBody parse_physics_body() {
        PhysicsBody phys;
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (peek().lexeme == "type") {
                advance();
                std::string type_str(advance().lexeme);
                if (type_str == "static") phys.type = PhysicsBody::Type::STATIC;
                else if (type_str == "dynamic") phys.type = PhysicsBody::Type::DYNAMIC;
                else if (type_str == "kinematic") phys.type = PhysicsBody::Type::KINEMATIC;
            } else if (match(TokenType::VELOCITY)) {
                phys.velocity = parse_vec2();
            } else if (match(TokenType::MASS)) {
                phys.mass = advance().number_value;
            } else if (match(TokenType::FRICTION)) {
                phys.friction = advance().number_value;
            } else if (match(TokenType::BOUNCE)) {
                phys.bounce = advance().number_value;
            } else {
                advance();
            }
        }
        
        return phys;
    }
    
    PatrolPath parse_patrol_path() {
        PatrolPath patrol;
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (peek().lexeme == "waypoints") {
                advance();
                while (!match(TokenType::END) && !is_at_end()) {
                    patrol.waypoints.push_back(parse_vec2());
                }
            } else if (peek().lexeme == "speed") {
                advance();
                patrol.speed = advance().number_value;
            } else if (peek().lexeme == "wait") {
                advance();
                patrol.wait_time = advance().number_value;
            } else if (peek().lexeme == "loop") {
                advance();
                patrol.loop = advance().bool_value;
            } else if (peek().lexeme == "ping_pong") {
                advance();
                patrol.ping_pong = advance().bool_value;
            } else {
                advance();
            }
        }
        
        return patrol;
    }
    
    void parse_template(Scene* scene) {
        EntityTemplate tmpl;
        tmpl.name = std::string(advance().lexeme);
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (peek().lexeme == "sprite") {
                advance();
                tmpl.sprite = std::string(advance().lexeme);
            } else if (peek().lexeme == "size") {
                advance();
                tmpl.size = parse_vec2();
            } else if (match(TokenType::COLLISION)) {
                tmpl.collisions.push_back(parse_collision_shape());
            } else if (match(TokenType::PHYSICS)) {
                tmpl.physics = parse_physics_body();
            } else {
                advance();
            }
        }
        
        scene->templates[tmpl.name] = std::move(tmpl);
    }
    
    void parse_tilemap(Scene* scene) {
        Tilemap tilemap;
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (peek().lexeme == "tileset") {
                advance();
                tilemap.tileset_texture = std::string(advance().lexeme);
            } else if (peek().lexeme == "tile_size") {
                advance();
                tilemap.tile_size = parse_vec2();
            } else if (peek().lexeme == "size") {
                advance();
                tilemap.size = parse_vec2();
            } else {
                advance();
            }
        }
        
        // Allocate tile grid
        tilemap.tiles.resize((int)tilemap.size.y);
        for (int y = 0; y < (int)tilemap.size.y; y++) {
            tilemap.tiles[y].resize((int)tilemap.size.x);
            for (int x = 0; x < (int)tilemap.size.x; x++) {
                tilemap.tiles[y][x].position = {
                    x * tilemap.tile_size.x,
                    y * tilemap.tile_size.y
                };
            }
        }
        
        scene->tilemaps.push_back(std::move(tilemap));
    }
    
    void parse_trigger(Scene* scene) {
        TriggerZone trigger;
        trigger.id = std::string(advance().lexeme);
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (match(TokenType::BOUNDS)) {
                trigger.bounds.min = parse_vec2();
                trigger.bounds.max = parse_vec2();
            } else if (peek().lexeme == "type") {
                advance();
                trigger.trigger_type = std::string(advance().lexeme);
            } else if (peek().lexeme == "on_enter") {
                advance();
                trigger.on_enter_event = std::string(advance().lexeme);
            } else if (peek().lexeme == "on_exit") {
                advance();
                trigger.on_exit_event = std::string(advance().lexeme);
            } else {
                advance();
            }
        }
        
        scene->triggers.push_back(std::move(trigger));
    }
    
    void parse_encounter(Scene* scene) {
        Encounter encounter;
        encounter.id = std::string(advance().lexeme);
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (peek().lexeme == "enemies") {
                advance();
                while (match(TokenType::STRING)) {
                    encounter.enemy_templates.push_back(std::string(previous().lexeme));
                }
            } else if (match(TokenType::BOUNDS)) {
                encounter.spawn_area.min = parse_vec2();
                encounter.spawn_area.max = parse_vec2();
            } else if (peek().lexeme == "count") {
                advance();
                encounter.enemy_count = (int)advance().number_value;
            } else if (peek().lexeme == "delay") {
                advance();
                encounter.spawn_delay = advance().number_value;
            } else {
                advance();
            }
        }
        
        scene->encounters.push_back(std::move(encounter));
    }
    
    void parse_quest(Scene* scene) {
        Quest quest;
        quest.id = std::string(advance().lexeme);
        
        while (!match(TokenType::END) && !is_at_end()) {
            if (peek().lexeme == "name") {
                advance();
                quest.name = std::string(advance().lexeme);
            } else if (peek().lexeme == "description") {
                advance();
                quest.description = std::string(advance().lexeme);
            } else if (peek().lexeme == "objective") {
                advance();
                quest.objective = std::string(advance().lexeme);
            } else if (peek().lexeme == "needed") {
                advance();
                quest.objective_needed = (int)advance().number_value;
            } else if (peek().lexeme == "reward") {
                advance();
                quest.reward = std::string(advance().lexeme);
            } else {
                advance();
            }
        }
        
        scene->quests.push_back(std::move(quest));
    }
};

// ============================================================
// FILE WATCHER (HOT RELOAD)
// ============================================================

class FileWatcher {
public:
    using Callback = std::function<void(const std::string& path)>;
    
    void watch(const std::string& path, Callback on_change) {
        watchers_[path] = {
            std::filesystem::last_write_time(path),
            std::move(on_change)
        };
    }
    
    void poll() {
        for (auto& [path, watcher] : watchers_) {
            auto current_time = std::filesystem::last_write_time(path);
            if (current_time != watcher.last_write) {
                watcher.last_write = current_time;
                watcher.callback(path);
            }
        }
    }

private:
    struct Watcher {
        std::filesystem::file_time_type last_write;
        Callback callback;
    };
    std::unordered_map<std::string, Watcher> watchers_;
};

// ============================================================
// ENGINE INTEGRATION
// ============================================================

class Engine {
public:
    Engine() = default;
    
    std::unique_ptr<Scene> load_scene(const std::string& path) {
        std::ifstream file(path);
        if (!file.is_open()) {
            throw std::runtime_error("Cannot open file: " + path);
        }
        
        std::stringstream buffer;
        buffer << file.rdbuf();
        std::string source = buffer.str();
        
        Parser parser(source);
        auto scene = parser.parse_scene();
        
        // Setup hot reload
        if (enable_hot_reload_) {
            file_watcher_.watch(path, [this](const std::string& p) {
                std::cout << "[Chrxg] Hot reload: " << p << std::endl;
                reload_scene(p);
            });
        }
        
        current_scene_ = scene.get();
        scene->start();
        
        return scene;
    }
    
    void update(float dt) {
        if (current_scene_) {
            current_scene_->update(dt);
        }
        if (enable_hot_reload_) {
            file_watcher_.poll();
        }
    }
    
    void enable_hot_reload(bool enable) { enable_hot_reload_ = enable; }
    
    Scene* get_current_scene() { return current_scene_; }

private:
    Scene* current_scene_ = nullptr;
    FileWatcher file_watcher_;
    bool enable_hot_reload_ = true;
    
    void reload_scene(const std::string& path) {
        try {
            auto new_scene = load_scene(path);
            // Transfer runtime state
            if (current_scene_) {
                new_scene->completed_quests = current_scene_->completed_quests;
                new_scene->entity_map = current_scene_->entity_map;
            }
            current_scene_ = new_scene.release();
        } catch (const std::exception& e) {
            std::cerr << "[Chrxg] Reload failed: " << e.what() << std::endl;
            std::cerr << "[Chrxg] Keeping current scene." << std::endl;
        }
    }
};

} // namespace chrxg
