# 存档与本地存储 Schema v1

定义 HTML 版的 localStorage 字段结构，以及对应的 C++/UE5 移植形态。任何字段改名或类型变化都要先改这份文档。

## 1. 总体策略

- 存档 schema 与缓存版本完全解耦：`APP_CACHE_VERSION` 用于资源 URL 防缓存，与存档无关；只有破坏性的存档结构变更才会 bump `SAVE_SCHEMA_VERSION`。
- 存档以 JSON 序列化进 localStorage。未来 C++ 版可用 `nlohmann::json`，UE5 版可走 `USaveGame` + `JsonObjectConverter` 直接读这份 schema。
- 3 个独立存档槽，互不影响。
- 任何 schema 升级都要写 migration（在 `src/storage.js`）。

## 2. localStorage 命名空间

| Key | 类型 | 说明 |
|---|---|---|
| `rfaSaveSlots`         | `SaveSlot[]`（长度 = 3） | 主存档数据 |
| `rfaVisualTheme`       | `"day" \| "night" \| "sunny"` | 玩家选择的主题 |
| `rfaFallSpeed`         | `"1" \| "2" \| "3" \| "4"` | 玩家选择的下落速度（1-based） |
| `rfaPrologueSeen`      | `"1"` | 是否已完成序章（VN + 柠檬水服务 + 序章结算「回到主界面」）；与首日训练班无关 |
| `rfaResourceIntroSeen` | `"1"` | 资源科普弹窗是否显示过 |

> 命名规范：所有 key 以 `rfa` 前缀开头。

## 3. SaveSlot 结构

```ts
type SaveSlot = {
  schemaVersion: number;   // 当前为 1
  updatedAt: number;       // Date.now()
  shopState: PlayerSave;
};
```

## 4. PlayerSave 结构

```ts
type PlayerSave = {
  // 进度
  day: number;
  coins: number;
  reputation: number;

  // 全局统计
  totalShifts: number;
  totalMoney: number;

  // 教学状态（命名见 §5）
  firstShiftDone: boolean;

  // 升级
  upgrades: {
    cutter:  number;  // 1-5
    blender: number;  // 1-5
    sign:    number;  // 1-5
  };

  // 当日排班
  currentMenu: SlotEntry[];

  // 解锁
  learnedSongs: string[];                       // 永远以 firstDaySongs 为基底
  unlockHistory: { day: number; songId: string }[];

  // 老板来信 milestones：读信链走完才写入 id；演出为流程内对白（见 data/boss_letters.json 的 placement）
  bossLettersSeen: string[];

  // 上下文聚光灯（dayIntro 等）；首日上岗练习另有 tutorialSeen.day1ShiftTutorial，并与 firstShiftDone 载入时同步
  tutorialSeen: { [tutorialId: string]: 1 };
};

type SlotEntry = {
  slotId: 'day' | 'dusk' | 'night';
  songId: string;
};
```

## 5. 两套教学概念

| 机制 | 字段 | 作用域 | 触发 | 存放 |
|---|---|---|---|---|
| 序章 VN（柚子+学生妹+柠檬水）+ 序章结算返回 | `prologueSeen` | 浏览器级（跨存档） | 序章账本「回到主界面」 | `rfaPrologueSeen` |
| 首日上岗练习（Day 1 第一班，一次性） | `shopState.firstShiftDone` + `tutorialSeen.day1ShiftTutorial` | 存档级 | 任意曲目的第一班结算→「正式上岗」 | `SaveSlot.shopState`（载入时两者互为补丁） |
| 上下文聚光灯（dayIntro 等） | `shopState.tutorialSeen` | 存档级 | 不同 UI 出现时 | `SaveSlot.shopState` |

## 6. C++ 映射示意

```cpp
struct FPlayerSave {
    int32 SchemaVersion = 1;
    int64 UpdatedAt = 0;

    int32 Day = 1;
    int32 Coins = 0;
    int32 Reputation = 0;

    int32 TotalShifts = 0;
    int32 TotalMoney = 0;

    bool  bFirstShiftDone = false;

    TMap<FName, int32>   Upgrades;
    TArray<FSlotEntry>   CurrentMenu;
    TArray<FString>      LearnedSongs;
    TArray<FUnlockEntry> UnlockHistory;
    TArray<FString>      BossLettersSeen;
    TMap<FName, int32>   TutorialSeen;
};
```

UE5 `USaveGame` 子类只需把这些字段改成 `UPROPERTY(SaveGame)` 即可。
