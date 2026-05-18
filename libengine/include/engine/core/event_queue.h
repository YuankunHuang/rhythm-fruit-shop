#pragma once

#include <queue>

template<typename T>
class EventQueue {
public:
	void Push(float timestamp, T event) {
		heap_.push({ timestamp, std::move(event) } );
	}
	bool HasReady(float currentTime) const {
		if (!heap_.empty() && heap_.top().time <= currentTime) {
			return true;
		}
		return false;
	}
	T PopNext() {
		T val = std::move(const_cast<Entry&>(heap_.top()).value);
		heap_.pop();
		return val;
	}
	bool Empty() {
		return heap_.empty();
	}
	void Clear() {
		while (!heap_.empty()) {
			heap_.pop();
		}
	}

private:
	struct Entry {
		float time;
		T event;
		bool operator>(const Entry& other) const {
			return time > other.time;
		}
	};
	std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> heap_;
};