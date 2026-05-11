# 音频委托清单（Suno 生成）（v3）

> 当前所有 track 均为高强度传统音游曲目，不适合用作叙事服务段背景音和环境 BGM。  
> 本文列出所有待生成的音频，每条附 Suno prompt（英文，直接可用）。  
> **占位方案**：正式版生成前，暂用 `audio/service/lemon_water.m4a`（或其他体积小的现有 service 曲）作 placeholder。

---

## 一、Service 段背景音（按菜单项）

每首约 **30–60 秒**，用于客人点单后的"出品服务"节奏段，不是节奏挑战而是情绪烘托。

**设计原则**：
- Service 曲属于**菜单项（饮品）**，不属于某位 VIP。同一杯饮品可以有多个版本（风格变体）。
- 文件命名：`{饮品名}.m4a`（唯一版本）；`{饮品名}_{风格词}.m4a`（多版本）。风格词取自 Suno prompt 里最能描述整体气质的词，听起来像"这种类型的饮品"，而非指向某位客人。
- 流浪者不固定点单，轮换现有 service 曲，无专属文件。

---

### S01 · 葡萄冰沙（Still）

**菜单项**：葡萄冰沙  
**情绪灵感**：阿晟（Seeker 线）  
**目标文件**：`audio/service/grape_smoothie_still.m4a`  
**状态**：**已生成** ✓

**情绪**：低强度数字焦虑，有透明感，像在等一个不确定会来的消息

**Suno prompt**
```
lo-fi electronic, melancholic trance, sparse piano notes over digital glitch texture,
slow BPM around 70, minor key, quiet intensity, city night ambience, introspective mood,
no vocals, 40 seconds
```

---

### S02 · 彩虹鲜果杯

**菜单项**：彩虹鲜果杯  
**情绪灵感**：老方（Ark Light 线）  
**目标文件**：`audio/service/fruit_cup.m4a`  
**状态**：**已生成** ✓

**情绪**：平稳推进，有秩序感但不轻松，像流水线在动但有人在扛着它

**Suno prompt**
```
upbeat lo-fi hip hop, mechanical rhythm with warm bass, BPM 90, positive but tired energy,
urban delivery worker vibe, gentle synth chords, no vocals, 45 seconds
```

---

### S03 · 柠檬水

**菜单项**：柠檬水  
**情绪灵感**：猫小姐（Felis 线）/ 林小末（Unwelcome School 线）  
**目标文件**：`audio/service/lemon_water.m4a`  
**状态**：**已有（Demo）**，无需生成新版本，除非替换

**情绪**：普通一杯，不特别，但来了就是来了——室温、不加冰、喝起来不会打扰人说话

---

### S04 · 柠檬水（Light）

**菜单项**：柠檬水  
**情绪灵感**：猫小姐（Felis 线，灵动独立版）  
**目标文件**：`audio/service/lemon_water_light.m4a`  
**状态**：**已生成** ✓

**情绪**：轻盈、有点飘，像在自己的世界里，不忧郁但也不雀跃

**Suno prompt**
```
light indie pop instrumental, gentle piano and soft synth, BPM 95, playful but wistful,
cat-like graceful rhythm, pastel colors feel, bittersweet nostalgia, no vocals, 40 seconds
```

---

### S05 · 葡萄冰沙（Smolder）

**菜单项**：葡萄冰沙  
**情绪灵感**：顾薇（Purple Passion 线）  
**目标文件**：`audio/service/grape_smoothie_smolder.m4a`  
**状态**：**已生成** ✓

**情绪**：克制的激情，像颜色一直在扩散但被一层透明膜压着

**Suno prompt**
```
cinematic lo-fi, slow burning electronic with violin texture, BPM 80, deep purple aesthetic,
restrained passion, creative tension, brush strokes rhythm pattern, no vocals, 50 seconds
```

---

### S06 · 手工橙汁

**菜单项**：手工橙汁  
**情绪灵感**：谢音（Maiden's Capriccio 线）  
**目标文件**：`audio/service/fresh_orange_juice.m4a`  
**状态**：**已生成** ✓

**情绪**：表面温柔但内力绷着，像在演奏时手指用了全力但脸上看不出来

**Suno prompt**
```
classical piano meets subtle electronic, BPM 110, elegant tension, Baroque influence with
modern synth undertone, precise and controlled, teacher-student dynamic feel,
no vocals, 45 seconds
```

---

### S07 · 葡萄冰沙（Afterglow）

**菜单项**：葡萄冰沙  
**情绪灵感**：程晚（Drama 线）  
**目标文件**：`audio/service/grape_smoothie_afterglow.m4a`  
**状态**：**已生成** ✓

**情绪**：帷幕刚落，余热未散，台上和台下之间的那几秒

**Suno prompt**
```
cinematic downtempo, theatrical strings over electronic beat, BPM 85, post-performance
melancholy, dramatic but exhausted, velvet curtain closing feel, minor tonality,
no vocals, 50 seconds
```

---

### S08 · 热橙汁

**菜单项**：热橙汁  
**情绪灵感**：远哥（Faraway 线）  
**目标文件**：`audio/service/hot_orange_juice.m4a`  
**状态**：**已生成** ✓

**情绪**：长途公路，窗外在动，人不动

**Suno prompt**
```
road trip lo-fi, warm acoustic guitar over gentle electronic pulse, BPM 72, wide open
highway feel, longing for home, truckers's late evening, slow and steady, no vocals, 50 seconds
```

---

### S09 · 鲜果拼盘

**菜单项**：鲜果拼盘  
**情绪灵感**：面具（Masquerade 线）  
**目标文件**：`audio/service/fruit_platter.m4a`  
**状态**：**已生成** ✓

**情绪**：摘下了什么，但不确定底下是什么——轻松但有一点暴露感

**Suno prompt**
```
minimal electronic pop, BPM 100, mask off vibe, playful synth melody with slight uncertainty,
identity shifting motif, light and airy but with hidden depth, no vocals, 40 seconds
```

---

### S10 · 荔枝汁

**菜单项**：荔枝汁  
**情绪灵感**：老弦（Grafiore 线）  
**目标文件**：`audio/service/lychee_juice.m4a`  
**状态**：**已生成** ✓

**情绪**：每一个音都很干净，但整个曲子是关于失去的

**Suno prompt**
```
erhu meets electronic ambient, traditional Chinese string instrument over subtle digital texture,
BPM 75, elegiac and precise, handcraft meets algorithm, subtle grief, no vocals, 50 seconds
```

---

### S11 · 热柠檬水

**菜单项**：热柠檬水  
**情绪灵感**：老贝（Beethoven Virus 线）  
**目标文件**：`audio/service/warm_lemon_water.m4a`  
**状态**：**已生成** ✓

**情绪**：夜里的安静，和一个老人把音乐记在心里的感觉

**Suno prompt**
```
classical piano nocturne, gentle Beethoven-inspired melody with subtle electronic reverb,
BPM 60, late night warmth, retired teacher energy, memory preservation, no vocals, 55 seconds
```

---

### S12 · 柑橘碳酸

**菜单项**：柑橘碳酸  
**情绪灵感**：焰子（Lets Drive / 骑手夜线）  
**目标文件**：`audio/service/citrus_fizz.m4a`  
**状态**：**已生成** ✓

**情绪**：停下来了，但身体还记得刚才在跑

**Suno prompt**
```
eurobeat-inspired lo-fi, fast synth rhythm slowed to BPM 95, delivery rider catching breath,
neon night aesthetic, electric energy at rest, city highway echo, no vocals, 40 seconds
```

---

### S13 · 彩虹鲜果杯（待定变体）

**菜单项**：彩虹鲜果杯  
**情绪灵感**：小兵（Toy War 线，如需专属版）  
**目标文件**：`audio/service/fruit_cup_quiet.m4a`  
**状态**：**已生成** ✓

**情绪**：安静的选择——不是什么都想清楚了，只是做了一个决定

**Suno prompt**
```
solo piano with light electronic backdrop, BPM 80, thoughtful and gentle, children's game
designer introspection, bright but cautious, puzzle-solving calm, no vocals, 45 seconds
```

---

### S14 · 慢出品特调

**菜单项**：慢出品特调  
**情绪灵感**：老宋（Qua Vadis 线）  
**目标文件**：`audio/service/critic_special.m4a`  
**状态**：待生成  
**占位**：`audio/service/lemon_water.m4a`

**情绪**：走了很远，停下来，不知道自己在哪里，但不恐慌——只是很平

**Suno prompt**
```
melancholic electronic ambient, BPM 70, sparse piano chords over slow cinematic synth pad,
existential quietude, former professional in transition, "where are you going" theme,
introspective, no vocals, 55 seconds
```

---

### S15 · 菠萝汁

**菜单项**：菠萝汁  
**情绪灵感**：月叔（Lunatic Sky 线）  
**目标文件**：`audio/service/pineapple_juice.m4a`  
**状态**：待生成  
**占位**：`audio/service/lemon_water.m4a`

**情绪**：深夜仰头看天的感觉，什么都可以变小

**Suno prompt**
```
dreamy trance ambient, BPM 65, stargazing night soundscape, soft piano melody over
shimmering synth pads, peaceful solitude, night watchman routine, unnamed constellation,
no vocals, 50 seconds
```

---

### S16 · 草莓汁

**菜单项**：草莓汁  
**情绪灵感**：无名（Ineffabilis 线）  
**目标文件**：`audio/service/strawberry_juice.m4a`  
**状态**：待生成  
**占位**：`audio/service/lemon_water.m4a`

**情绪**：不需要音乐解释的事，音乐也不解释——只是在那里

**Suno prompt**
```
minimal ambient, almost silent, single piano note every few seconds over deep reverb,
BPM 50, grief that cannot be named, empty space as texture, no melody no rhythm no vocals,
30 seconds
```

---

> **流浪者**（Gypsy Tronic 线）：不固定点单，轮换现有 service 曲，无专属文件。

## 二、店铺环境 BGM（循环用）

用于日间/黄昏/夜间的背景环境音，区别于节奏游戏的战斗节奏主题。

---

### B01 · 日间店铺（开门后，服务前）

**情绪**：普通的一天，阳光刚进来，什么还没有发生

**Suno prompt**
```
cozy fruit shop ambience, lo-fi bossa nova, acoustic guitar and light piano, BPM 85,
morning sun warmth, small shop feel, birds and street background, positive but low-key,
seamless loop, no vocals, 90 seconds
```

---

### B02 · 黄昏店铺

**情绪**：一天快结束了，客人开始变少，剩下的人都有点地方要去

**Suno prompt**
```
dusk lo-fi, mellow jazz-infused electronic, BPM 75, golden hour fade, slightly nostalgic,
small town evening, end of work day energy, piano and soft bass, seamless loop,
no vocals, 90 seconds
```

---

### B03 · 夜间店铺

**情绪**：开着灯，外面是夜，来的人都有各自的理由

**Suno prompt**
```
late night lo-fi, slow jazz and ambient synth blend, BPM 65, city at rest, warm light in
darkness, night shift comfort, mysterious and safe at the same time, seamless loop,
no vocals, 90 seconds
```

---

### B04 · 店铺危机期（高峰夜，用于 Megaburn 场次）

**情绪**：事情在往不好的方向走，但还没到，还在撑着

**Suno prompt**
```
tense lo-fi electronic, BPM 100, underlying anxiety with surface calm, minor key synth
loop, late night crisis energy, something's about to break but hasn't yet, no vocals,
seamless loop, 60 seconds
```

---

## 三、特殊叙事节点音效

---

### E01 · 老板信件出现

**情绪**：像从另一个时代寄来的东西

**Suno prompt**
```
vintage typewriter sound over warm ambient pad, paper rustling, brief 5-second sting,
old-fashioned telegram delivery feel, slightly absurd but important
```

---

### E02 · 系统结算（每日收尾）

**情绪**：街灯亮起，今天结束了

**Suno prompt**
```
gentle resolution sting, solo piano or music box, 8 seconds, end of day warmth,
streetlights turning on at dusk, quiet satisfaction
```

---

## 修订记录

- **v1**：建档，含 17 条 VIP service 段 + 4 条环境 BGM + 2 条特殊节点。所有正式版未生成前以 `lemon_water.m4a` 占位。
- **v2**：角色名更新至 v3 命名（阿寻→阿晟、方舟→老方、紫萱→顾薇、旦角→程晚、阿往→老宋）；S01–S17 各补充曲目名称与目标文件路径（已废弃，见 v3）。
- **v3**：Section 一从 VIP 专属重构为按菜单项（饮品）组织。命名规则：`{饮品名}.m4a`（唯一版本）/ `{饮品名}_{风格词}.m4a`（多版本）。已确认生成 4 首：`grape_smoothie_still`、`grape_smoothie_smolder`、`lemon_water_light`、`fruit_cup`。流浪者无专属曲，轮换现有 service 曲。`songs.json` 同步新增 4 条 service 条目。
- **v4**：S06–S13 全部标为「已生成 ✓」，删除对应占位行；修正文件顶部重复标题。S14–S16 仍待生成。
