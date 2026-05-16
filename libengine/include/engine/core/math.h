struct Vec2 { float x = 0, y = 0; };
struct Vec3 { float x = 0, y = 0, z = 0; };
struct AABB { Vec2 min, max; };
struct Transform2D {
	Vec2 position;
	float rotation = 0.f; // radian
	Vec2 scale;
};

// lerp, clamp, smoothstep, operator+, operator*, aabbContains
inline float lerp(float a, float b, float t) {
	return a + (b - a) * t;
}

inline float clamp(float x, float min, float max) {
	return x < min ? min : (x > max ? max : x);
}

inline float smoothstep(float edge0, float edge1, float x) {
	float t = clamp((x - edge0) / (edge1 - edge0), 0.f, 1.f);
	return t * t * (3 - 2.f * t);
}

inline Vec2 operator+(const Vec2& a, const Vec2& b) {
	return { a.x + b.x, a.y + b.y };
}

inline Vec2 operator*(const Vec2& v, float s) {
	return { v.x * s, v.y * s };
}

inline bool aabbContains(const AABB& aabb, const Vec2& point) {
	return aabb.min.x <= point.x && aabb.max.x >= point.x && aabb.min.y <= point.y && aabb.max.y >= point.y;
}