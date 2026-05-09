# VIP × 服务 × 资源制作请求（v1）

> 本文档是所有 VIP 角色的资源制作总清单，供 MidJourney（立绘）和 Suno（service 曲）生成使用。  
> 同时包含新菜单项规格，供后续更新 `data/menu_items.json` 参考。

---

## 设计原则

每位 VIP 的招牌饮品是他们的「这道菜」。第一次为某位 VIP 服务时，玩家做的就是那杯东西——service phase 的节奏游戏用他们专属的 service 曲。服务完成后，那杯饮品解锁为常规菜单可用品。

VIP 的解锁 track（练习模式里的曲目）和服务时的 service 曲是两个不同的东西：前者是叙事奖励，后者是玩法内容。

---

## 总览表

| VIP | 曲目 | 场景 | 招牌饮品 | menuItem | service 曲状态 |
|-----|------|------|---------|----------|--------------|
| 阿晟 | Seeker | DAY | 葡萄冰沙 | `grapeSmoothie` | **待制作** |
| 老方 | Ark Light | DAY | 彩虹鲜果杯 | `fruitCup` | **待制作** |
| 猫小姐 | Felis | DAY | 柠檬水（室温） | `lemon_water` | 复用 |
| 顾薇 | Purple Passion | DAY | 葡萄冰沙 | `grapeSmoothie` | 共用阿晟 |
| 谢音 | Maiden's Capriccio | DAY | 手工橙汁 | `freshOrangeJuice` ★ | **待制作** |
| 林小末 | Unwelcome School | DAY | 柠檬水（低调款） | `lemon_water` | 复用 |
| 流浪者 | Gypsy Tronic | DAY | 每次不同（轮换现有项） | 轮换 | 复用 |
| 程晚 | Drama | DUSK | 葡萄冰沙（酸） | `grapeSmoothie` | 共用阿晟 |
| 远哥 | Faraway | DUSK | 热橙汁 | `hotOrangeJuice` ★ | **待制作** |
| 面具 | Masquerade | DUSK | 鲜果拼盘 | `fruitPlatter` ★ | **待制作** |
| 老弦 | Grafiore | DUSK | 荔枝汁 | `lycheeJuice` ★ | **待制作** |
| 老贝 | Beethoven Virus | NIGHT | 热柠檬水 | `warmLemonWater` ★ | **待制作** |
| 焰子 | Night of Fire | NIGHT | 柑橘碳酸 | `citrusFizz` | **待制作** |
| 小兵 | Toy War | NIGHT | 混合鲜果杯（随机） | `fruitCup`（变体） | 共用老方 |
| 老宋 | Qua Vadis | NIGHT | 慢出品（特调） | `criticSpecial` | **待制作** |
| 月叔 | Lunatic Sky | NIGHT | 菠萝汁 | `pineappleJuice` ★ | **待制作** |
| 无名 | Ineffabilis | NIGHT | 草莓汁 | `strawberryJuice` ★ | **待制作** |

★ = 需要新增到 `menu_items.json`

---

## 新增菜单项规格

以下 7 个菜单项需添加到 `data/menu_items.json`。  
`needs` 字段中的 key 须在 `resourceLabels` 中定义，或同步新增 resource 类型。  
`color` 均为占位色，视觉调整时替换。

```jsonc
// 需新增的 resourceLabels（如不存在）：
// "strawberry": "草莓", "lychee": "荔枝", "pineapple": "菠萝",
// "orange": "橙子"（已有）, "warmth": "温度", "handcraft": "手工"

{ "id": "freshOrangeJuice", "name": "手工橙汁",    "kind": "juice",   "needBase": 10, "color": "#ff9c3a",
  "needs": { "orange": 2, "juice": 1 },
  "reward": { "money": 45, "rep": 3 },
  "desc": "谢音解锁。强调「手动榨汁」操作，比普通橙汁要求更多 juice 输入" },

{ "id": "hotOrangeJuice",   "name": "热橙汁",      "kind": "juice",   "needBase": 8,  "color": "#e87a20",
  "needs": { "orange": 1, "juice": 1, "warmth": 1 },
  "reward": { "money": 40, "rep": 2 },
  "desc": "远哥解锁。保温限时变体——出品后有短暂冷却窗口，超时评分下降" },

{ "id": "fruitPlatter",     "name": "鲜果拼盘",    "kind": "chunks",  "needBase": 6,  "color": "#ffe0a0",
  "needs": { "chunks": 3 },
  "reward": { "money": 55, "rep": 2 },
  "desc": "面具解锁。自由搭配多种水果，无固定配方，评分基于多样性而非精确度" },

{ "id": "lycheeJuice",      "name": "荔枝汁",      "kind": "juice",   "needBase": 8,  "color": "#ffb8d4",
  "needs": { "lychee": 2, "juice": 1 },
  "reward": { "money": 50, "rep": 3 },
  "desc": "老弦解锁。严格单一食材，混入其他水果直接评分惩罚" },

{ "id": "warmLemonWater",   "name": "热柠檬水",    "kind": "juice",   "needBase": 5,  "color": "#fff3a0",
  "needs": { "lime": 1, "warmth": 1 },
  "reward": { "money": 30, "rep": 2 },
  "desc": "老贝解锁。低强度、慢节奏，与 lemon_water 的区别在于节奏设计而非机制" },

{ "id": "pineappleJuice",   "name": "菠萝汁",      "kind": "juice",   "needBase": 7,  "color": "#ffe44c",
  "needs": { "pineapple": 1, "juice": 1 },
  "reward": { "money": 38, "rep": 2 },
  "desc": "月叔解锁。夜间专用，甜度控制型，连击奖励略高" },

{ "id": "strawberryJuice",  "name": "草莓汁",      "kind": "juice",   "needBase": 4,  "color": "#ff8080",
  "needs": { "strawberry": 1, "juice": 1 },
  "reward": { "money": 32, "rep": 1 },
  "desc": "无名解锁。操作最简单，评分宽松，音乐极简静默——不是因为容易，是因为这杯不需要表演" }
```

---

## Service 曲制作请求（Suno）

共 10 首待制作。占位文件统一使用 `audio/service/lemon_water.m4a`，生成后替换。  
所有曲目均为**纯器乐**（no vocals / instrumental only），适合作为节奏游戏底轨。  
时长建议：**60–90 秒**，结构清晰，可循环。

---

### 1. `fruitCup_service` — 彩虹鲜果杯（老方 / 小兵）

**情绪**：热闹、有颜色感、早晨的货运站、把一批东西搭好带走的满足感  
**BPM**：120–125  
**风格**：清爽的 upbeat indie pop，暖合成器，轻型鼓机，偶尔有木质打击乐点缀

**Suno prompt**
```
upbeat indie pop, instrumental, bright warm synthesizers, light drum machine, marimba accents, morning energy, colorful, lively, 120 BPM, 75 seconds, clean production, no vocals, rhythm game friendly, loop-ready
```

---

### 2. `grapeSmoothie_service` — 葡萄冰沙（阿晟 / 顾薇 / 程晚）

**情绪**：冷静、有质地、稍微忧郁但专注——三个人喝同一杯东西各有各的理由，这首曲子属于那杯本身  
**BPM**：108–112  
**风格**：lo-fi downtempo electronic，冷色合成器铺底，带颗粒感的采样，精准的节拍

**Suno prompt**
```
lo-fi downtempo electronic, instrumental, cold synthesizer pads, grainy vinyl texture, precise minimal percussion, purple-toned mood, slightly melancholic but focused, 110 BPM, 80 seconds, no vocals, rhythm game friendly, loop-ready
```

---

### 3. `citrusFizz_service` — 柑橘碳酸（焰子）

**情绪**：冲、快、碳酸感——她不是被迫快，她就是喜欢快  
**BPM**：145–155  
**风格**：Eurobeat-lite，气泡感合成器，快速鼓机，带一点夜间公路的明亮感

**Suno prompt**
```
eurobeat, synthpop, instrumental, driving synth bass, bright staccato lead melody, fizzy arpeggios, fast hi-hats, night road energy, electric, 150 BPM, 70 seconds, no vocals, rhythm game friendly, loop-ready
```

---

### 4. `criticSpecial_service` — 评论家特调（老宋）

**情绪**：慢、刻意、正式但空洞——发出去几百封通知的人，现在在等一杯需要等的东西  
**BPM**：88–95  
**风格**：慢节奏 jazz piano，轻刷弦贝斯，空旷的混音，有一种空办公室在下班后的感觉

**Suno prompt**
```
slow jazz piano, instrumental, brushed double bass, sparse arrangement, late office hours mood, hollow and deliberate, slightly melancholic, clean reverb, 90 BPM, 85 seconds, no vocals, rhythm game friendly, loop-ready
```

---

### 5. `freshOrangeJuice_service` — 手工橙汁（谢音）

**情绪**：有古典气质的早晨光线，纪律性的愉悦——手工的东西有手工的节奏  
**BPM**：100–108  
**风格**：轻室内乐风格，钢琴主导，弦乐点缀，现代制作包装，干净精准

**Suno prompt**
```
chamber music, light classical piano, subtle string accents, morning light, precise and warm, modern production, acoustic feel, disciplined joy, 104 BPM, 75 seconds, instrumental, no vocals, rhythm game friendly, loop-ready
```

---

### 6. `hotOrangeJuice_service` — 热橙汁（远哥）

**情绪**：上路前的那一刻，天还没亮，暖色的光，不急但心里有数  
**BPM**：95–105  
**风格**：gentle folk acoustic，暖弦乐器（吉他或曼陀林），稳定低音线，公路感

**Suno prompt**
```
gentle folk, acoustic guitar, warm bass, fingerpicked melody, pre-dawn road trip feeling, amber warmth, unhurried but purposeful, 100 BPM, 80 seconds, instrumental, no vocals, rhythm game friendly, loop-ready
```

---

### 7. `fruitPlatter_service` — 鲜果拼盘（面具）

**情绪**：漂浮、轻盈、不需要决定任何事的那种自由——她说「你来搭，你觉得好看就行」  
**BPM**：100–112  
**风格**：ambient pop，柔和合成器，轻打击乐，稍带梦境感，没有强烈的进行感

**Suno prompt**
```
ambient pop, instrumental, soft synthesizer pads, gentle kalimba melody, light airy percussion, dream-like floating mood, no strong direction, 106 BPM, 75 seconds, no vocals, rhythm game friendly, loop-ready
```

---

### 8. `lycheeJuice_service` — 荔枝汁（老弦）

**情绪**：单一乐器的专注，民乐质感遇上极简电子底——「别加别的，混了就听不清楚了」  
**BPM**：105–115  
**风格**：中国民乐元素（二胡或琵琶音色）叠在极简电子节拍上，单一主旋律，精准

**Suno prompt**
```
chinese folk fusion, erhu-style lead melody, minimal electronic beat, plucked string texture, single-instrument focus, precise and clean, understated elegance, 110 BPM, 80 seconds, instrumental, no vocals, rhythm game friendly, loop-ready
```

---

### 9. `warmLemonWater_service` — 热柠檬水（老贝）

**情绪**：睡前，轻，不打扰任何人，脑子里在默默回放今天的事  
**BPM**：78–88  
**风格**：极简钢琴，单声部，很少的音符，大量呼吸空间，不会吵醒人的那种安静

**Suno prompt**
```
minimal solo piano, instrumental, sparse single-note melody, lots of silence, late night pre-sleep mood, gentle reverb, meditative, no percussion, 84 BPM, 90 seconds, no vocals, rhythm game friendly, loop-ready
```

---

### 10. `pineappleJuice_service` — 菠萝汁（月叔）

**情绪**：夜班保安在看星星，甜的东西让他在对的地方走神，流星只持续几秒  
**BPM**：100–108  
**风格**：dreamy synth-pop，轻微催眠感，带一点星光音色（高频玻璃感），温柔的节拍

**Suno prompt**
```
dreamy synth-pop, instrumental, glassy high synthesizer melody, gentle hypnotic rhythm, stargazing mood, sweet and slightly spacey, soft night atmosphere, 104 BPM, 80 seconds, no vocals, rhythm game friendly, loop-ready
```

---

### 11. `strawberryJuice_service` — 草莓汁（无名）

**情绪**：悲伤已经沉下去了，不再往外涌——这杯是固定的，每次都是这一种，就这样  
**BPM**：75–82  
**风格**：单一吉他或钢琴，接近沉默，每个音符都有重量，不是哀乐，是已经接受了的东西

**Suno prompt**
```
solo acoustic guitar, instrumental, sparse fingerpicked melody, minimal, deeply quiet, grief that has settled not grief that is fresh, no percussion, warm but empty, 78 BPM, 85 seconds, no vocals, rhythm game friendly, loop-ready
```

---

## 立绘制作请求（MidJourney）

**统一美术方向**  
- 风格：Visual novel character art，clean anime illustration，contemporary East Asian aesthetic  
- 构图：half-body portrait（胸部以上），朝向稍偏侧或正面，手部可见  
- 背景：white or very light neutral background，无复杂场景  
- 表情：首版生成 **neutral expression**（用作基础立绘），后续按需生成变体  
- 参数：`--ar 3:4 --v 6.1 --stylize 200 --quality 2`

> 每个角色标注了「记忆点」细节——这些细节必须体现在立绘中。

---

### 阿晟（Seeker / DAY）

**视觉记忆点**：手里有几枚硬币，或硬币放在他面前，按大小排成一行；眼镜镜片后的眼神很锐利  
**关键服饰**：深色简约卫衣或衬衫，指甲剪得很短，手机放在一边屏朝下

```
young chinese man, early 30s, black-framed glasses, sharp focused eyes behind lenses, plain dark hoodie, very short neatly trimmed fingernails, a few coins arranged in a neat line from largest to smallest on surface nearby, calm analytical expression, slightly worn but composed, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 老方（Ark Light / DAY）

**视觉记忆点**：站点马甲，袖子卷着；圆脸，眼神里有一点疲倦但很温和  
**关键服饰**：深蓝或深灰快递/物流站点马甲，浅色T恤，袖子卷到肘部

```
middle-aged chinese man, early 40s, round friendly face, tired but warm eyes, wearing a dark navy logistics work vest over a plain t-shirt, sleeves rolled up to elbows, sturdy practical build, slightly calloused hands, open easygoing expression, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 猫小姐（Felis / DAY）

**视觉记忆点**：单只耳钉，刘海，手腕上有一块淡淡的猫爪形印（盖章痕迹）  
**关键服饰**：浅色工作制服（宠物医院前台风格）或休闲上衣

```
young chinese woman, late 20s, straight-cut bangs, single small stud earring in one ear only, faint paw-print stamp mark on wrist, light-colored work blouse, playful and slightly mischievous expression, warm curious eyes, holding a cup with a faint paw print drawn on the lid, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 顾薇（Purple Passion / DAY）

**视觉记忆点**：手上有洗不掉的颜色（多处轻微颜料痕迹）；背包带上露出一个旧的 B5 手绘本封角  
**关键服饰**：艺术系随性穿搭，宽松上衣，颜料未完全洗净的手

```
young chinese woman, late 20s, paint-stained fingers with several faint color marks on hands and forearms, wearing loose casual art-student style clothing, corner of an old worn B5 sketchbook visible, slightly distracted thoughtful expression, eyes that judge color carefully, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 谢音（Maiden's Capriccio / DAY）

**视觉记忆点**：头发束起，手指修长；坐姿笔直，右手手指轻轻搭在桌面上，像是在无意识地敲琴键  
**关键服饰**：简洁正式便装，不华丽，专业感

```
chinese woman, mid 30s, hair neatly pulled back in a bun, slender expressive fingers, one hand resting on surface with fingers slightly curved as if touching piano keys unconsciously, straight composed posture, professional but understated clothing, quiet confident expression, wisdom behind tired eyes, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 林小末（Unwelcome School / DAY）

**视觉记忆点**：书包肩带上挂着七八个大小不一的小挂件（钥匙扣、小玩意），有一个小琥珀色挂件里有只虫子；衣服略宽，鞋子很干净  
**关键服饰**：稍宽松的休闲学生装，背着书包

```
young chinese teenage girl, 15 years old, slightly oversized casual clothing, very clean white sneakers, backpack visible with seven or eight small charms and keychains attached to the strap including a small amber-colored pendant with a tiny insect inside, cheerful but slightly tired expression, casual natural posture, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 流浪者（Gypsy Tronic / DAY）

**视觉记忆点**：旧包上有一个褪色的织物徽章（图案已模糊）；说不清哪里来的人，穿着说得过去但有一种说不清的「不像本地人」  
**关键服饰**：实用旅行风，旧感明显但整洁，不像游客也不像本地人

```
middle-aged man, around 40, slightly indeterminate East Asian or mixed appearance, weathered calm face, practical travel-worn clothing, worn canvas backpack with a faded embroidered fabric patch (design illegible), knowing quiet eyes, slight stubble, expression that has seen many places and does not explain itself, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 程晚（Drama / DUSK）

**视觉记忆点**：妆容精致但有一处轻微晕开（演出刚结束，卸了一半）；落座前会看一眼椅子——确认受力点  
**关键服饰**：带有剧院感的正式便装，不是戏服，但有点舞台气质

```
chinese woman, early 30s, refined stage makeup with one spot slightly smudged as if recently worn for hours, elegant slightly theatrical clothing (not a costume but stage-adjacent), slightly tired posture but precise, expression shifting between performed and real, refined beauty with fatigue underneath, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 远哥（Faraway / DUSK）

**视觉记忆点**：手粗糙厚实；背微驼（开车多年）；手机屏保画面能隐约看到是一个驾驶室内景（第一辆卡车的）  
**关键服饰**：简单实用外套（格子衬衫或卡车司机夹克），不修边幅但不邋遢

```
middle-aged chinese man, mid 40s, rough calloused hands, slightly stooped shoulders from years of driving, simple practical jacket or flannel shirt, slow kind eyes, weathered face with genuine warmth, phone in hand with a blurry truck cabin interior visible on screen, unhurried presence, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 面具（Masquerade / DUSK）

**视觉记忆点**：刻意的普通——来铺子时不化妆，穿得完全不起眼；但有一次眼角下方有一点没卸干净的眼影  
**关键服饰**：极其普通的日常便装，没有任何辨识度，这就是重点

```
young chinese woman, mid 20s, deliberately plain unremarkable appearance, no makeup (or barely visible trace of eyeliner not fully removed near the corner of one eye), completely ordinary casual clothing with nothing distinctive, neutral expression that feels slightly studied, the kind of face that is hard to remember, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 老弦（Grafiore / DUSK）

**视觉记忆点**：拿水杯时四根手指握着，大拇指不参与（持弓习惯）；坐姿很直  
**关键服饰**：略正式的便装，有一种已经习惯了要「在场」的气质

```
chinese man, 40 years old, very straight posture like a musician, holding a cup with four fingers only, thumb distinctly separated and not touching the cup (old bow-holding habit), steady deliberate hands, calm contemplative expression, slightly formal casual clothing, the look of someone who once performed, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 老贝（Beethoven Virus / NIGHT）

**视觉记忆点**：拎一个旧的布袋，进来之后先把袋子放好再坐；戴眼镜，头发花白  
**关键服饰**：整洁但随意的晚间散步装，布袋（放的位置暗示他打算待多久）

```
elderly chinese man, early 60s, silver-grey hair, wearing glasses, holding or setting down a worn cloth shopping bag, gentle intelligent eyes, neat casual evening wear suitable for a neighborhood walk, dignified unhurried presence, slightly formal posture from decades of teaching, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 焰子（Night of Fire / NIGHT）

**视觉记忆点**：头盔挂在手臂上；摩托后座（或背包上）绑着一只褪色的塑料小恐龙  
**关键服饰**：骑手装备（夹克+骑行裤），头盔在手臂弯里，眼神一直在扫视环境

```
young chinese woman, early 20s, wearing a delivery rider jacket and riding pants, helmet carried over forearm, small faded plastic toy dinosaur clipped to bag strap, alert energetic eyes constantly scanning surroundings, quick ready expression, slight breathlessness from constant motion, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 小兵（Toy War / NIGHT）

**视觉记忆点**：包里有一个测试用的平板，偶尔拿出来；表情温和，看起来不太像「程序员」刻板印象  
**关键服饰**：宽松舒适的便装，技术感低，更像在放假

```
young chinese man, late 20s, soft approachable appearance, loose comfortable casual clothing, small tablet visible in open bag, mild thoughtful expression, the kind of gentleness that works with children, slightly tired from sitting all day, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 老宋（Qua Vadis / NIGHT）

**视觉记忆点**：西装衬衫但领带没系，袖扣松着——刚从某个场合脱身，还没完全放下那个角色  
**关键服饰**：正式衬衫（领口开着），袖子略松，整体状态是「在正式和放松之间没有完全着陆」

```
chinese man, late 30s, wearing a dress shirt with collar unbuttoned and no tie, sleeve cuffs slightly undone, slight hollowness to his cheeks from long corporate years, quietly waiting expression, a man practicing the act of not being anywhere in particular, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 月叔（Lunatic Sky / NIGHT）

**视觉记忆点**：保安制服口袋里有一个小本子（翻到某页可以看见手写的流星记录，日期+方向+「像针」）  
**关键服饰**：深色保安制服，干净，走路安静

```
middle-aged chinese man, around 40, wearing a dark security guard uniform, small worn notebook visible in breast pocket with handwritten notes partially visible (dates and brief descriptions), quiet observant eyes that are comfortable with the dark and silence, someone who has made peace with an unexpected life, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

### 无名（Ineffabilis / NIGHT）

**视觉记忆点**：完全普通的外貌，这是设计——不特别，不悲伤，只是有一种在场的重量  
**关键服饰**：深色普通便装，没有任何可识别的特征

```
middle-aged chinese man, ordinary unremarkable appearance, plain dark clothing with no distinctive features, soft quiet presence, expression neither sad nor absent but weighted with something that has settled, the kind of face you see once and almost forget and then suddenly remember, half-body portrait, visual novel character art, clean anime illustration, contemporary urban style, white background, --ar 3:4 --v 6.1 --stylize 200
```

---

## 待办汇总

### 立绘（MidJourney）
- [ ] 阿晟 / 老方 / 猫小姐 / 顾薇 / 谢音 / 林小末 / 流浪者（DAY × 7）
- [ ] 程晚 / 远哥 / 面具 / 老弦（DUSK × 4）
- [ ] 老贝 / 焰子 / 小兵 / 老宋 / 月叔 / 无名（NIGHT × 6）
- 每人生成后需按需补充表情变体（smile / serious / surprised 等）

### Service 曲（Suno）
- [ ] fruitCup · grapeSmoothie · citrusFizz · criticSpecial（现有菜单项补曲）
- [ ] freshOrangeJuice · hotOrangeJuice · fruitPlatter · lycheeJuice（新品 × 4）
- [ ] warmLemonWater · pineappleJuice · strawberryJuice（新品 × 3）

### 代码/数据
- [ ] `data/menu_items.json`：新增 7 个菜单项（规格见上）
- [ ] `data/songs.json`：生成后为每首 service 曲添加 entry（type: "service"）
- [ ] `data/flows/`：各 VIP 的 day flow 文件中补充 service phase 的 songId

---

## 修订记录

- **v1**：建档。含 17 VIP 总览表、7 个新菜单项规格、11 首 service 曲 Suno prompts、17 位 VIP MidJourney 立绘 prompts。
