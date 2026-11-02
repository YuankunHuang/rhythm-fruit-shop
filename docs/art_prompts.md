# 缺失美术的生成提示词

游戏代码已经引用、仓库里还没有的图。生成后按下面的路径放好即可，代码不用改（饮品封面例外，见第 2 节最后）。

通用要求：
- **不要任何文字。** AI 生图最常见的痕迹就是招牌、海报、日历上的乱码。提示词里已经写了 `no text`；生成后仍要放大检查纸张、屏幕、标签和招牌。
- 尺寸：横版 1456×816，竖版 816×1456，PNG。
- 风格参照：竖屏玩家主要看到 `assets/game_art/home/apartment_portrait.png`（暖色、逆光、厚涂感）和 `sunny_shop/shop_interior_portrait.png`（明亮、绿植、晨光）。可以把参照图作为风格参考图一起喂给生图工具。

## 1. 店铺阁楼（住处升级后的家）

- 路径：`assets/game_art/home/shop_dorm_portrait.png`、`assets/game_art/home/shop_dorm_landscape.png`
- 游戏里的文案：标题「店铺阁楼」，副标题「楼下就是柜台。这里终于像一个能落脚的地方。」
- 叙事要点：从廉租小屋搬到店楼上。保留几件旧物（绿色帆布袋、电热水壶、一篮橙子），让玩家认出这是同一个人搬了家；空间更暖、更有人气，但仍然朴素。

竖版提示词：

```
Cozy small attic bedroom directly above a neighborhood fresh-fruit juice shop, vertical composition.
Sloped wooden ceiling with exposed beams, a small slanted skylight window pouring warm morning
light, dust motes in the light. A narrow single bed with a folded knitted blanket under the slope,
a small wooden desk by the window with an electric kettle, a woven basket of oranges and an open
notebook with blank pages. A wooden fruit crate reused as a shelf holding glass juice bottles and a
trailing pothos plant. A green canvas tote bag hanging on a wall hook beside a shop apron. In the
floor, an open wooden hatch with a short staircase going down, warm light rising from the shop
below. Painterly anime background art, slice-of-life, warm honey wood, cream walls and sage green
accents, soft backlight, rich but calm. No people. No text, no letters, no signs, no logos, no
writing on any paper, label or screen.
```

横版提示词：同上，把 `vertical composition` 换成 `wide horizontal composition, bed on the left, desk and skylight in the centre, hatch and staircase on the right`。

## 2. 饮品封面（13 款服务曲）

- 路径：`assets/songs/<id>/cover.png`，横版 1456×816。缩略图会从中间裁成正方形，**饮品要放在画面中央约 1/2 宽度内**；横幅左下角会压白色标题，那里保持相对简洁。
- 现状：13 款饮品都没有封面，列表里显示的都是同一张店铺开屏图，菜单里分不出谁是谁。

通用前缀（每款都加）：

```
Painterly anime illustration, a single drink served on the wooden counter of a small sunlit
neighborhood juice shop, the drink centred and filling the middle half of the frame, background
softly out of focus with green plants and fruit crates, warm natural light, cosy slice-of-life
mood. No people, no hands. No text, no letters, no labels, no logos, no signs.
```

每款加一句：

| id | 游戏里的名字与提示 | 追加描述 |
| --- | --- | --- |
| `citrus_fizz` | 柑橘碳酸 · 有气 · 快 · 清爽冲劲 | a tall glass of sparkling orange-and-lime soda, lots of rising bubbles, ice, an orange wheel and a lime wedge on the rim, striped green straw |
| `fresh_orange_juice` | 鲜榨橙汁 | a glass of freshly squeezed opaque orange juice, a halved orange and a hand juicer beside it |
| `hot_orange_juice` | 热橙汁 | a ceramic mug of hot orange juice with gentle steam, a cinnamon stick and an orange slice, cooler morning light |
| `lemon_water` | 柠檬水 · 标准 · 冰的 | a tall glass of iced lemon water, lemon slices and ice cubes, condensation droplets on the glass |
| `lemon_water_light` | 柠檬水·清 · 室温 · 清淡 | a plain glass of room-temperature water with one thin lemon slice, no ice, quiet and minimal |
| `warm_lemon_water` | 温柠檬水 | a clear heatproof glass cup of warm lemon water, faint steam, honey jar nearby |
| `grape_smoothie_still` | 葡萄冰沙 · 稠 · 打包 · 吸管有阻力 | a thick purple grape smoothie in a takeaway cup with a domed lid and a wide straw, frost on the cup |
| `grape_smoothie_afterglow` | 葡萄冰沙·余韵 · 偏酸 · 演出后的味道 | the same purple grape smoothie at dusk, pink and violet stage-light afterglow reflecting on the cup |
| `grape_smoothie_smolder` | 葡萄冰沙·余烬 · 更酸 · 演出后的灼感 | the same grape smoothie late at night, deep purple, a warm ember-orange rim light, a few glowing sparks in the air |
| `lychee_juice` | 荔枝汁 | a glass of pale translucent lychee juice, peeled white lychees and red bumpy lychee shells on the counter |
| `fruit_cup` | 彩虹鲜果杯 · 当日招牌 · 色彩层次 | a clear cup layered with diced fruit in rainbow order (strawberry, orange, pineapple, kiwi, blueberry, grape) |
| `fruit_cup_quiet` | 鲜果杯（安静版） | the same layered fruit cup in soft evening light, muted calm colours |
| `fruit_platter` | 果盘 | a round plate of neatly sliced fruit arranged in a fan, toothpicks, top-down three-quarter view |

`fruit_cup_quiet`、`fresh_orange_juice`、`hot_orange_juice`、`warm_lemon_water`、`lychee_juice`、`fruit_platter` 在剧情里没有显示名，表里的中文名是描述，不是游戏文本。

## 3. 需要重画的立绘（传统修图修不了的手）

- `assets/game_art/lao_bei/attentive.png`：交叉的手指缠在一起，最下面那根指头两端都有指甲，数不清几根。
- `assets/game_art/xiao_bing/neutral.png`：拿平板的左手是一块没有明暗的肉色色块，五根指头叠成条状、没有拇指，颜色也和右手对不上。

重画时用同一角色的其他表情图做参考，保持 1792×2380（`xiao_bing/neutral.png` 是 928×1232）、透明背景；提示词加 `hands relaxed and anatomically correct, five fingers` 或干脆让手出画。生成后检查右下角和左下角有没有生图工具的四角星水印（之前有几张立绘去背景后留下了）。

## 饮品封面接入

放好后，在 `data/songs.json` 对应条目加一行 `"cover": "assets/songs/<id>/cover.png"`，游戏才会读取（故事曲目默认读同目录的 `cover.png`，饮品不默认读取，避免对不存在的文件发请求）。

## 4. 新剧情需要的立绘（2026-11-01 剧情重写后）

通用要求（同现有立绘）：透明背景 PNG，3:4，928×1232；动漫风角色立绘，柔和赛璐璐上色、略带厚涂；人物腰部以上（机器人画全身）；不要文字、不要水印。可以把 `assets/game_art/lao_fang/neutral.png` 作为风格参考图一起喂给生图工具。同一角色的几张表情，先生成第一张，再用它当参考图生成其余几张，保持脸和衣服一致。

**放好以后告诉我，立绘要在代码里登记才会显示。**

### 4.1 配送机器人「小递」（优先，第 3–10 天每天出场）

原型是现实里的餐厅送餐机器人（海底捞那种）：齐腰高的白色柜子，顶上一块小屏幕，屏幕上是简笔表情。它的“表情”全靠屏幕。

路径：`assets/game_art/xiao_di/` 下面六张。

公共描述（每张都带上）：

```
Full-body character art of a small waist-high indoor delivery robot, standing on a transparent
background. Rounded white plastic cabinet body like a bedside table on four small wheels, a front
compartment door with a thin glowing blue light strip, a small rectangular screen on top acting as
its face, slightly scuffed edges from daily use. Clean, friendly, a little clumsy-looking.
Soft cel-shaded anime illustration style matching a slice-of-life visual novel, gentle lighting.
No text, no letters, no logos, no numbers anywhere, including on the screen.
```

各张只换屏幕内容：
- `neutral.png`：`The screen shows a minimal face: two round black dots for eyes and a short flat line.`
- `smile.png`：`The screen shows a minimal smiling face: two round dots and a gentle upward curve.`
- `waiting.png`：`The screen shows a simple hourglass icon instead of a face.`
- `mimic.png`（第 8 天学柚子说“吃面”）：`The screen shows a tiny simple doodle of a girl's face with short green bob hair and a round orange-slice hair clip, drawn in the same minimal line style.`
- `v2_neutral.png`（第 10 天全量升级后）：把公共描述里的身体换成 `a sleeker newer model of the same robot: slightly taller, seamless glossy white shell, a larger wide screen, two small rubber tracks instead of wheels, a soft white glow around the screen edge`，屏幕：`calm minimal face, two soft glowing dots and a faint curve`。
- `v2_smile.png`：同上，屏幕 `two soft glowing dots and a warm smiling curve, perfectly symmetrical`。

### 4.2 老王（优先，五金店老板，第 3、5、10 天）

路径：`assets/game_art/lao_wang/` 下 `neutral.png`、`laugh.png`、`wistful.png`。

```
Waist-up character portrait of a cheerful 70-year-old Chinese man who runs a small hardware and
key-cutting shop on an old street. Short grey crew cut, sun-tanned wrinkled face, thick eyebrows,
reading glasses pushed up on his forehead, a faded navy work vest over a white undershirt, a
carpenter's pencil behind one ear, a small paper bag of sunflower seeds in one hand.
Transparent background. Soft cel-shaded anime illustration, warm slice-of-life visual novel style.
Hands relaxed and anatomically correct, five fingers, or kept out of frame. No text, no logos.
```

表情：
- `neutral.png`：`relaxed, chatty expression, mouth slightly open as if about to tell gossip`
- `laugh.png`：`laughing loudly with eyes squeezed shut, one hand slapping the air`
- `wistful.png`（第 10 天说要回老家钓鱼）：`a quiet wistful half-smile, looking slightly off to the side`

### 4.3 阿凯（可选，第 10 天刚出院的骑手）

路径：`assets/game_art/a_kai/` 下 `neutral.png`、`grin.png`。

```
Waist-up character portrait of a young Chinese food-delivery rider, about 20, short messy black
hair, a bright orange delivery vest over a grey hoodie, his left arm in a white sling, a small
bandage on his cheek. Transparent background. Soft cel-shaded anime illustration, slice-of-life
visual novel style. No text or logos on the vest.
```

表情：`neutral.png` 有点不好意思；`grin.png` 咧嘴笑。

## 5. 新背景（可选，需要我加一个小功能才能切换）

现在所有对白都用店内背景。下面两张图能让最重要的两场戏换个地方；图到了我再加“某一段对白换背景”的功能。尺寸同前：横版 1456×816、竖版 816×1456，各一张。

### 5.1 店门口的夜街和公交站灯箱（第 9 天程晚的演出）

路径：`assets/game_art/street/bus_stop_night_portrait.png`、`..._landscape.png`

```
Night street scene in an old neighborhood, seen from the doorway of a small fruit juice shop.
Across the narrow street, a bus stop shelter with a large glowing advertising light box showing a
beautiful smiling young woman, glossy and perfect like a commercial, holding nothing. Warm
streetlights, a few parked scooters, a red motorbike with a small faded green toy dinosaur tied
to the back seat. Wet pavement reflecting the light box. Quiet, slightly melancholic, warm and
cool light mixed. Painterly anime background art, slice-of-life. No people in the foreground.
No text, no letters, no logos anywhere, including on the light box and shop signs.
```

### 5.2 雨夜地铁口和饮品机（第 7 天主角修机器）

路径：`assets/game_art/street/subway_kiosk_rain_portrait.png`、`..._landscape.png`

```
Rainy night at a subway station entrance on a city street. Beside the entrance stairs stands a
sleek white automated drink vending kiosk with a large screen showing a simple friendly smiley
face icon, its side maintenance panel slightly open. Heavy rain, puddles, neon and streetlight
reflections, an orange delivery rider's helmet resting on the kiosk ledge. Lonely, cinematic,
blue and amber light. Painterly anime background art, slice-of-life. No people. No text, no
letters, no logos, no numbers anywhere.
```
