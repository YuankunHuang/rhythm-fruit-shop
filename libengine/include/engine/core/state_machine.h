#pragma once

#include <unordered_map>
#include <unordered_set>
#include <type_traits>
#include "signal.h"

struct StateHash {
	template<typename State>
	size_t operator()(const State& s) const requires std::is_enum_v<State> {
		return std::hash<std::underlying_type_t<State>>{}(static_cast<std::underlying_type_t<State>>(s));
	}
};

template<typename State>
class StateMachine {
public:
	using TransitionTable = std::unordered_map<State, std::unordered_set<State, StateHash>, StateHash>;

	explicit StateMachine(State initial, TransitionTable transitions)
		: current_(initial), transitions_(std::move(transitions)) { }

	State current() const {
		return current_;
	}

	bool TryTransition(State next) {
		auto it = transitions_.find(current_);
		if (it == transitions_.end() || it->second.count(next) == 0) {
			return false;
		}
		State prev = current_;
		current_ = next;
		OnTransition.Emit(prev, next);
		return true;
	}

	/// <summary>
	/// Forcefully transition to the next state, ignoring the transition table.
	/// For UnitTest only.
	/// </summary>
	/// <param name="state"></param>
	void ForceTransition(State state) { current_ = state; }

	Signal<State, State> OnTransition;

private:
	State current_;
	TransitionTable transitions_;
};