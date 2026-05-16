#include <unordered_map>

template<typename... Args>
class Signal {
public:
	using Handle = uint64_t;
	using Fn = std::function<void(Args...)>;

	Handle Connect(Fn fn) {
		Handle h = next_++;
		slots_[h] = std::move(fn);
		return h;
	}

	void Disconnect(Handle h) {
		slots_.erase(h);
	}

	void Emit(Args... args) const {
		for (auto& [h, fn] : slots_) {
			fn(args);
		}
	}

private:
	std::unordered_map<Handle, Fn> slots_;
	Handle next_ = 0;
};