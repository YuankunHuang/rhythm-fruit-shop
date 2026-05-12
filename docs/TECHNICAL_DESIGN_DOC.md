# 《节奏鲜果铺》Technical Design Document

> **版本**：v2.0  
> **目标平台**：Windows / macOS（桌面，C++ Native）  
> **文档目的**：为 C++ Native 版本提供完整的架构决策、模块规格和开发路线图。  
> **核心定位**：本项目是通往 Simulation Engineer 的第一步——以音游为载体，刻意构建一套可跨游戏复用的引擎库（`libengine`），并在实现过程中建立「节奏游戏即离散事件仿真」的工程心智模型。

---

## 目录

1. [学习路径定位](#1-学习路径定位)
2. [技术栈选型](#2-技术栈选型)
3. [分层架构总览](#3-分层架构总览)
4. [L0 · Core 模块规格](#4-l0--core-模块规格)
5. [L1 · Platform 接口规格](#5-l1--platform-接口规格)
6. [L3 · Services 模块规格](#6-l3--services-模块规格)
7. [Game Layer 规格](#7-game-layer-规格)
8. [数据资产兼容性](#8-数据资产兼容性)
9. [目录结构与 CMake 组织](#9-目录结构与-cmake-组织)
10. [已知问题与 C++ 修复](#10-已知问题与-c-修复)
11. [开发里程碑](#11-开发里程碑)
12. [附录 A：节奏游戏即离散事件仿真](#附录-a节奏游戏即离散事件仿真)
13. [附录 B：miniaudio 精度优势](#附录-bminiaudio-精度优势)
14. [附录 C：RenderContext 结构](#附录-crendercontext-结构)

---

## 1. 学习路径定位

### 1.1 目标：Simulation Engineer

本项目不是「把 HTML 翻译成 C++」。它是一个**刻意设计的学习路径**：用音游作为载体，逐步建立引擎工程能力，最终指向交通仿真、物理仿真等 Simulation Engineer 所需的核心技能。

**三款游戏的技术递进**：

```
音游（当前）           FPS（第二款）           交通仿真（第三款）
──────────────         ──────────────          ──────────────────────
libengine L0/L1/L3     复用 L0/L1              复用 L0
AudioMixer             升级 OpenGL             可选 headless
Renderer2D             3D 渲染管线             数据可视化层
StateMachine<T>        摄像机/物理系统         大量 Agent 状态机
Timeline<NoteEvent>    动画曲线 Timeline        车辆到达事件 Timeline
EventQueue<T>          物理事件队列            DES 事件池（核心）
```

`libengine` 的 L0 Core（Math、Timeline、StateMachine、EventQueue、Signal、ResourceCache）在三款游戏中**完全复用**。Platform 和 Services 视需求替换或扩充。Game Layer 每款游戏独立实现。

### 1.2 核心心智模型

> **节奏游戏就是一个实时离散事件仿真。**

每一个引擎组件背后都有对应的仿真工程概念——详见[附录 A](#附录-a节奏游戏即离散事件仿真)。在实现每个模块时，有意识地建立这个映射，是通往 Simulation Engineer 的捷径。

### 1.3 范围约束

- **不做 1:1 翻译**：C++ 版架构优于 HTML 版，不继承原型技术债
- **不做早期 3D**：音游用 SDL2_Renderer，第二款游戏再升级 OpenGL
- **不用引擎中间件**：不用 Unreal/Unity；引擎层代码全部自写
- **不做过早优化**：M0–M3 以正确性为主，M5 才做性能剖析

---

## 2. 技术栈选型

### 2.1 选型总表

| 层次 | 库 | 版本基准 | 引入方式 | 选型理由 |
|------|----|----------|----------|---------|
| 窗口 / 输入 | **SDL2** | ≥ 2.28 | vcpkg | 薄封装、跨平台、不替你思考；L1 Platform 的 SDL2 实现可替换 |
| 2D 渲染 | **SDL2_renderer** + **SDL2_image** | 随 SDL2 | vcpkg | 音游不需要 Shader；第二款游戏再升 OpenGL |
| 字体 | **SDL2_ttf** | 随 SDL2 | vcpkg | UI 文字渲染，内置 FreeType |
| 音频 | **miniaudio** | ≥ 0.11 | header-only | 单头文件；m4a/AAC 解码内置；sample-accurate 位置查询 |
| JSON | **nlohmann/json** | ≥ 3.11 | header-only | 复用全部现有 JSON 资产，零迁移成本 |
| 图片解码 | **stb_image** | 当前版 | header-only | 轻量；PNG/JPEG 支持 |
| 构建系统 | **CMake** | ≥ 3.25 | — | 业界标准 |
| 依赖管理 | **vcpkg** | manifest 模式 | — | SDL2 系列用 vcpkg；header-only 直接 vendor |
| 单元测试 | **Google Test** | ≥ 1.14 | vcpkg | L0 Core 完全可在无 SDL2 环境下测试 |

### 2.2 关键选型说明

**SDL2 而非 SFML/raylib**：SDL2 是最薄的封装，强迫理解平台底层。SFML 抽象过高，会隐藏重要系统概念。SDL2 → OpenGL 的升级路径最清晰。

**miniaudio 而非 OpenAL**：OpenAL 历史遗留问题多。miniaudio 单头文件，`ma_sound_get_cursor_in_seconds()` 提供 sample-accurate 播放位置（约 22.7 微秒，远优于浏览器 `currentTime` 的 4ms 量化），对音游判定至关重要——见[附录 B](#附录-bminiaudio-精度优势)。

**nlohmann/json**：现有 26 个谱面、songs.json、difficulties.json、flows/*.json 全部无需格式迁移。

---

## 3. 分层架构总览

依赖方向：**只能向下，不能向上，同层互不调用**。

```
┌──────────────────────────────────────────────────────────┐
│  Game Layer  (games/rhythm-fruit-shop-cpp/)              │
│  RhythmEngine · FlowPhaseRunner · GameFSM                │
│  Screens (HomeScreen, FlowScreen, GameplayScreen, ...)   │
│  SaveSystem                                              │
│  ← 消费 libengine 所有子层；对 libengine 单向依赖        │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  Engine L3 - Services  (libengine/src/services/)         │
│  AudioMixer · Renderer2D · AssetLoader · InputMapper     │
│  ← 依赖 L1（接口）+ L0（核心类型）                       │
│  ← 同层模块互不直接调用；通过 Signal<T> 向 Game 层暴露  │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  Engine L1 - Platform  (libengine/src/platform/)         │
│  IWindow · IInput · IFileSystem · ITimer                 │
│  SDL2 实现在 platform/sdl2/；可替换为其他平台            │
│  ← 只依赖 OS/SDL2；不依赖 L0 任何类型                   │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  Engine L0 - Core  (libengine/include/engine/core/)      │
│  Math: Vec2 · Vec3 · AABB · Transform2D · lerp · clamp   │
│  Timeline<T> · StateMachine<T> · EventQueue<T>           │
│  Signal<Args...> · ResourceCache<K,V>                    │
│  ← 纯 C++17；零外部依赖；可完全独立于 SDL2/miniaudio 测试│
└──────────────────────────────────────────────────────────┘
```

**层级规则一览**：

| 规则 | 说明 |
|------|------|
| L0 零依赖 | 只允许依赖 C++ 标准库（`<vector>`, `<unordered_map>`, `<functional>` 等） |
| L1 不知道 L0 | `IWindow::GetSize()` 返回 `{int,int}` 而非 `Vec2`；Platform 接口不引用任何 L0 头文件 |
| L3 依赖 L0+L1 | `Renderer2D::DrawSprite(Vec2 pos, ...)` 合法；`IWindow` 返回 `Vec2` 不合法 |
| 同层解耦 | `InputMapper` 触发 Tap 时不调用 `RhythmEngine`，而是 emit `Signal<TapEvent>`，由 Game 层订阅 |
| Game 单向依赖 | Game Layer 可调用 libengine 所有层；libengine 不引用任何 Game 头文件 |

---

## 4. L0 · Core 模块规格

> **原则**：这五个模块是三款游戏共用的仿真基础设施。独立 `.h`，无实现文件，模板头文件全 inline 或单头。

### 4.1 Math

```cpp
// engine/core/math.h

struct Vec2 { float x = 0, y = 0; };
struct Vec3 { float x = 0, y = 0, z = 0; };
struct AABB { Vec2 min, max; };
struct Color { uint8_t r, g, b, a = 255; };

struct Transform2D {
    Vec2  position;
    float rotation = 0.f;  // radians
    Vec2  scale    = {1.f, 1.f};
};

inline float lerp(float a, float b, float t) { return a + (b - a) * t; }
inline float clamp(float v, float lo, float hi) { return v < lo ? lo : v > hi ? hi : v; }
inline float smoothstep(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.f, 1.f);
    return t * t * (3.f - 2.f * t);
}
inline Vec2  operator+(Vec2 a, Vec2 b) { return {a.x+b.x, a.y+b.y}; }
inline Vec2  operator*(Vec2 a, float s){ return {a.x*s,   a.y*s  }; }
inline bool  aabbContains(AABB box, Vec2 p) {
    return p.x >= box.min.x && p.x <= box.max.x
        && p.y >= box.min.y && p.y <= box.max.y;
}
```

### 4.2 Timeline\<T\>

排好序的事件序列，支持时间范围查询。这是 `RhythmEngine` 的核心数据结构，同样适用于动画曲线（FPS）和车辆到达事件表（交通仿真）。

```cpp
// engine/core/timeline.h
template<typename T>
class Timeline {
public:
    struct Entry { float time; T value; };

    void Insert(float timestamp, T value) {
        auto it = std::lower_bound(entries_.begin(), entries_.end(),
                                   timestamp, [](const Entry& e, float t){ return e.time < t; });
        entries_.insert(it, {timestamp, std::move(value)});
    }

    // 返回 [t0, t1) 范围内所有事件的只读 span
    std::span<const Entry> QueryRange(float t0, float t1) const {
        auto b = std::lower_bound(entries_.begin(), entries_.end(), t0,
                                  [](const Entry& e, float t){ return e.time < t; });
        auto e = std::lower_bound(b, entries_.end(), t1,
                                  [](const Entry& e, float t){ return e.time < t; });
        return std::span<const Entry>(b, e);
    }

    // 第一个 time <= t 的事件（判定扫描用）
    const Entry* LastBefore(float t) const {
        auto it = std::upper_bound(entries_.begin(), entries_.end(), t,
                                   [](float t, const Entry& e){ return t < e.time; });
        if (it == entries_.begin()) return nullptr;
        return &*std::prev(it);
    }

    std::span<const Entry> All() const { return entries_; }
    size_t size() const { return entries_.size(); }
    bool   empty() const { return entries_.empty(); }
    void   Clear() { entries_.clear(); }

private:
    std::vector<Entry> entries_; // 始终保持按 time 排序
};
```

### 4.3 StateMachine\<State\>

类型安全的泛型 FSM，内置转移校验。修复 HTML 版中 `TRANSITIONS` 表仅在测试中使用、运行时不校验的问题。

```cpp
// engine/core/state_machine.h
template<typename State>
class StateMachine {
public:
    using TransitionTable = std::unordered_map<State,
                              std::unordered_set<State, StateHash>, StateHash>;

    explicit StateMachine(State initial, TransitionTable transitions)
        : current_(initial), transitions_(std::move(transitions)) {}

    State Current() const { return current_; }

    // 合法转移返回 true 并更新状态；非法转移返回 false 并记录警告
    bool TryTransition(State next) {
        auto it = transitions_.find(current_);
        if (it == transitions_.end() || it->second.count(next) == 0) {
            // 记录警告；调试版可 assert
            return false;
        }
        State prev = current_;
        current_ = next;
        OnTransition.Emit(prev, next);
        return true;
    }

    // 仅用于单元测试
    void ForceTransition(State next) { current_ = next; }

    Signal<State, State> OnTransition; // (from, to)

private:
    State            current_;
    TransitionTable  transitions_;
};
```

### 4.4 EventQueue\<T\>

时间戳优先队列——离散事件仿真（DES）的事件池原型。节奏游戏用于「哪些音符已经超过判定窗口应判 Miss」的扫描，交通仿真用于车辆到达事件的调度。

```cpp
// engine/core/event_queue.h
template<typename T>
class EventQueue {
public:
    void Push(float timestamp, T event) {
        heap_.push({timestamp, std::move(event)});
    }

    bool HasReady(float currentTime) const {
        return !heap_.empty() && heap_.top().time <= currentTime;
    }

    // 弹出最早到期的事件（调用前应先 HasReady）
    T PopNext() {
        T val = std::move(const_cast<Entry&>(heap_.top()).value);
        heap_.pop();
        return val;
    }

    bool Empty() const { return heap_.empty(); }
    void Clear() { while (!heap_.empty()) heap_.pop(); }

private:
    struct Entry {
        float time;
        T     value;
        bool operator>(const Entry& o) const { return time > o.time; }
    };
    std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> heap_;
};
```

### 4.5 Signal\<Args...\>

轻量观察者，Services 之间的解耦通道。不依赖任何外部库。

```cpp
// engine/core/signal.h
template<typename... Args>
class Signal {
public:
    using Handle = uint64_t;
    using Fn     = std::function<void(Args...)>;

    Handle Connect(Fn fn) {
        Handle h = next_++;
        slots_[h] = std::move(fn);
        return h;
    }

    void Disconnect(Handle h) { slots_.erase(h); }

    void Emit(Args... args) const {
        for (auto& [h, fn] : slots_) fn(args...);
    }

    void Clear() { slots_.clear(); }

private:
    std::unordered_map<Handle, Fn> slots_;
    Handle next_ = 0;
};
```

### 4.6 ResourceCache\<Key, Value\>

泛型资源缓存，取代硬编码的 `AssetManager`。游戏或 Services 定义 Key/Value 类型和 Loader 函数。

```cpp
// engine/core/resource_cache.h
template<typename Key, typename Value>
class ResourceCache {
public:
    using Loader = std::function<Value(const Key&)>;

    explicit ResourceCache(Loader loader) : loader_(std::move(loader)) {}

    const Value& Get(const Key& key) {
        auto it = cache_.find(key);
        if (it != cache_.end()) return it->second;
        auto [inserted, ok] = cache_.emplace(key, loader_(key));
        return inserted->second;
    }

    bool Contains(const Key& key) const { return cache_.count(key) > 0; }
    void Evict(const Key& key)          { cache_.erase(key); }
    void Clear()                        { cache_.clear(); }

private:
    Loader                          loader_;
    std::unordered_map<Key, Value>  cache_;
};
```

---

## 5. L1 · Platform 接口规格

> **原则**：L1 只暴露接口（纯虚基类）。SDL2 实现在 `platform/sdl2/` 下。不引用任何 L0 类型——接口返回原生 C++ 类型（`int`, `float`, `std::string`）。

### 5.1 ITimer

```cpp
// engine/platform/i_timer.h
class ITimer {
public:
    virtual ~ITimer() = default;
    virtual double NowSeconds() const = 0;   // 自初始化以来的秒数（高精度）
    virtual void   SleepSeconds(double s) = 0;
};

// platform/sdl2/sdl2_timer.h
class SDL2Timer : public ITimer {
public:
    SDL2Timer();
    double NowSeconds() const override;
    void   SleepSeconds(double s) override;
private:
    uint64_t start_ticks_;
    uint64_t freq_;
};
```

### 5.2 IWindow

```cpp
// engine/platform/i_window.h
struct WindowConfig {
    int         width = 1280, height = 720;
    std::string title = "Game";
    bool        resizable = true;
};

class IWindow {
public:
    virtual ~IWindow() = default;
    virtual void        SetTitle(const std::string& t) = 0;
    virtual int         GetWidth()  const = 0;
    virtual int         GetHeight() const = 0;
    virtual bool        ShouldClose() const = 0;
    virtual void        PollEvents() = 0;
    virtual void*       NativeHandle() const = 0;  // SDL_Window*
    virtual void*       NativeRenderer() const = 0; // SDL_Renderer*（SDL2 特有）
    Signal<int, int>    OnResize;   // (newW, newH)
    Signal<>            OnClose;
};
```

### 5.3 IInput

```cpp
// engine/platform/i_input.h

// 游戏无关的抽象动作——游戏层的 InputMapper 负责映射到具体按键
enum class InputAction {
    TapLane0, TapLane1, TapLane2,
    HoldLane0, HoldLane1, HoldLane2,
    Pause, Confirm, Back,
    PointerPress, PointerRelease
};

class IInput {
public:
    virtual ~IInput() = default;
    virtual void  BeginFrame() = 0;  // 帧首调用，更新 JustPressed 状态
    virtual bool  IsActionDown(InputAction a)        const = 0;
    virtual bool  IsActionJustPressed(InputAction a) const = 0;
    // 鼠标/触控位置（像素坐标）
    virtual float PointerX() const = 0;
    virtual float PointerY() const = 0;
};
```

### 5.4 IFileSystem

```cpp
// engine/platform/i_file_system.h
class IFileSystem {
public:
    virtual ~IFileSystem() = default;
    virtual std::vector<uint8_t> ReadBytes(const std::string& path) const = 0;
    virtual std::string          ReadText(const std::string& path)  const = 0;
    virtual bool                 Exists(const std::string& path)    const = 0;
    virtual void                 WriteText(const std::string& path,
                                           const std::string& data) = 0;
    virtual std::string          BasePath() const = 0; // 游戏资源根目录
};
```

---

## 6. L3 · Services 模块规格

> **原则**：Services 依赖 L1 接口 + L0 类型；同层 Services 互不直接调用；向 Game 层暴露 `Signal<T>` 而非回调指针。

### 6.1 AudioMixer

N 路音频通道，由游戏代码命名和使用。引擎不硬编码通道数量。

```cpp
// engine/services/audio_mixer.h

class AudioChannel {
public:
    void   Load(const std::string& absPath);
    void   Play(bool loop = false);
    void   Pause();
    void   Resume();
    void   Stop();
    void   SetVolume(float v);            // 0.0–1.0
    void   FadeTo(float target, float sec);
    double GetPositionSec() const;        // sample-accurate
    double GetDurationSec() const;
    bool   IsPlaying()  const;
    bool   IsEnded()    const;

    Signal<> OnEnded;
};

class AudioMixer {
public:
    explicit AudioMixer(IFileSystem& fs);
    ~AudioMixer();

    // 游戏代码按名字创建和获取通道
    AudioChannel& CreateChannel(const std::string& name);
    AudioChannel& GetChannel(const std::string& name);
    bool          HasChannel(const std::string& name) const;

    void Update(float dt);  // 处理 fade 等时序操作

private:
    ma_engine engine_;
    IFileSystem& fs_;
    std::unordered_map<std::string, std::unique_ptr<AudioChannel>> channels_;
};
```

**使用示例（Game Layer）**：
```cpp
// App 初始化时
mixer_.CreateChannel("bgm");
mixer_.CreateChannel("gameplay");
mixer_.CreateChannel("preview");

// 开始打歌时
mixer_.GetChannel("bgm").FadeTo(0.2f, 0.5f);
mixer_.GetChannel("gameplay").Load(song.filePath);
mixer_.GetChannel("gameplay").Play();
```

### 6.2 Renderer2D

只提供图元绘制，对游戏状态一无所知。游戏层的 Screen 类负责组装图元成游戏视觉。

```cpp
// engine/services/renderer2d.h

class Renderer2D {
public:
    explicit Renderer2D(IWindow& window);
    ~Renderer2D();

    void BeginFrame(Color clearColor = {0, 0, 0, 255});
    void EndFrame();   // SDL_RenderPresent

    // --- 图元接口（Game Layer 组合使用） ---
    void DrawSprite(SDL_Texture* tex, Vec2 pos, Vec2 size,
                    float alpha = 1.f, float rotation = 0.f);
    void DrawSpriteStretched(SDL_Texture* tex, AABB dest, float alpha = 1.f);
    void DrawRect(AABB rect, Color color);
    void DrawRectOutline(AABB rect, Color color, float thickness = 1.f);
    void DrawLine(Vec2 a, Vec2 b, Color color, float thickness = 1.f);
    void DrawCircle(Vec2 center, float radius, Color color);
    void DrawText(const std::string& text, Vec2 pos, Color color,
                  TTF_Font* font, float alpha = 1.f);

    // --- 纹理管理 ---
    // 内部使用 ResourceCache<string, SDL_Texture*>；游戏只需传路径
    SDL_Texture* GetTexture(const std::string& absPath);
    TTF_Font*    GetFont(const std::string& absPath, int ptSize);
    void         ReleaseAll();

    SDL_Renderer* Native() const;  // 偶有需要直接操作时使用

private:
    SDL_Renderer*    renderer_;
    IWindow&         window_;
    ResourceCache<std::string, SDL_Texture*> tex_cache_;
    ResourceCache<std::pair<std::string,int>, TTF_Font*> font_cache_;
};
```

### 6.3 InputMapper

把 `IInput` 的原始动作翻译成带时间戳的游戏事件，通过 `Signal` 向 Game 层广播。

```cpp
// engine/services/input_mapper.h

struct TapEvent  { int lane; double timestamp; };
struct HoldEvent { int lane; double timestamp; };

class InputMapper {
public:
    explicit InputMapper(IInput& input, ITimer& timer);

    void Update();  // 每帧调用一次；检测 JustPressed，emit 对应 Signal

    // Game Layer 订阅这些 Signal，Services 互不知道对方
    Signal<TapEvent>  OnTap;
    Signal<HoldEvent> OnHoldStart;
    Signal<HoldEvent> OnHoldEnd;
    Signal<>          OnPause;
    Signal<>          OnConfirm;
    Signal<>          OnBack;

private:
    IInput& input_;
    ITimer& timer_;
};
```

---

## 7. Game Layer 规格

> Game Layer 对 libengine 单向依赖，libengine 不引用任何 Game 头文件。

### 7.1 GameFSM（使用 StateMachine\<GameState\>）

```cpp
// game/game_fsm.h
enum class GameState {
    Home,              // 主界面
    Save,              // 存档槽选择
    Flow,              // VN 对话 / 日程消息 / 结算消息
    ServiceSelect,     // 顾客点单 → 玩家选择 service 曲目（新增）
    Select,            // 练习选曲
    Ready,             // 开始前倒计时
    LeadIn,            // 音符入场（负时间轴）
    Playing,           // 游戏进行中
    Paused,            // 暂停
    ResumeCountdown,   // 继续前 3-2-1
    Ended,             // 结算界面
    MenuEdit,          // 排班编辑器（仅练习自由日保留）
    Overview,          // 开店前预览（仅练习自由日保留）
};

// 转移表（与 HTML 版 TRANSITIONS 保持语义一致，新增 ServiceSelect）
inline StateMachine<GameState> MakeGameFSM() {
    using S = GameState;
    return StateMachine<GameState>(S::Home, {
        {S::Home,            {S::Save, S::Select, S::Flow}},
        {S::Save,            {S::Home, S::Flow}},
        {S::Flow,            {S::Flow, S::ServiceSelect, S::Ended, S::Home}},
        {S::ServiceSelect,   {S::Flow, S::Ready}},
        {S::Select,          {S::Home, S::Ready}},
        {S::Ready,           {S::LeadIn, S::Paused}},
        {S::LeadIn,          {S::Playing, S::Paused}},
        {S::Playing,         {S::Paused, S::Ended}},
        {S::Paused,          {S::ResumeCountdown, S::Ended, S::Select,
                               S::MenuEdit, S::Home}},
        {S::ResumeCountdown, {S::Playing, S::Paused}},
        {S::Ended,           {S::Home, S::MenuEdit, S::Ready, S::Select,
                               S::Flow, S::Ended}},
        {S::MenuEdit,        {S::Flow, S::Overview, S::Home}},
        {S::Overview,        {S::MenuEdit, S::Ready}},
    });
}
```

### 7.2 RhythmEngine（使用 Timeline\<NoteEvent\>）

```cpp
// game/rhythm/rhythm_engine.h

enum class NoteKind  { Tap, Press };
enum class NoteState { Pending, Holding, Done };

struct NoteEvent {
    int       id;
    NoteKind  kind;
    float     time;    // 判定时刻（秒，已含 audioOffset）
    float     end;     // Press 尾端（Tap 时 == time）
    int       lane;    // 0–2
    int       fruit;   // 水果图标索引
    bool      accent;
    float     travel;  // 下落时长（秒）
    NoteState state = NoteState::Pending;
};

struct JudgmentWindows { float perfect, great, good, miss; };

enum class JudgmentGrade { Perfect, Great, Good, Miss, EarlyRelease };
struct JudgmentResult { JudgmentGrade grade; float error; int noteId; };

struct ScoreState {
    int   combo = 0, maxCombo = 0;
    int   counts[5] = {};  // Perfect/Great/Good/Miss/EarlyRelease
    float acc = 0.f, timingTotal = 0.f;
    int   customerAnger = 0;
    float heat = 0.f;
};

class RhythmEngine {
public:
    void  LoadChart(Timeline<NoteEvent> timeline, JudgmentWindows windows);
    void  Reset();
    void  Update(float dt);
    float SongTime() const;

    void  BeginLeadIn();
    void  BeginPlayback(AudioChannel& track);

    JudgmentResult OnTap(int lane, float inputTime);
    JudgmentResult OnHoldStart(int lane, float inputTime);
    JudgmentResult OnHoldEnd(int lane, float inputTime);

    std::span<const NoteEvent> GetVisibleNotes() const;
    const ScoreState&          GetScore() const { return score_; }
    bool                       ShouldFinish() const;
    bool                       IsFailed() const;  // 顾客愤怒离场

    Signal<JudgmentResult> OnJudged;
    Signal<>               OnSongComplete;
    Signal<>               OnAngryLeave;

private:
    // ---- 时序 ----
    void AdvancePlaybackClock(float dt);
    float SongTimeInternal() const;

    Timeline<NoteEvent> timeline_;
    JudgmentWindows     windows_;
    AudioChannel*       track_ = nullptr;   // 借用，不拥有

    double  playback_visual_time_    = 0.0;
    double  sync_window_remaining_   = 0.0;
    double  lead_in_timer_           = 0.0;
    double  lead_in_total_           = 0.0;
    bool    in_lead_in_              = false;

    // ---- 判定 ----
    ScoreState score_;
    size_t     miss_cursor_ = 0;  // 下一个待扫描 Miss 的音符索引
    NoteEvent* active_hold_ = nullptr;

    // ---- 渲染辅助 ----
    mutable std::vector<const NoteEvent*> visible_scratch_;
};
```

**Lead-in 时间同步（完整保留 HTML 版逻辑，注释说明原因）**：

```cpp
void RhythmEngine::AdvancePlaybackClock(float dt) {
    double audioTime = track_->GetPositionSec();

    if (sync_window_remaining_ > 0) {
        // 启动后 0.32s 缓和窗：防止音频首帧跳变引起视觉抖动
        double target = std::clamp(audioTime,
                                   playback_visual_time_,
                                   audioTime + 0.12);
        sync_window_remaining_ -= dt;
        playback_visual_time_ = target;
    } else {
        // 单调限速追赶：每帧最多追 dt*1.35 秒，防止视觉暴跳
        double maxStep = std::max(dt * 1.35, 0.018);
        playback_visual_time_ = std::min(audioTime,
                                         playback_visual_time_ + maxStep);
    }
}
```

### 7.3 FlowPhaseRunner（DialogueVM，支持 service_select）

以「每种 Phase Type 对应一个 handler」的可扩展 VM 模式实现。新增 phase type 只需添加 handler，不修改核心流程。

```cpp
// game/dialogue/flow_phase_runner.h

enum class PhaseType {
    Dialogue,
    Service,
    ServiceSelect,    // 顾客描述需求 → 玩家选择曲目
    ScoreBranch,
    TrackEvent,
    Settlement,
    TutorialComplete,
};

struct DialogueNode {
    std::string speaker;   // "" = 居中旁白
    std::string text;
    std::string html;      // 可选，订单卡片等富文本
    std::string action;    // 现仅保留 "settlement"（startService 已被 ServiceSelect 替代）
};

struct ServiceOption {
    std::string songId;
    std::string label;
    std::string hint;
};

struct ServiceSelectPhase {
    std::string correctId;
    std::string menuId, slotId;
    bool        allowRetry = true;
    std::string customer;       // 显示名
    std::string selectTitle;
    std::string selectHint;
    std::vector<ServiceOption>  options;
    // songId → 错误对白节点；"_default" 为兜底
    std::unordered_map<std::string, std::vector<DialogueNode>> onWrong;
};

struct ScoreBranch {
    float min;
    std::vector<DialogueNode> nodes;
};

class FlowPhaseRunner {
public:
    explicit FlowPhaseRunner(IFileSystem& fs);

    void LoadFlow(const std::string& flowId); // e.g. "day1", "prologue"
    bool IsFinished() const;

    // 推进到下一 phase（Dialogue 结束后自动调用，无需手动触发）
    void AdvancePhase();

    // 当前 phase 类型
    PhaseType CurrentType() const;

    // --- 按 phase 类型取数据 ---
    const std::vector<DialogueNode>* GetDialogueNodes()   const; // PhaseType::Dialogue
    const ServiceSelectPhase*        GetServiceSelect()   const; // PhaseType::ServiceSelect
    std::string                      GetServiceSongId()   const; // PhaseType::Service
    const std::vector<ScoreBranch>*  GetScoreBranches()  const; // PhaseType::ScoreBranch
    const std::vector<DialogueNode>* GetAfterNodes()     const; // ScoreBranch shared after

    // score_branch 时由调用方注入上一次的 customer 分数
    void SetLastScore(float score);

    // --- 信号 ---
    Signal<std::string>                        OnStartService;      // songId
    Signal<const ServiceSelectPhase&>          OnServiceSelect;     // 展示选单
    Signal<float>                              OnSettlement;        // customer score
    Signal<>                                   OnTutorialComplete;
    Signal<std::string, std::string>           OnTrackEvent;        // songId, vipName

private:
    // 加载并平铺 phases 数组
    struct PhaseEntry { /* 内部表示 */ };
    std::vector<PhaseEntry> phases_;
    size_t cursor_ = 0;
    float  last_score_ = 0.f;
    IFileSystem& fs_;
};
```

### 7.4 SaveSystem

```cpp
// game/save/save_system.h

struct UpgradeState { int cutter = 1, blender = 1, sign = 1; };

struct PlayerSave {
    int  schemaVersion = 2;
    int64_t updatedAt  = 0;

    int  day        = 1;
    int  coins      = 0;
    int  reputation = 0;
    int  totalShifts = 0;
    int  totalMoney  = 0;

    bool firstShiftDone = false;
    UpgradeState upgrades;

    std::vector<std::string> learnedSongs;
    std::vector<std::string> bossLettersSeen;
    std::unordered_map<std::string, int> tutorialSeen;
};

class SaveSystem {
public:
    explicit SaveSystem(IFileSystem& fs);

    bool       Load(int slot, PlayerSave& out);
    bool       Save(int slot, const PlayerSave& data);
    bool       SlotExists(int slot) const;
    void       DeleteSlot(int slot);

    static constexpr int kMaxSlots = 3;

private:
    std::string SlotPath(int slot) const;
    IFileSystem& fs_;
};
```

---

## 8. 数据资产兼容性

**所有现有 JSON 资产在 C++ 版直接复用，零迁移成本。**

| 资产 | 路径 | C++ 加载方 | 格式变更 |
|------|------|-----------|---------|
| 谱面 | `charts/**/*.json` | `ChartLoader::Load()` → `Timeline<NoteEvent>` | 无 |
| 歌曲数据库 | `data/songs.json` | `SongDatabase::Load()` | `activeStart` 重命名为 `previewStartSec` |
| 难度配置 | `data/difficulties.json` | `DifficultyConfig::Load()` | 无 |
| 菜单项 | `data/menu_items.json` | `MenuDatabase::Load()` | 无 |
| 店铺配置 | `data/shop.json` | `ShopConfig::Load()` | 无 |
| 日程计划 | `data/day_plans.json` | `DayPlanManager::Load()` | 无 |
| 剧情流程 | `data/flows/*.json` | `FlowPhaseRunner::LoadFlow()` | **新增** `service_select` phase type（已兼容） |
| 音频文件 | `audio/**/*.m4a` | miniaudio 直接加载 | 无 |
| 图片资产 | `assets/**/*.png` | SDL2_image | 无 |

**`data/dialogue/prologue.json` 的处理**：C++ 版不再单独读取。其内容已对等于 `data/flows/prologue.json` 的 dialogue phase（HTML 版运行时实际也只用 dialogue/prologue.json）。迁移可通过简单 Python 脚本完成。

---

## 9. 目录结构与 CMake 组织

```
rhythm-fruit-shop/
├── libengine/
│   ├── CMakeLists.txt
│   ├── include/engine/
│   │   ├── core/
│   │   │   ├── math.h
│   │   │   ├── timeline.h
│   │   │   ├── state_machine.h
│   │   │   ├── event_queue.h
│   │   │   ├── signal.h
│   │   │   └── resource_cache.h
│   │   ├── platform/
│   │   │   ├── i_window.h
│   │   │   ├── i_input.h
│   │   │   ├── i_file_system.h
│   │   │   └── i_timer.h
│   │   └── services/
│   │       ├── audio_mixer.h
│   │       ├── renderer2d.h
│   │       └── input_mapper.h
│   ├── src/
│   │   ├── platform/
│   │   │   ├── sdl2/
│   │   │   │   ├── sdl2_window.h/cpp
│   │   │   │   ├── sdl2_input.h/cpp
│   │   │   │   └── sdl2_timer.h/cpp
│   │   │   └── native/
│   │   │       └── native_file_system.h/cpp
│   │   └── services/
│   │       ├── audio_mixer.cpp
│   │       ├── renderer2d.cpp
│   │       └── input_mapper.cpp
│   └── tests/
│       ├── CMakeLists.txt
│       ├── test_math.cpp
│       ├── test_timeline.cpp
│       ├── test_state_machine.cpp
│       ├── test_event_queue.cpp
│       └── test_signal.cpp
│
├── games/
│   └── rhythm-fruit-shop-cpp/
│       ├── CMakeLists.txt
│       ├── vcpkg.json
│       ├── CMakePresets.json
│       ├── vendor/
│       │   ├── miniaudio/miniaudio.h
│       │   ├── nlohmann/json.hpp
│       │   └── stb/stb_image.h
│       ├── src/
│       │   ├── main.cpp
│       │   ├── app.h/cpp              ← 主循环；持有所有子系统
│       │   ├── game_fsm.h             ← GameState enum + 转移表
│       │   ├── rhythm/
│       │   │   ├── rhythm_engine.h/cpp
│       │   │   ├── chart_loader.h/cpp
│       │   │   └── note_data.h
│       │   ├── dialogue/
│       │   │   ├── flow_phase_runner.h/cpp
│       │   │   └── flow_loader.h/cpp
│       │   ├── screens/
│       │   │   ├── home_screen.h/cpp
│       │   │   ├── flow_screen.h/cpp
│       │   │   ├── service_select_screen.h/cpp
│       │   │   ├── gameplay_screen.h/cpp
│       │   │   └── result_screen.h/cpp
│       │   ├── data/
│       │   │   ├── song_database.h/cpp
│       │   │   ├── difficulty_config.h/cpp
│       │   │   └── shop_config.h/cpp
│       │   └── save/
│       │       └── save_system.h/cpp
│       └── tests/
│           ├── test_rhythm_engine.cpp
│           ├── test_flow_phase_runner.cpp
│           └── test_save_system.cpp
│
├── data/           ← 共享（HTML 版和 C++ 版同用）
├── audio/
├── charts/
└── assets/
```

### 9.1 CMake 结构

**libengine/CMakeLists.txt**：
```cmake
cmake_minimum_required(VERSION 3.25)
project(libengine CXX)
set(CMAKE_CXX_STANDARD 20)

# L0 Core: header-only INTERFACE library（无需编译）
add_library(engine_core INTERFACE)
target_include_directories(engine_core INTERFACE include)

# L1 Platform + L3 Services: STATIC library
add_library(engine STATIC
    src/platform/sdl2/sdl2_window.cpp
    src/platform/sdl2/sdl2_input.cpp
    src/platform/sdl2/sdl2_timer.cpp
    src/platform/native/native_file_system.cpp
    src/services/audio_mixer.cpp
    src/services/renderer2d.cpp
    src/services/input_mapper.cpp
)
target_include_directories(engine PUBLIC include)
target_link_libraries(engine
    PUBLIC  engine_core
    PRIVATE SDL2::SDL2 SDL2_image::SDL2_image SDL2_ttf::SDL2_ttf)

# Tests（只测 L0，无需 SDL2）
enable_testing()
add_subdirectory(tests)
```

**games/rhythm-fruit-shop-cpp/CMakeLists.txt**：
```cmake
cmake_minimum_required(VERSION 3.25)
project(RhythmFruitCpp CXX)
set(CMAKE_CXX_STANDARD 20)

find_package(SDL2 CONFIG REQUIRED)
find_package(SDL2_image CONFIG REQUIRED)
find_package(SDL2_ttf CONFIG REQUIRED)

# vendor header-only 库
add_library(miniaudio INTERFACE)
target_include_directories(miniaudio INTERFACE vendor/miniaudio)
add_library(nlohmann_json INTERFACE)
target_include_directories(nlohmann_json INTERFACE vendor/nlohmann)
add_library(stb_image INTERFACE)
target_include_directories(stb_image INTERFACE vendor/stb)

add_subdirectory(../../libengine libengine_build)

add_executable(RhythmFruit
    src/main.cpp
    src/app.cpp
    src/rhythm/rhythm_engine.cpp
    src/rhythm/chart_loader.cpp
    src/dialogue/flow_phase_runner.cpp
    src/dialogue/flow_loader.cpp
    src/screens/home_screen.cpp
    src/screens/flow_screen.cpp
    src/screens/service_select_screen.cpp
    src/screens/gameplay_screen.cpp
    src/screens/result_screen.cpp
    src/data/song_database.cpp
    src/data/difficulty_config.cpp
    src/save/save_system.cpp
)
target_link_libraries(RhythmFruit
    PRIVATE engine miniaudio nlohmann_json stb_image)
```

### 9.2 CMakePresets.json（跨平台构建）

```json
{
  "version": 3,
  "configurePresets": [
    {
      "name": "windows-vcpkg",
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/build/windows",
      "cacheVariables": {
        "CMAKE_TOOLCHAIN_FILE": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake",
        "CMAKE_BUILD_TYPE": "Debug"
      }
    },
    {
      "name": "macos-vcpkg",
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/build/macos",
      "cacheVariables": {
        "CMAKE_TOOLCHAIN_FILE": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake",
        "CMAKE_BUILD_TYPE": "Debug"
      }
    }
  ]
}
```

---

## 10. 已知问题与 C++ 修复

| # | HTML 版问题 | C++ 修复方案 |
|---|-------------|-------------|
| 1 | `startServiceTransition` 硬编码 `'lemon_water'` | `FlowPhaseRunner` 从 `service_select.correctId` 读取，完全 data-driven |
| 2 | `service_select` 未在架构文档中体现 | 完整规格见 §7.3；`ServiceSelect` FSM 状态已加入转移表 |
| 3 | `flows/*.json` 与 `dialogue/prologue.json` 双数据源 | C++ 版统一读 `flows/*.json`；`FlowPhaseRunner` 单一解释器 |
| 4 | FSM `TRANSITIONS` 表仅测试用，运行时不校验 | `StateMachine<T>::TryTransition()` 强校验，所有状态变更走同一接口 |
| 5 | `Renderer2D` 含 `DrawPlaying()` 等游戏状态函数 | 移入 Game Layer 的 `GameplayScreen`；引擎层只有图元接口 |
| 6 | `AudioEngine` 硬编码 3 条流 | `AudioMixer` 支持 N 路命名通道 |
| 7 | `drawProducts` / `drawCustomer` 死亡代码 | 正式实现或删除；不留灰色代码 |
| 8 | `flowBody.innerHTML = node.html` 无 XSS 防护 | 改为纯文本渲染（SDL2_ttf）；HTML 注入接口不存在 |
| 9 | PreviewClip crossfade 用 `setTimeout` 递归调度，边界条件脆弱 | `AudioChannel` 用 miniaudio 的 `ma_sound` 精确调度 |
| 10 | VN 系统与 `showFlowMessage` 共享同一 `#flowPanel`，耦合重 | `FlowScreen` 与 `ServiceSelectScreen` 各自独立；通过 FSM 状态区分 |
| 11 | `activeStart` 语义模糊 | `SongDatabase` 中重命名为 `previewStartSec` |
| 12 | 音频 prime 受浏览器策略约束 | 桌面 Native 无此问题；miniaudio 不受浏览器策略约束 |

---

## 11. 开发里程碑

> 每个里程碑标注**引擎概念**和**仿真工程映射**，使每一步工作都有明确的知识收益。

---

### M0：Engine Core 骨架（预计 1 周）

**学习目标**：在没有任何游戏代码的情况下，把引擎的基础设施建好、测好。

**任务**：
- [ ] 创建 `libengine/` CMake 项目，配置 Google Test
- [ ] 实现并测试 `engine::Math`（Vec2, AABB, lerp, clamp）
- [ ] 实现并测试 `engine::Timeline<T>`（插入、区间查询、LastBefore）
- [ ] 实现并测试 `engine::StateMachine<T>`（转移校验、OnTransition 信号）
- [ ] 实现并测试 `engine::EventQueue<T>`（Push/Pop/HasReady）
- [ ] 实现并测试 `engine::Signal<Args...>`（Connect/Disconnect/Emit）
- [ ] 实现并测试 `engine::ResourceCache<K,V>`（Get/Evict/Clear）

**验收标准**：`libengine/tests` 全绿；整个 L0 编译时不引用 SDL2 或 miniaudio 任何头文件。

**引擎概念**：纯数据结构设计，模板编程，单元测试驱动开发。  
**仿真工程映射**：`Timeline<T>` 和 `EventQueue<T>` 是离散事件仿真（DES）引擎的核心容器；你在这一步实际上完成了 DES 基础层。

---

### M1：Hello Platform（预计 1–2 周）

**学习目标**：建立从 `main()` 到第一帧的完整管道；理解游戏主循环和固定步长。

**任务**：
- [ ] 创建 `games/rhythm-fruit-shop-cpp/` CMake 项目，连接 `libengine`
- [ ] 实现 `SDL2Window`（`IWindow`）、`SDL2Timer`（`ITimer`）、`NativeFileSystem`（`IFileSystem`）
- [ ] 实现 `App::Run()` 主循环：固定步长（60 Hz update）+ 可变渲染步长；用 accumulator 模式
- [ ] miniaudio 初始化，`AudioMixer` 创建 "test" 通道，加载并播放一首 `.m4a`
- [ ] 基础 `InputMapper`：检测键盘 A/S/D 对应 Lane0/1/2，打印到控制台
- [ ] `Renderer2D::BeginFrame / EndFrame`；绘制一个彩色矩形

**验收标准**：窗口打开，播放 `audio/service/fruit_cup.m4a`，按 A/S/D 控制台有输出，矩形可见。

**引擎概念**：固定步长 vs 可变步长；accumulator 模式防止「死亡螺旋」；平台抽象接口。  
**仿真工程映射**：固定步长主循环就是仿真步进（simulation tick）；accumulator 是实时仿真中防时间泄漏的标准方案。

---

### M2：音符下落（预计 2–3 周）

**学习目标**：实现可以「打一首歌」的最小节奏核心；理解音画同步。

**任务**：
- [ ] `ChartLoader`：加载 `charts/service/fruit_cup.json` → `Timeline<NoteEvent>`
- [ ] `RhythmEngine`：Lead-in 负时间轴 + `AdvancePlaybackClock` 平滑同步
- [ ] `GameplayScreen`：使用 `Renderer2D` 图元绘制 conveyor、tap/press notes（程序化，无图片）
- [ ] 判定系统：Perfect/Great/Good/Miss；`InputMapper::OnTap` → `RhythmEngine::OnTap`
- [ ] 基础 HUD：combo、judge 文字（SDL2_ttf）
- [ ] `GameFSM` 最小链路：Home → Ready → LeadIn → Playing → Ended

**验收标准**：能完整打通 `fruit_cup` 一遍，判定反馈正确，lead-in 无视觉卡顿，Miss 自动判定。

**引擎概念**：`Timeline<NoteEvent>` 的实时查询；音频时钟 vs 视觉时钟的同步策略；Signal 解耦输入与游戏逻辑。  
**仿真工程映射**：`AdvancePlaybackClock` 就是仿真时钟推进；Miss 扫描就是 DES 的超时事件处理。

---

### M3：完整练习模式（预计 3–4 周）

**学习目标**：多系统集成；资源生命周期管理；完整 FSM 覆盖。

**任务**：
- [ ] 全部 13 个 FSM 状态实现（含 ServiceSelect 占位）
- [ ] Pause / ResumeCountdown 完整实现（含冻结时钟逻辑）
- [ ] `SongDatabase` + `DifficultyConfig` 加载（复用 HTML 版 JSON 格式）
- [ ] `SelectScreen`：歌曲列表 + 封面图片（`Renderer2D::GetTexture`）
- [ ] `PreviewPlayer`：`AudioChannel("preview")` crossfade loop
- [ ] `ResultScreen`：Rank / Perfect/Great/Good/Miss / MaxCombo / Timing%
- [ ] BGM：`AudioChannel("bgm")` 同 BGM 不重置（对应 HTML 版 `menuLoop`）
- [ ] 单元测试：FSM 转移表完整覆盖；lead-in 时钟单调性；判定窗精度

**验收标准**：可选任意一首歌，打完，查成绩，返回选曲，体验无明显卡顿或时钟漂移。

**引擎概念**：`ResourceCache<string, SDL_Texture*>` 管理纹理生命周期；多 AudioChannel 并发。  
**仿真工程映射**：多子系统集成 = 多 Agent 协作；每个 Screen 是一个独立的渲染 Agent。

---

### M4：剧情流程（预计 3–4 周）

**学习目标**：data-driven 可扩展 VM 设计模式；SaveSystem 持久化；service_select 完整实现。

**任务**：
- [ ] `SaveSystem`：三存档槽，JSON 持久化到文件
- [ ] `FlowPhaseRunner`：加载 `flows/prologue.json`，支持 `dialogue`, `service`, `service_select`, `score_branch`, `settlement`, `tutorial_complete`
- [ ] `FlowScreen`：VN 对话渲染（speaker、旁白、订单卡片）
- [ ] `ServiceSelectScreen`：从 `ServiceSelectPhase` 渲染选单；处理正确/错误路径
- [ ] Day 1 tutorial：`tutorial_roleplay → tutorial_select → service → tutorial_result_vn → tutorial_complete`
- [ ] 序章（`flows/prologue.json`）完整可跑
- [ ] `DayPlanManager`：`day_plans.json` 加载、解锁逻辑

**验收标准**：新建存档 → 序章 → Day 1 柚子扮演顾客训练 → 正式第一天流程，完整链路无断点。

**引擎概念**：可扩展 VM 模式（Phase Type + Handler 分离）；data-driven 架构使新增功能无需修改 VM 核心。  
**仿真工程映射**：`FlowPhaseRunner` 是一个简单的脚本化 Agent 行为系统——这正是交通仿真中车辆决策脚本的原型。

---

### M5：可分发 Demo（预计 4–6 周）

**学习目标**：性能剖析、打包发布、完整游戏体验。

**任务**：
- [ ] Day 1–5 所有 VIP 首次登场剧情完整实现
- [ ] `service_select` 正确/错误对白全部联调
- [ ] VIP 立绘接入（PNG 纹理）
- [ ] 全部 service 曲目（fruit_cup、lemon_water 等）可用
- [ ] 完整主题切换（sunny / neon_night / clean_mobile）
- [ ] 性能剖析：目标 ≥ 120 FPS / 帧时间 ≤ 8ms（无 V-Sync，M1 MacBook Pro 基准）
- [ ] Windows（MSVC）+ macOS（clang）打包验证
- [ ] README + 操作说明 + 已知问题清单

**验收标准**：陌生玩家可独立安装、运行、完成序章、体验至少 3 位 VIP 首次登场。

**引擎概念**：profile-guided optimization；静态链接 vs 动态链接；跨平台 CI。  
**仿真工程映射**：M5 是「仿真结果发布」——确保仿真在目标机器上以足够的时间分辨率运行。

---

## 附录 A：节奏游戏即离散事件仿真

节奏引擎不只是一个打歌系统——它本质上是一个**实时离散事件仿真（Real-Time Discrete Event Simulation）**。建立这个映射，是通往交通仿真、物理仿真等 Simulation Engineer 岗位的捷径。

| 节奏游戏概念 | 仿真工程概念 | 对应代码 |
|---|---|---|
| Song time / `playbackVisualTime` | **仿真时钟** | `RhythmEngine::SongTime()` |
| 音符表 | **事件调度表** | `Timeline<NoteEvent>` |
| Lead-in 负时间轴 | **仿真 warm-up 阶段** | `lead_in_timer_` |
| 判定窗 `±ms` | **事件容差 / epsilon** | `JudgmentWindows` |
| Miss 扫描（`miss_cursor_`） | **超时事件处理** | `EventQueue<T>` 模式 |
| 游戏主循环 fixed-step | **仿真步进（tick）** | `App::Run()` accumulator |
| `AdvancePlaybackClock()` 单调限速 | **时钟同步与漂移修正** | Leaky integrator 模式 |
| `StateMachine<GameState>` | **Agent 状态机** | `GameFSM` |
| `Signal<TapEvent>` 解耦 | **事件总线（Message Bus）** | `InputMapper → RhythmEngine` |
| 结算统计（rep/money/customer%） | **仿真输出指标（KPI）** | `ScoreState` |
| `ResourceCache<K,V>` | **仿真资源池** | `Renderer2D` 纹理缓存 |

**关键洞见**：

1. 节奏引擎的「音画同步问题」和交通仿真的「实时/步进时钟对齐问题」是同一个问题的两种表现：如何让视觉时钟（离散帧率）准确跟踪物理时钟（连续音频/物理积分）。`AdvancePlaybackClock` 的单调限速追赶算法，在数值积分领域有对应的稳定化方案。

2. `Timeline<T>` 的区间查询（`QueryRange`）在交通仿真里变成「哪些车辆在 t 秒到 t+dt 秒内到达路口」的查询——完全相同的数据结构，不同的 `T`。

3. `StateMachine<GameState>` 管理玩家 UI 状态；在多 Agent 交通仿真里，每辆车都是一个 `StateMachine<VehicleState>`。实现一次，复用到数百个 Agent。

---

## 附录 B：miniaudio 精度优势

HTML 版中 `Audio.currentTime` 的更新频率约为 250ms（4次/秒），导致必须使用 `playbackVisualTime` 平滑算法来遮盖量化误差。

miniaudio 的 `ma_sound_get_cursor_in_seconds()` 返回基于实际 PCM 样本位置计算的时间：

| 指标 | HTML Audio | miniaudio（44100 Hz） |
|------|-----------|----------------------|
| 时间分辨率 | ~4ms（250 Hz 更新） | ~22.7 μs（= 1/44100） |
| 精度来源 | 浏览器事件回调 | PCM 样本计数器 |
| 平滑算法必要性 | 必须（遮盖 4ms 量化） | 仍推荐（防首帧跳变） |

结论：C++ 版保留 `AdvancePlaybackClock` 的平滑逻辑（它处理的是音频设备缓冲区延迟，不仅仅是量化问题），但可以将 `PLAY_START_SYNC_WINDOW`（0.32s 缓和窗口）适当缩小。

---

## 附录 C：RenderContext 结构

每帧由 `GameplayScreen` 构建，传递给所有绘制函数，避免全局状态。

```cpp
// game/screens/gameplay_screen.h

struct RenderContext {
    // 布局（像素坐标，由窗口尺寸计算）
    float laneTop, laneBottom, hitY;
    float laneWidth;
    std::function<float(int lane)> NoteX;  // lane index → 像素 X

    // 游戏状态快照（只读）
    GameState  state;
    float      songTime;
    float      leadInTimer, leadInTotal;
    float      readyTimer;
    std::span<const NoteEvent> notes;

    // 视觉参数
    float       noteAlpha;
    std::string theme;  // "day" | "sunny" | "night"

    // HUD 数据
    int    combo, maxCombo;
    float  timing;         // acc / timingTotal
    float  customerMood;   // 0–100
    float  heat;
};
```

---

*文档版本 v2.0 · 更新于 2026-05-11*
