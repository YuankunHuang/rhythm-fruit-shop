# Track Event 机制设计文档（v1）

> 本文档定义 `track_event` 的完整机制规范，供 flow 数据编写与代码实现参考。  
> 与 service（菜单单品）的机制对比见第一节。

---

## 一、两种曲目，两种机制

| 维度 | Service（菜单单品） | Track Event（VIP 特殊事件） |
|------|-------------------|-----------------------------|
| 触发方式 | 客人点单，自然插入对话流 | VIP 在叙事关键时刻提出特殊需求，首次引出该曲目 |
| 曲目长度 | 短（15-40 秒） | 完整曲目（90-275 秒） |
| 难度 | 固定 `service` 难度，不可选 | 玩家自选：easy / normal / hard / expert |
| 风险与收益 | 固定 | 难度越高，收益与口碑加成放大，失误代价也放大 |
| 解锁 | 无；属于菜单功能，随菜单解锁 | 完成即解锁，此后可加入日常排班 |
| VIP 绑定 | 与饮品绑定，不与 VIP 专属 | 与特定 VIP 一一对应 |
| 出现时机 | 每次该 VIP 到访均可触发 | 全游戏仅出现一次（首次登场） |

---

## 二、体验流程

```
【正常叙事对话】
        ↓
VIP 提出特殊需求（nodes_before 对话节点）
        ↓
【难度选择界面 trackDiffPanel】
  ┌────────────┐
  │  曲目封面   │
  │  标题 · 艺术家  │
  │ easy / normal / hard / expert │
  │  难度说明（风险倍率）          │
  │  [ 开始 ]                   │
  └────────────┘
        ↓
完整打歌（使用所选难度的谱面与参数）
        ↓
成绩结算（VIP 反应：3 档分支 good / ok / bad）
        ↓
解锁曲目 → 加入可排班曲目库
        ↓
【继续当天剧情流 / 结算】
```

---

## 三、难度对奖励的影响

| 难度 | 收益倍率 | 口碑倍率 | 失误代价 |
|------|---------|---------|---------|
| easy | ×0.8 | ×0.8 | ×0.8 |
| normal | ×1.0 | ×1.0 | ×1.0 |
| hard | ×1.3 | ×1.3 | ×1.3 |
| expert | ×1.6 | ×1.6 | ×1.6 |

> 倍率基数与普通 service 的当天结算数值相同。失误代价指 miss 率过高时，口碑加成从正转负。

---

## 四、Phase JSON 规范

在 `data/flows/day[N].json` 的 `phases` 数组中插入，位置紧跟对应 VIP 的对话 phase 之后：

```json
{
  "id": "track_event_chengwan",
  "type": "track_event",
  "songId": "drama",
  "vipName": "程晚",
  "nodes_before": [
    {
      "speaker": "程晚",
      "text": "（提出特殊需求的台词，引出曲目的感情或记忆）"
    }
  ],
  "branches": [
    {
      "min": 88,
      "label": "好评 (>=88)",
      "nodes": [
        { "speaker": "程晚", "text": "（对应评价的反应）" }
      ]
    },
    {
      "min": 62,
      "label": "一般 (>=62)",
      "nodes": [
        { "speaker": "程晚", "text": "（中等反应）" }
      ]
    },
    {
      "min": 0,
      "label": "较差",
      "nodes": [
        { "speaker": "程晚", "text": "（低分反应）" }
      ]
    }
  ],
  "after": [
    { "speaker": "", "text": "（收尾旁白节点，可选）" }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，建议命名为 `track_event_{vipKey}` |
| `type` | string | 固定值 `"track_event"` |
| `songId` | string | 对应 `songs.json` 中的 track ID |
| `vipName` | string | VIP 显示名（用于 trackDiffPanel 界面展示） |
| `nodes_before` | node[] | 在难度选择前展示的 VN 对话节点 |
| `branches` | branch[] | 打歌完成后的评分分支（格式与 score_branch 相同） |
| `after` | node[] | 所有分支结束后的统一收尾节点（可为空数组） |

---

## 五、写作原则（nodes_before）

- VIP **不直接说"请帮我打一首歌"**——这太直白。应该是：VIP 提起一段记忆、一种感受、一个未完成的东西，然后话头自然落在"我想听一次"或"你能打出来吗"
- 整段节点不超过 4 条，保持克制
- 和 service 的"订单卡"不同，track event **没有 action: startService 节点**，而是在 nodes_before 末尾不加 action，让 flow 解释器检测到 `track_event` phase 后自动弹出难度选择界面

---

## 六、解锁机制

- 完成打歌（无论评分分支）即调用 `learnSong(songId)` 将该曲目写入 `shopState.learnedSongs`
- `day_plans.json` 中对应条目改为 `"conditions": { "via": "track_event" }`，标注该曲通过 track_event 解锁
- `resolveDayUnlocks()` 会跳过 `via: "track_event"` 的条目（这类解锁由 flow 直接触发）

---

## 七、10 天 Track Event 排期

| 天次 | 时段 | VIP | 曲目 | 到访次序 |
|------|------|-----|------|---------|
| Day 4 | day | 林小末 | unwelcome_school | 第 2 次 |
| Day 4 | dusk | 阿晟 | seeker | 第 2 次 |
| Day 5 | dusk | 程晚 | drama | 第 2 次 |
| Day 6 | day | 顾薇 | purple_passion | 第 1 次 |
| Day 6 | dusk | 老弦 | grafiore | 第 1 次 |
| Day 7 | day | 谢音 | please | 第 1 次 |
| Day 7 | night | 焰子 | lets_drive | 第 2 次 |
| Day 8 | day | 老方 | ark_light | 第 2 次 |
| Day 9 | dusk | 远哥 | faraway | 第 1 次 |
| Day 10 | dusk | 老贝 | beethoven | 第 1 次 |

**说明：**
- Day 4、6、7 各有 2 个 track event，分属不同时段
- toy_war（小兵）留作后续扩展内容
- `seeker` 已从 `firstDaySongs` 移出，改为通过 track_event 解锁
- `please`（R300K）归属于谢音（钢琴老师），Day 7 day 时段第 1 次到访

---

## 八、修订记录

- **v1**：建档，定义 track_event 机制、phase 规范、难度倍率、10 天排期。
