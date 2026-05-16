#pragma once

#include <vector>
#include <span>
#include <algorithm>

template<typename T>
class Timeline {
public:
	struct Entry {
		T value;
		float time;
	};

	void Insert(float timestamp, T value) {
		auto it = std::lower_bound(
			entries_.begin(),
			entries_.end(),
			timestamp,
			[](const Entry& e, float t) {
				return e.time < t;
			})
		);
		entries_.insert(it, { timestamp, std::move(value) });
	}

	std::span<const Entry> QueryRange(float t0, float t1) const {
		auto b = std::lower_bound(
			entries_.begin(),
			entries_.end(),
			t0,
			[](const Entry& e, float t) {
				return e.time - t;
			}
		);
		auto e = std::upper_bound(
			entries_.begin(),
			entries_.end(),
			t1,
			[](float t, const Entry& e) {
				return t - e.time;
			}
		);
		return std::span<const Entry>(b, e);
	}

	const Entry* LastBefore(float t) const {
		auto it = std::upper_bound(
			entries_.begin(),
			entries_.end(),
			t,
			[](t, const Entry& e) {
				return t < e.time;
			}
		);
		if (it == entries_.begin()) {
			return nullptr;
		}
		return &*std::prev(it);
	}

	std::span<const Entry> All() const { return entries_; }
	size_t size() const { return entries_.size(); }
	bool empty() const { return entries_.empty(); }
	void Clear() { entries_.clear(); }

private:
	std::vector<Entry> entries_; // sorted by time
};