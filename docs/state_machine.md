# 游戏状态机

`src/state.js` 导出 `S`（状态常量枚举）与 `TRANSITIONS`（有效转移邻接表）。

## 状态列表

| 常量 | 字符串值 | 说明 |
|---|---|---|
| `S.HOME` | `'home'` | 标题主界面 |
| `S.SAVE` | `'save'` | 存档槽选择 |
| `S.FLOW` | `'flow'` | VN 对话 / 日程介绍 / 结算消息 |
| `S.MENU_EDIT` | `'menuEdit'` | 排班编辑器 |
| `S.OVERVIEW` | `'overview'` | 开店前日程预览 |
| `S.SELECT` | `'select'` | 练习选曲界面 |
| `S.READY` | `'ready'` | 开始前倒计时 |
| `S.LEAD_IN` | `'leadIn'` | 导入动画（音符从顶部扫入） |
| `S.PLAYING` | `'playing'` | 游戏进行中 |
| `S.PAUSED` | `'paused'` | 暂停 |
| `S.RESUME_COUNTDOWN` | `'resumeCountdown'` | 继续前 3-2-1 倒数 |
| `S.ENDED` | `'ended'` | 结算/结果界面 |

## 状态转移图

```mermaid
stateDiagram-v2
    [*] --> HOME

    HOME --> SAVE        : 新游戏 / 加载
    HOME --> SELECT      : 练习
    HOME --> FLOW        : 首次进入 → 序章 VN

    SAVE --> HOME        : 返回
    SAVE --> FLOW        : 选档 → 第 N 天介绍

    FLOW --> FLOW        : 下一条消息 / 下一段 VN
    FLOW --> MENU_EDIT   : 排班
    FLOW --> ENDED       : 第 1 天结算
    FLOW --> HOME        : 返回主界面

    MENU_EDIT --> FLOW   : 返回（日程介绍）
    MENU_EDIT --> OVERVIEW : 确认排班
    MENU_EDIT --> HOME   : 间接返回

    OVERVIEW --> MENU_EDIT : 返回
    OVERVIEW --> READY   : 开店

    SELECT --> HOME      : 返回
    SELECT --> READY     : 开始练习

    READY --> LEAD_IN    : （update 触发，倒计时归零）
    READY --> PAUSED     : 暂停键

    LEAD_IN --> PLAYING  : （update 触发，导入结束）
    LEAD_IN --> PAUSED   : 暂停键

    PLAYING --> PAUSED   : 暂停键 / ESC
    PLAYING --> ENDED    : 完成 / 愤怒离场

    PAUSED --> RESUME_COUNTDOWN : 继续
    PAUSED --> ENDED     : 提前收工（日程模式）
    PAUSED --> SELECT    : 退出练习
    PAUSED --> MENU_EDIT : 提前结束当天（日程模式）
    PAUSED --> HOME      : 间接返回

    RESUME_COUNTDOWN --> PLAYING : （update 触发，倒数归零）
    RESUME_COUNTDOWN --> PAUSED  : 再次暂停

    ENDED --> HOME       : 回主界面
    ENDED --> FLOW       : 推进到下一天
    ENDED --> MENU_EDIT  : 排班（日程模式）
    ENDED --> READY      : 重试
    ENDED --> SELECT     : 退出到选曲
    ENDED --> ENDED      : 重来今天（重置后立即触发下一班）
```

## C++ 映射

```cpp
enum class GameState {
    Home, Save, Flow, MenuEdit, Overview,
    Select, Ready, LeadIn, Playing,
    Paused, ResumeCountdown, Ended
};
```

转移守卫在 C++ 端对应 `StateMachine::TryTransition(GameState next)` 方法，参照 `TRANSITIONS` 邻接表实现断言或日志。
