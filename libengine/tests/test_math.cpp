#include <gtest/gtest.h>
#include "engine/core/math.h"

TEST(Math_LerpClampSmooth, Basic) {
	EXPECT_FLOAT_EQ(lerp(0.f, 10.f, 0.5f), 5.f);
	EXPECT_FLOAT_EQ(lerp(2.f, 4.f, 0.f), 2.f);
}

TEST(Math_Clamp, Basic) {
	EXPECT_FLOAT_EQ(clamp(0.f, 1.f, 3.f), 1.f);
	EXPECT_FLOAT_EQ(clamp(4.f, 1.f, 3.f), 3.f);
	EXPECT_FLOAT_EQ(clamp(0.5f, 0.f, 1.f), 0.5f);
}

TEST(Math_SmoothStep, Bounds) {
	EXPECT_FLOAT_EQ(smoothstep(0.f, 1.f, -1.f), 0.f);
	EXPECT_FLOAT_EQ(smoothstep(0.f, 1.f, 2.f), 1.f);
	EXPECT_FLOAT_EQ(smoothstep(0.f, 1.f, .5f), 0.5f);
}

TEST(Math_Vec2OpsAndAABB, Ops) {
	Vec2 a{ 1.f, 2.f }, b{ 3.f, 4.f };
	Vec2 sum = a + b;
	EXPECT_FLOAT_EQ(sum.x, 4.f);
	EXPECT_FLOAT_EQ(sum.y, 6.f);

	Vec2 scaled = a * 2.f;
	EXPECT_FLOAT_EQ(scaled.x, 2.f);
	EXPECT_FLOAT_EQ(scaled.y, 4.f);

	AABB box{ {0.f, 0.f}, {5.f, 5.f} };
	EXPECT_TRUE(aabbContains(box, { 1.f, 1.f }));
	EXPECT_TRUE(aabbContains(box, { 0.f, 0.f }));
	EXPECT_TRUE(aabbContains(box, { 5.f, 5.f }));
	EXPECT_FALSE(aabbContains(box, { -1.f, -1.f }));
}