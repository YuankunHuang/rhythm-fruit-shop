# 《节奏鲜果铺》Technical Design Document

> **版本**：v1.0  
> **目标平台**：Windows / macOS（桌面，C++ Native）  
> **文档目的**：为 C++ Native 版本的完整实现提供技术决策基准、架构规格和开发路线图。  
> **前提**：HTML 原型已完成玩法验证（完整 FSM、音频同步、26 首谱面、VN 对话、完整游戏循环）。C++ 版不是翻译，是基于对原型深刻理解的架构升级。

---

## 目录

1. [目标与约束](#1-目标与约束)
2. [技术栈选型](#2-技术栈选型)
3. [系统分层架构](#3-系统分层架构)
4. [核心子系统规格](#4-核心子系统规格)
5. [数据资产兼容性](#5-数据资产兼容性)
6. [目录结构与 CMake 组织](#6-目录结构与-cmake-组织)
7. [已知问题与 C++ 修复](#7-已知问题与-c-修复)
8. [开发里程碑](#8-开发里程碑)

---

## 1. 目标与约束

### 1.1 学习目标（第一优先级）

本项目是从 Unity C# Gameplay Dev 向 C++ Engine Dev 转型的第一步。技术目标按优先级排序：

1. 掌握 C++ 内存管理、构建系统、跨平台开发
2. 理解音频引擎内部实现（音频解码、精确计时、多流并发）
3. 掌握 2D 渲染管线（纹理、批渲染、缓存策略）
4. 实现可扩展的系统架构，为后续 FPS 和交通仿真游戏预留接口

### 1.2 三游戏路线的技术递进

```
音游（当前）    →  FPS              →  交通仿真
─────────────     ─────────────       ─────────────────────
音频引擎          3D 渲染管线         大量实体 AI / 寻路
2D 渲染           物理 / 碰撞         需求建模 / 系统仿真
状态机框架        摄像机系统          ECS 实体管理
精确计时器        资源流管理          仿真引擎接口
JSON 数据层       脚本层              数据可视化层
```

Platform Layer 和 Engine Layer 在三款游戏间**共享复用**；Game Layer 按游戏替换。

### 1.3 不做什么（范围约束）

- **不做 1:1 翻译**：C++ 版架构应优于 HTML 版，不受原型技术债约束
- **不做早期 3D**：音游用 SDL2_Renderer，第二款游戏再升级 OpenGL
- **不做引擎中间件**：不用 Unreal / Unity；所有引擎层代码自己写
- **不做过早优化**：M1-M3 以正确性为主，M4 以后才考虑性能剖析

---

## 2. 技术栈选型

### 2.1 选型总表

| 层次 | 库 | 版本基准 | 引入方式 | 选型理由 |
|------|-----|---------|---------|---------|
| 窗口 / 输入 | **SDL2** | ≥ 2.28 | vcpkg | 薄封装、跨平台、不替你思考；工业界广泛用于2D游戏原型 |
| 2D 渲染 | **SDL2_renderer** + **SDL2_image** | 随 SDL2 | vcpkg | 音游不需要 Shader；第二款游戏再升 OpenGL |
| 字体 | **SDL2_ttf** | 随 SDL2 | vcpkg | UI 文字渲染，内置 FreeType |
| 音频引擎 | **miniaudio** | ≥ 0.11 | header-only | 无依赖；m4a/AAC 解码内置；sample-accurate 位置查询（比 Web Audio currentTime 更精准） |
| JSON 解析 | **nlohmann/json** | ≥ 3.11 | header-only | 复用全部现有 JSON 资产，零迁移成本 |
| 图片解码 | **stb_image** | 当前版 | header-only | 轻量；PNG/JPEG 支持 |
| 构建系统 | **CMake** | ≥ 3.25 | — | 业界标准 |
| 依赖管理 | **vcpkg** | manifest 模式 | — | SDL2 系列用 vcpkg；header-only 库直接 vendor |
| 单元测试 | **Google Test** | ≥ 1.14 | vcpkg | 测试判定窗、FSM 转换、时间同步逻辑 |

### 2.2 关键选型说明

**为什么用 SDL2 而非 SFML / raylib**  
SDL2 是最薄的封装，强迫你理解平台底层。SFML 抽象程度更高，会隐藏重要的系统概念。raylib 适合快速 demo，但对引擎学习帮助较小。SDL2 → OpenGL 的升级路径也最清晰。

**为什么用 miniaudio 而非 OpenAL**  
OpenAL 历史遗留问题多，配置复杂。miniaudio 单头文件，API 简洁，`ma_sound_get_cursor_in_seconds()` 提供 sample-accurate 播放位置查询，比 HTML Audio 的 `currentTime`（约 4ms 量化）精度更高，对音游至关重要。

**为什么用 nlohmann/json**  
现有 26 个谱面文件、songs.json、difficulties.json、menu_items.json 全部无需格式迁移，直接加载。不需要为 C++ 版设计新数据格式。

---

## 3. 系统分层架构

```
┌────────────────────────────────────────────────────────────┐
│                    Application Entry                        │
│                   main.cpp / App::Run()                    │
└────────────────────────────┬───────────────────────────────┘
                             │ 持有
             ┌───────────────▼───────────────┐
             │           Game Layer           │
             │                               │
             │  GameStateMachine             │
             │  RhythmEngine                 │
             │  DialogueVM                   │
             │  MenuSystem / DayRunManager   │
             │  SaveSystem                   │
             └───────────────┬───────────────┘
                             │ 依赖
             ┌───────────────▼───────────────┐
             │          Engine Layer          │
             │                               │
             │  AudioEngine (miniaudio)      │
             │  Renderer2D  (SDL2_renderer)  │
             │  InputManager (SDL2 events)   │
             │  AssetManager                 │
             │  Timer (SDL_GetPerformanceCounter) │
             │  EventBus                     │
             └───────────────┬───────────────┘
                             │ 依赖
             ┌───────────────▼───────────────┐
             │         Platform Layer         │
             │                               │
             │  Window (SDL_Window)          │
             │  GLContext / Renderer handle  │
             │  FileSystem abstraction       │
             └────────────────────────────────┘
```

**层次规则**：
- 上层可以调用下层；下层**不得**反向依赖上层
- Game Layer 通过 EventBus 接收来自 Engine Layer 的事件（如音频播放结束），不直接轮询
- Platform Layer 的接口用抽象基类定义，具体 SDL2 实现位于 `platform/sdl2/` 下，便于未来替换

---

## 4. 核心子系统规格

### 4.1 GameStateMachine

**状态枚举**（与 `src/state.js` 完全对应）：

```cpp
enum class GameState {
    Home,             // 主界面
    Save,             // 存档槽选择
    Flow,             // VN 对话 / 日程消息 / 结算
    MenuEdit,         // 排班编辑器
    Overview,         // 开店前预览
    Select,           // 练习选曲
    Ready,            // 开始前倒计时
    LeadIn,           // 音符入场（负时间轴）
    Playing,          // 游戏进行中
    Paused,           // 暂停
    ResumeCountdown,  // 继续前 3-2-1
    Ended             // 结算
};
```

**接口规格**：

```cpp
class GameStateMachine {
public:
    GameState Current() const;
    bool TryTransition(GameState next);   // 强校验，失败时 assert + log
    void ForceTransition(GameState next); // 仅测试用

    // 观察者注册（替代 HTML 版全局 state 字符串的隐式耦合）
    void OnEnter(GameState s, std::function<void()> cb);
    void OnExit(GameState s, std::function<void()> cb);

private:
    GameState current_ = GameState::Home;
    // 邻接表，与 state.js 的 TRANSITIONS 保持一致
    static const std::unordered_map<GameState, std::unordered_set<GameState>> kTransitions;
};
```

**修复 HTML 版问题**：HTML 版 `TRANSITIONS` 邻接表仅在单元测试中使用，运行时不验证。C++ 版 `TryTransition` 在所有状态变更点强制校验，不允许绕过。

---

### 4.2 AudioEngine

音频系统管理三条并发流，全部基于 miniaudio：

```
AudioEngine
 ├── Stream: MenuBGM        (HTML Audio 等价，环境音乐)
 ├── Stream: GameplayTrack  (正式打歌轨)
 └── Stream: PreviewClip    (选曲试听，Web Audio 等价)
```

**核心接口**：

```cpp
class AudioEngine {
public:
    // --- MenuBGM ---
    void LoadMenuBGM(const std::string& file);
    void PlayMenuBGM(bool fromStart = false);  // fromStart=false → 同 BGM 续播
    void FadeMenuBGM(float targetVolume, float durationSec);
    void StopMenuBGM();

    // --- GameplayTrack ---
    void LoadGameplayTrack(const std::string& file);
    void PrimeGameplayTrack();    // 解码预热（等价 JS primeAudio）
    void PlayGameplayTrack();
    void PauseGameplayTrack();
    void ResumeGameplayTrack();
    double GetPlaybackPosition() const; // sample-accurate，单位：秒
    double GetTrackDuration() const;
    bool IsTrackEnded() const;

    // --- PreviewClip ---
    void LoadPreviewAsync(const std::string& file, float startSec, float clipLen,
                          std::function<void()> onReady);
    void PlayPreview();           // 带 crossfade loop
    void StopPreview(bool fade);

private:
    ma_engine engine_;   // miniaudio engine
    // 三流各自持有 ma_sound / ma_audio_buffer_ref
};
```

**Lead-in 时间同步（完整保留 HTML 版逻辑）**：

```cpp
// RhythmEngine 内部，每帧调用
void AdvancePlaybackClock(float dt) {
    double audioTime = audio_.GetPlaybackPosition();

    if (sync_window_remaining_ > 0) {
        // 启动缓和窗口（0.32s），防止音频跳变引起视觉抖动
        double target = std::clamp(audioTime, prev_visual_time_, audioTime + 0.12);
        sync_window_remaining_ -= dt;
        playback_visual_time_ = target;
    } else {
        double target = audioTime;
        // 单调限速追赶：每帧追赶不超过 dt*1.35，防爆跳
        double maxStep = std::max(dt * 1.35, 0.018);
        playback_visual_time_ = std::min(target, playback_visual_time_ + maxStep);
    }
    prev_visual_time_ = playback_visual_time_;
}
```

**Lead-in 负时间轴**：`LeadIn` 状态下 `SongTime()` 返回负值（从 `-leadInTotal` 增到 `0`），`Playing` 状态下返回 `playback_visual_time_`，其余状态返回 `0`。与 HTML 版完全对齐。

---

### 4.3 RhythmEngine

**Note 数据结构**：

```cpp
enum class NoteKind { Tap, Press };
enum class NoteState { Pending, Holding, Done };

struct Note {
    int         id;
    NoteKind    kind;
    float       time;       // 判定时刻（秒，已含 audioOffset）
    float       end;        // Press 尾端（Tap 时 == time）
    int         lane;       // 0-2
    int         fruit;      // fruit 图标索引
    bool        accent;
    NoteState   state = NoteState::Pending;

    // 渲染辅助（从 difficulty 推导，不持久化）
    float travel;    // 从出现到判定的下落时长（秒）
    float appear;    // = time - travel（出现时刻）
};
```

**判定窗（从 `data/difficulties.json` 加载）**：

```cpp
struct JudgmentWindows {
    float perfect;  // ±秒
    float great;
    float good;
    float miss;
};
```

**核心方法**：

```cpp
class RhythmEngine {
public:
    void LoadChart(const ChartData& chart, const DifficultyConfig& diff);
    void Reset();
    void Update(float dt);           // 每帧：更新时钟、检测完成条件
    float SongTime() const;          // 当前视觉游戏时间
    void BeginLeadIn();
    void BeginPlayback();

    JudgmentResult OnTap(int lane, float inputTime);
    JudgmentResult OnPressStart(int lane, float inputTime);
    JudgmentResult OnPressEnd(int lane, float inputTime);

    // 渲染查询
    std::span<const Note> GetVisibleNotes(float t) const;
    float GetLeadInProgress() const;
    bool ShouldFinish() const;

private:
    std::vector<Note>   notes_;
    double              playback_visual_time_ = 0.0;
    double              lead_in_timer_        = 0.0;
    double              lead_in_total_        = 0.0;
    float               sync_window_remaining_;
    AudioEngine*        audio_;     // 借用，不拥有
};
```

---

### 4.4 DialogueVM（VN 对话虚拟机）

**修复 HTML 版双数据源问题**：HTML 版中 `dialogue/prologue.json` 和 `flows/*.json` 并存且互相独立，运行时实际只读 `dialogue/prologue.json`，`flows/` 仅作文档用。C++ 版统一为 `flows/*.json` 单一数据源，`DialogueVM` 负责完整解释。

**统一 JSON Schema**（扩展现有 `flows/` 格式）：

```jsonc
// flows/prologue.json (扩展后)
{
  "id": "prologue",
  "phases": [
    {
      "type": "dialogue",
      "nodes": [
        { "speaker": "",    "text": "..." },   // speaker=="" → 居中旁白
        { "speaker": "柚子", "text": "..." },
        { "speaker": "",    "action": "startService" }
      ]
    },
    {
      "type": "service",
      "serviceId": "lemon_water"               // 不再硬编码
    },
    {
      "type": "score_branch",
      "branches": {
        "good":  { "min": 88, "nodes": [...] },
        "ok":    { "min": 62, "nodes": [...] },
        "bad":   {            "nodes": [...] }
      },
      "shared": [...]
    }
  ]
}
```

**核心接口**：

```cpp
struct DialogueNode {
    std::string speaker;  // "" = 旁白/居中
    std::string text;
    std::string action;   // "startService" | "settlement" | ""
};

class DialogueVM {
public:
    void LoadFlow(const std::string& flowId);
    bool Advance();          // 推进到下一节点；返回 false 表示流程结束
    const DialogueNode* CurrentNode() const;
    void SetScoreForBranch(float score);  // score_branch 时调用

private:
    std::vector<DialogueNode> queue_;
    size_t cursor_ = 0;
    float  branch_score_ = 0.f;
};
```

---

### 4.5 Renderer2D

等价 `src/render.js` 的 `drawFrame`，保留六分支逻辑：

```cpp
class Renderer2D {
public:
    void BeginFrame();
    void EndFrame();

    // 六种状态对应的绘制入口（与 HTML 版 drawFrame 分支一一对应）
    void DrawReady(const RenderContext& rc);
    void DrawLeadIn(const RenderContext& rc);
    void DrawPlaying(const RenderContext& rc);
    void DrawPaused(const RenderContext& rc);
    void DrawResumeCountdown(const RenderContext& rc);
    void DrawInactive(const RenderContext& rc);  // HOME/FLOW/ENDED 等

    // 子组件
    void DrawNote(const Note& n, float t, const RenderContext& rc);
    void DrawConveyor(const RenderContext& rc);
    void DrawHUD(const RenderContext& rc);
    void DrawPauseOverlay(const RenderContext& rc);
    void DrawVNPanel(const DialogueNode& node, bool narrationMode);

    // 背景缓存（等价 _ensureBackdropCache）
    void InvalidateBackdropCache();

private:
    SDL_Renderer*   renderer_;
    SDL_Texture*    backdrop_cache_ = nullptr;
    BackdropCacheKey cache_key_;
};
```

**Note 渲染规则（与 HTML 版对齐）**：
- `noteY = hitY - ((time - t) / travel) * (hitY - laneTop)`，无顶部截断（允许音符从视口外落入）
- 渐入：`fade = clamp((t - appear) / 0.18, 0, 1)`
- 迟滞淡出：Pending 且 `t > note.time` 时 `lateFade` 随时间衰减
- `vn-narration-mode`（`speaker == ""`）：居中显示，无发言人标签，字体斜体

---

### 4.6 AssetManager

```cpp
class AssetManager {
public:
    // 纹理（SDL_Texture*）
    SDL_Texture* LoadTexture(const std::string& path);
    void ReleaseTexture(const std::string& path);

    // 字体（TTF_Font*）
    TTF_Font* LoadFont(const std::string& path, int ptSize);

    // 音频 Buffer（miniaudio decoded）
    const ma_audio_buffer* LoadAudioBuffer(const std::string& path);

    void ClearAll();

private:
    std::unordered_map<std::string, SDL_Texture*>     textures_;
    std::unordered_map<std::string, TTF_Font*>        fonts_;
    std::unordered_map<std::string, ma_audio_buffer>  audio_buffers_;
};
```

---

### 4.7 SaveSystem

存档格式保持 JSON（与现有 `docs/save_schema.md` 一致），序列化/反序列化用 nlohmann/json。

```cpp
struct SaveSlot {
    int     slot_index;
    int     current_day;
    float   money;
    int     rep;
    std::map<std::string, int>   song_best_scores;   // songId → score
    std::map<std::string, bool>  story_flags;        // flagId → bool
    std::vector<std::string>     unlocked_songs;
    std::string                  last_save_time;     // ISO 8601
};

class SaveSystem {
public:
    bool Load(int slot, SaveSlot& out);
    bool Save(int slot, const SaveSlot& data);
    std::array<bool, 3> GetSlotPresence();

private:
    std::filesystem::path SavePath(int slot) const;
};
```

---

## 5. 数据资产兼容性

**所有现有 JSON 资产可在 C++ 版直接复用，零迁移成本。**

| 资产 | 原路径 | C++ 加载方 | 格式变更 |
|------|--------|-----------|---------|
| 谱面 | `charts/*.json` | `ChartLoader::Load()` | 无 |
| 歌曲数据库 | `data/songs.json` | `SongDatabase::Load()` | 无 |
| 难度配置 | `data/difficulties.json` | `DifficultyConfig::Load()` | 无 |
| 菜单项 | `data/menu_items.json` | `MenuSystem::Load()` | 无 |
| 店铺配置 | `data/shop.json` | `ShopConfig::Load()` | 无 |
| 日程计划 | `data/day_plans.json` | `DayPlanManager::Load()` | 无 |
| 剧情流程 | `data/flows/*.json` | `DialogueVM::LoadFlow()` | **扩展**（见 4.4） |
| 音频文件 | `audio/**/*.m4a` | miniaudio 直接加载 | 无 |
| 图片资产 | `assets/**/*.png` | SDL2_image + stb_image | 无 |

**`data/dialogue/prologue.json` 的处理**：不再单独读取。其内容迁移进 `data/flows/prologue.json` 的 `dialogue` phase 中，统一数据源。迁移由 Python 辅助脚本一次性完成。

---

## 6. 目录结构与 CMake 组织

```
rhythm-fruit-cpp/               ← 新 C++ 项目根（独立 repo 或子目录）
├── CMakeLists.txt
├── vcpkg.json                  ← SDL2, SDL2_image, SDL2_ttf, googletest
├── vendor/
│   ├── miniaudio/miniaudio.h   ← header-only，直接 vendor
│   ├── nlohmann/json.hpp       ← header-only，直接 vendor
│   └── stb/stb_image.h
├── src/
│   ├── main.cpp                ← App::Run() 入口
│   ├── platform/
│   │   ├── IPlatform.h         ← 抽象接口
│   │   └── sdl2/
│   │       ├── SDL2Window.h/cpp
│   │       └── SDL2FileSystem.h/cpp
│   ├── engine/
│   │   ├── audio/
│   │   │   ├── AudioEngine.h/cpp
│   │   │   └── PreviewPlayer.h/cpp  ← crossfade loop 独立模块
│   │   ├── renderer/
│   │   │   ├── Renderer2D.h/cpp
│   │   │   └── TextRenderer.h/cpp
│   │   ├── input/
│   │   │   └── InputManager.h/cpp
│   │   ├── asset/
│   │   │   └── AssetManager.h/cpp
│   │   ├── timer/
│   │   │   └── Timer.h/cpp          ← SDL_GetPerformanceCounter 封装
│   │   └── event/
│   │       └── EventBus.h           ← 轻量观察者（无第三方依赖）
│   ├── game/
│   │   ├── GameApp.h/cpp           ← 顶层：持有所有子系统
│   │   ├── fsm/
│   │   │   └── GameStateMachine.h/cpp
│   │   ├── rhythm/
│   │   │   ├── RhythmEngine.h/cpp
│   │   │   ├── ChartLoader.h/cpp
│   │   │   └── NoteData.h
│   │   ├── dialogue/
│   │   │   ├── DialogueVM.h/cpp
│   │   │   └── FlowLoader.h/cpp
│   │   ├── menu/
│   │   │   ├── MenuSystem.h/cpp
│   │   │   └── DayRunManager.h/cpp
│   │   └── save/
│   │       └── SaveSystem.h/cpp
│   └── data/
│       ├── SongDatabase.h/cpp
│       ├── DifficultyConfig.h/cpp
│       └── ShopConfig.h/cpp
├── tests/
│   ├── test_fsm.cpp             ← FSM 转换表全覆盖
│   ├── test_rhythm.cpp          ← 判定窗、lead-in 时钟
│   ├── test_audio_sync.cpp      ← playbackVisualTime 单调性
│   └── test_dialogue.cpp        ← DialogueVM 流程推进
│
│   ─── 以下直接引用 HTML 版资产目录（符号链接或 CMake INSTALL） ───
├── assets/   →  ../Rhythm Fruit Aim/assets/
├── audio/    →  ../Rhythm Fruit Aim/audio/
├── charts/   →  ../Rhythm Fruit Aim/charts/
└── data/     →  ../Rhythm Fruit Aim/data/
```

**CMake 关键配置**：

```cmake
cmake_minimum_required(VERSION 3.25)
project(RhythmFruitCpp CXX)
set(CMAKE_CXX_STANDARD 20)

find_package(SDL2 CONFIG REQUIRED)
find_package(SDL2_image CONFIG REQUIRED)
find_package(SDL2_ttf CONFIG REQUIRED)

# miniaudio / nlohmann / stb: header-only, INTERFACE 库
add_library(miniaudio INTERFACE)
target_include_directories(miniaudio INTERFACE vendor/miniaudio)

add_executable(RhythmFruit ${SOURCES})
target_link_libraries(RhythmFruit
    PRIVATE SDL2::SDL2 SDL2::SDL2main
            SDL2_image::SDL2_image
            SDL2_ttf::SDL2_ttf
            miniaudio nlohmann_json stb_image)

# 测试
enable_testing()
add_subdirectory(tests)
```

---

## 7. 已知问题与 C++ 修复

以下为 HTML 版已知问题，C++ 版应在设计阶段解决，而非继承。

| # | HTML 版问题 | C++ 修复方案 |
|---|-------------|-------------|
| 1 | `startServiceTransition` 硬编码 `'lemon_water'` | `DayRunManager` 从 `flows/*.json` 的 `service.serviceId` 字段读取，完全 data-driven |
| 2 | `flows/*.json` 与 `dialogue/prologue.json` 双数据源 | 统一为 `flows/*.json`，`DialogueVM` 单一解释器 |
| 3 | FSM `TRANSITIONS` 表仅测试用，运行时不校验 | `TryTransition()` 强校验，所有状态变更走同一接口 |
| 4 | `drawProducts` / `drawCustomer` 死亡代码（会 ReferenceError） | 正式实现或删除；不留灰色代码 |
| 5 | `flowBody.innerHTML = node.html` 无 XSS 防护 | 改为纯文本渲染，HTML 注入接口不暴露 |
| 6 | debug fetch 指向 `127.0.0.1:7744` | 彻底移除；调试数据改用本地文件 log |
| 7 | `activeStart` 语义模糊（试听用，但文档易误解为主轴偏移） | `SongDatabase` 中重命名为 `previewStartSec`，明确语义 |
| 8 | 音频 prime 在 Safari 等环境可能被拦 | 桌面 Native 无此问题；miniaudio 不受浏览器音频策略约束 |
| 9 | PreviewClip crossfade 用 `setTimeout` 递归调度，边界条件脆弱 | `PreviewPlayer` 用 miniaudio `ma_node_graph` 或双 buffer 精确调度 |
| 10 | VN 系统与 `showFlowMessage` 共享同一 `#flowPanel`，耦合重 | C++ 版 `DialogueVM` 与 `FlowMessage` 分离，各自独立渲染路径 |

---

## 8. 开发里程碑

### M1：Hello Engine（预计 1–2 周）

**目标**：最小可运行的引擎骨架

- [ ] CMake 工程初始化，vcpkg 集成
- [ ] SDL2 窗口创建，主循环（fixed timestep 60 FPS）
- [ ] Timer 高精度时钟（`SDL_GetPerformanceCounter`）
- [ ] miniaudio 初始化，加载并播放一首 `.m4a` 文件
- [ ] 基础 InputManager（鼠标点击 / 键盘）
- [ ] EventBus 骨架
- [ ] Google Test 配置，跑通第一个测试

**验收标准**：窗口打开，能播放 `audio/tracks/seeker.m4a`，能读取鼠标输入，单测全绿。

---

### M2：音符下落（预计 3–4 周）

**目标**：可以「打一首歌」的最小 rhythm 模块

- [ ] `ChartLoader` 加载 `charts/tracks/seeker.json`
- [ ] `RhythmEngine` 实现：Lead-in 负时间轴 + `playbackVisualTime` 平滑同步
- [ ] `Renderer2D` 基础：背景 + conveyor + tap/press note 渲染（程序化，无图片）
- [ ] 判定系统：Perfect / Great / Good / Miss，4 键盘按键对应 3 lane
- [ ] 基础 HUD：combo、score 文字显示
- [ ] FSM：Home → Select → Ready → LeadIn → Playing → Ended 最小链路

**验收标准**：能完整打通 Seeker（容易难度），判定反馈正确，lead-in 无视觉卡顿。

---

### M3：完整游戏循环（预计 5–6 周）

**目标**：练习模式完整可用

- [ ] 全部 12 个 FSM 状态实现
- [ ] Pause / ResumeCountdown 完整实现（含冻结时钟逻辑）
- [ ] `SongDatabase` + `DifficultyConfig` 加载
- [ ] 选曲界面：列表 + 封面 + 试听 PreviewPlayer（带 crossfade）
- [ ] 结算界面：Rank / Perfect / Great / Good / Miss / MaxCombo
- [ ] 图片资产加载（水果纹理、封面）
- [ ] 基础 BGM：MenuBGM 续播逻辑（同 BGM 不重新播）
- [ ] 单元测试：FSM 转换表、lead-in 时钟精度、判定窗

**验收标准**：可以选任意一首歌，打完，查成绩，返回选曲，体验无明显卡顿或时钟漂移。

---

### M4：营业模式骨架（预计 7–8 周）

**目标**：Day Run 流程可跑通

- [ ] `SaveSystem`：三存档槽、JSON 持久化
- [ ] `DayPlanManager`：day_plans.json 加载、解锁逻辑
- [ ] `MenuSystem`：menu_items.json + 新增菜单项（见 `docs/narrative/04_vip_service_map.md`）
- [ ] Home / Save / MenuEdit / Overview 界面基础实现
- [ ] `DialogueVM`：加载 `flows/prologue.json`，`score_branch` 支持
- [ ] 序章 VN 可跑通（`speaker=""` 居中旁白正确渲染）
- [ ] Service 段：lemon_water 谱面 + 服务结算
- [ ] 日结算：收入 / 房租 / 口碑显示

**验收标准**：从新建存档到序章对话、第一次服务、日结算，完整链路无断点。

---

### M5：可分发 Demo（预计 9–12 周）

**目标**：面向外部分发的完整 demo

- [ ] 全部 26 首 track 可正常练习
- [ ] 序章 + Day 1 剧情完整实现（VIP 首场景：猫小姐、阿晟、林小末）
- [ ] 新菜单项（fruitCup、grapeSmoothie 等）可选、可服务
- [ ] VIP 立绘（MidJourney 生成，见 `docs/narrative/04_vip_service_map.md`）接入
- [ ] 新 service 曲（Suno 生成）接入
- [ ] 完整主题切换（sunny / neon_night / clean_mobile）
- [ ] 性能剖析：目标 ≥ 120 FPS / 帧时间 ≤ 8ms（无 V-Sync 时）
- [ ] Windows + macOS 打包验证
- [ ] README + 操作说明

**验收标准**：陌生玩家可以独立安装、运行、完成序章、体验至少 3 位 VIP 首次登场。

---

## 附录 A：渲染上下文（RenderContext）

等价 HTML 版 `makeRC()`，每帧构建传入渲染函数：

```cpp
struct RenderContext {
    // 布局
    float laneTop, laneBottom, hitY;
    float laneWidth;
    std::function<float(int lane)> NoteX;

    // 游戏状态快照（只读）
    GameState       state;
    float           songTime;
    float           leadInTimer, leadInTotal;
    float           readyTimer;
    std::span<const Note> notes;

    // 视觉参数
    float           noteAlpha;
    Theme           theme;
    SDL_Texture*    songCoverTexture;

    // HUD 数据
    int             combo, score;
    float           customerMood;
    float           trackProgress;

    // 暂停按钮列表（动态生成，与 HTML 版 getPauseButtons() 对应）
    std::vector<PauseButton> pauseButtons;
};
```

---

## 附录 B：miniaudio 精度优势

HTML `Audio.currentTime` 的更新频率约为 250ms（4次/秒），导致 HTML 版需要 `playbackVisualTime` 平滑算法来遮盖这个量化误差。

miniaudio 的 `ma_sound_get_cursor_in_seconds()` 返回基于实际 PCM sample 位置计算的时间，精度为 `1 / sampleRate`（44100Hz 时约 22.7 微秒）。这意味着 C++ 版的 `PLAY_START_SYNC_WINDOW`（0.32s 缓和窗口）可以缩小，整体音画同步精度优于 HTML 版。

---

*文档版本 v1.0 · 生成时间：2026-05-08*
