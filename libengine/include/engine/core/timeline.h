#pragma once

#include <vector>
#include <span>
#include <algorithm>

template<typename T>
class Timeline {
public:
	struct Entry {
		float time;
		T value;
	};

	void Insert(float timestamp, T value) {
		auto it = std::ranges::lower_bound(entries_, timestamp, {}, &Entry::time);
		entries_.insert(it, { timestamp, std::move(value) });
	}

	std::span<const Entry> QueryRange(float t0, float t1) const {
		auto b = std::ranges::lower_bound(entries_, t0, {}, &Entry::time);
		auto e = std::ranges::upper_bound(entries_, t1, {}, &Entry::time);
		return std::span(b, e);
	}

	const Entry* LastBefore(float t) const {
		auto it = std::ranges::lower_bound(entries_, t, {}, &Entry::time);
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