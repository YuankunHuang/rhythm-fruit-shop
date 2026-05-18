#include <gtest/gtest.h>
#include "engine/core/state_machine.h"

enum class TestState {
	Idle = 1,
	Running = 2,
	Paused = 3,
};

TEST(StateMachine_ErrorForNonEnumState, ShouldNotCompile) {
	// This test is just to ensure that StateMachine cannot be instantiated with non-enum types.
	// It won't compile if uncommented, which is the expected behavior.
	 //StateMachine<int> sm(0, { { 0, { 1 } }, { 1, { 0 } } });
}

TEST(StateMachine_BasicInitializationAndTransition, ShouldWorkProperly) {
	StateMachine<TestState> sm(TestState::Idle, {
		{ TestState::Idle, { TestState::Running, TestState::Paused } },
		{ TestState::Running, { TestState::Paused } },
		{ TestState::Paused, { TestState::Idle } }
		});
	EXPECT_TRUE(sm.TryTransition(TestState::Running));
	EXPECT_TRUE(sm.TryTransition(TestState::Paused));
	EXPECT_FALSE(sm.TryTransition(TestState::Running));
	EXPECT_TRUE(sm.TryTransition(TestState::Idle));
}

TEST(StateMachine_Signal, ShouldEmitOnTransition) {
	StateMachine<TestState> sm(TestState::Idle, {
		{ TestState::Idle, { TestState::Running, TestState::Paused } },
		{ TestState::Running, { TestState::Paused } },
		{ TestState::Paused, { TestState::Idle } }
		});
	TestState prev = TestState::Idle, next = TestState::Idle;
	sm.OnTransition.Connect([&](TestState p, TestState n) {
		prev = p;
		next = n;
		});
	EXPECT_TRUE(sm.TryTransition(TestState::Running));
	EXPECT_EQ(prev, TestState::Idle);
	EXPECT_EQ(next, TestState::Running);
}