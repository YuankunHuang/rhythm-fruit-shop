#include <gtest/gtest.h>
#include "engine/core/timeline.h"
#include <string>
#include <vector>

TEST(Timeline_BasicInsertAndQuery, SortedByTime) {
	Timeline<std::string> tl;
	tl.Insert(1.f, "one");
	tl.Insert(0.5f, "half");
	tl.Insert(2.f, "two");

	auto all = tl.All();
	EXPECT_EQ(tl.size(), 3u);
	ASSERT_EQ(all.size(), 3u);

	// Check if entries are sorted by time
	EXPECT_FLOAT_EQ(all[0].time, 0.5f);
	EXPECT_EQ(all[0].value, "half");
	EXPECT_FLOAT_EQ(all[1].time, 1.f);
	EXPECT_EQ(all[1].value, "one");
	EXPECT_FLOAT_EQ(all[2].time, 2.f);
	EXPECT_EQ(all[2].value, "two");

	auto range = tl.QueryRange(0.75f, 1.5f);
	ASSERT_EQ(range.size(), 1u);
	EXPECT_EQ(range[0].time, 1.0f);
	EXPECT_EQ(range[0].value, "one");

	auto last = tl.LastBefore(1.5f);
	ASSERT_NE(last, nullptr);
	EXPECT_EQ(last->time, 1.f);
	EXPECT_EQ(last->value, "one");

	EXPECT_EQ(tl.LastBefore(0.5f), nullptr);
	EXPECT_EQ(tl.LastBefore(0.1f), nullptr);
}