#include <gtest/gtest.h>
#include "engine/core/signal.h"

TEST(Signal_BasicConnectEmitDisconnect, HandlersCalledAndRemoved) {
	Signal<int> sig;
	int sum = 0;

	Signal<int>::Handle h1 = sig.Connect([&](int x) { sum += x; });
	Signal<int>::Handle h2 = sig.Connect([&](int x) { sum += 2 * x; });

	EXPECT_NE(h1, h2); // Handles should be different

	sig.Emit(3);
	EXPECT_EQ(sum, 3 + 2 * 3);

	sig.Disconnect(h1);
	sig.Emit(4);
	EXPECT_EQ(sum, 3 + 2 * 3 + 2 * 4);

	sig.Disconnect(h2);
	sig.Emit(5);
	EXPECT_EQ(sum, 3 + 2 * 3 + 2 * 4); // No change after disconnecting all handlers
}

TEST(Signal_EmitWhenNoHandlers, NoThrow) {
	Signal<int> sig;
	EXPECT_NO_THROW(sig.Emit(42)); // Should not throw even if no handlers are connected
}

TEST(Signal_DisconnectUnknown_NoThrow, SafeToDisconnectNonexistentHandle) {
	Signal<int> sig;
	EXPECT_NO_THROW(sig.Disconnect(0xdeadbeef)); // Disconnecting a handle that was never connected should not throw
}

TEST(Signal_MultipleConnectSameCallable, EachInstanceCalled) {
	Signal<int> sig;
	int calls = 0;
	auto fn = [&](int) { calls++; };

	auto a = sig.Connect(fn);
	auto b = sig.Connect(fn);

	EXPECT_NE(a, b);

	sig.Emit(1);
	EXPECT_EQ(calls, 2);

	sig.Disconnect(a);
	sig.Emit(1);
	EXPECT_EQ(calls, 3); // Only one handler should be called after disconnecting one
}