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

### 现有立绘的标准（新图必须照这个出）

量自 `assets/game_art/` 里现有的常客立绘：

| 项目 | 标准 |
|---|---|
| 文件 | 透明背景 PNG（RGBA） |
| 尺寸 | `neutral.png` 928×1232；其余表情 1792×2380。两种都是 3:4，比例不能变 |
| 构图 | 一个人，正对镜头、身体略微侧转；头顶上方留一小段空，往下一直截到大腿中段，画面底边直接切断，不画脚 |
| 画风 | 干净的日系动画赛璐璐：清晰的深色描线，平涂加一层柔和阴影，皮肤偏暖；不是厚涂、不是写实 |
| 配色 | 全作的主色是绿和橙（店的颜色），衣服上可以带一点 |
| 一致性 | 同一角色的所有表情：脸、发型、衣服、构图、大小、位置完全一样，只改表情和手 |
| 禁止 | 文字、logo、数字、水印（之前有几张立绘右下角留了生图工具的四角星水印，要检查） |

**出图顺序：** 先出 `neutral.png`，满意以后，再把它作为参考图出其余表情，提示词里写 `same character, same outfit, same framing and size, only change the expression`。

**放好以后告诉我，立绘要在代码里登记才会显示。**

### 4.1 配送机器人「小递」（优先，第 3–10 天每天出场）

原型是现实里的餐厅送餐机器人：齐腰高的白色柜子，顶上一块小屏幕，表情全靠屏幕上的简笔脸。

**要附的参考图：**
1. `assets/game_art/lao_fang/neutral.png`：描线、上色和构图的风格参考。
2. `assets/game_art/yan_zi/neutral.png`：主色参考，同属这条街的配送行业。
3. 一张真实的餐厅送餐机器人照片（网上搜「送餐机器人」任选一张）：只参考形体。提示词里要求不要猫耳朵、不要任何品牌标志。

**路径：** `assets/game_art/xiao_di/`，共六张，尺寸按上面的标准（`neutral.png` 928×1232，其余 1792×2380）。

**公共提示词：**

```
Character art for a slice-of-life anime visual novel, matching the attached reference portraits:
clean anime cel shading, crisp dark outlines, flat colors with one soft shadow step.
Subject: a small waist-high indoor delivery robot, shown whole and centered, filling the frame the
same way the reference characters do. Rounded white plastic cabinet body like a bedside table, on
four small wheels; a front compartment door with a thin glowing blue light strip; a small
rectangular screen on top that acts as its face; slightly scuffed edges from daily use. Friendly
and a little clumsy-looking. A small green and orange accent stripe on the side.
Use the attached photo only for the body shape: no cat ears, no brand marks.
Transparent background. Portrait 3:4. No text, no letters, no logos, no numbers anywhere,
including on the screen. No watermark.
```

**六张，只换屏幕或机身：**
- `neutral.png`：`The screen shows a minimal face: two round black dots for eyes and a short flat line.`
- `smile.png`：`The screen shows a minimal smiling face: two round dots and a gentle upward curve.`
- `waiting.png`：`The screen shows a simple hourglass icon instead of a face.`
- `mimic.png`（第 8 天学柚子说“吃面”）：`The screen shows a tiny minimal doodle of a girl's face with a short green bob and a round orange-slice hair clip, in the same simple line style.`（可以再附 `assets/game_art/yuzu/neutral.png`）
- `v2_neutral.png`（第 10 天全量升级后）：机身换成 `a sleeker newer model of the same robot: slightly taller, seamless glossy white shell, a larger wide screen, two small rubber tracks instead of wheels, a soft white glow around the screen edge`，屏幕 `calm minimal face, two soft glowing dots and a faint curve`。参考图加上已经生成的 `neutral.png`，保持“同一系列”的感觉。
- `v2_smile.png`：同上，屏幕 `two soft glowing dots and a warm smiling curve, perfectly symmetrical`。

### 4.2 老王（优先，五金店老板，第 3、5、10 天）

**要附的参考图：**
1. `assets/game_art/lao_bei/neutral.png`：同年龄段的老人怎么画（皱纹、白发、眼镜）。
2. `assets/game_art/lao_fang/neutral.png`：同一条街上干活的人怎么穿（工装、马甲）。

**路径：** `assets/game_art/lao_wang/` 下 `neutral.png`（928×1232）、`laugh.png`、`wistful.png`（1792×2380）。

```
Character portrait for a slice-of-life anime visual novel, matching the attached reference
portraits exactly in style, framing and size: clean anime cel shading, crisp dark outlines, flat
colors with one soft shadow step; one person facing the viewer, body turned slightly, cropped at
mid-thigh by the bottom edge, small margin above the head.
Subject: a cheerful 70-year-old Chinese man who runs a small hardware and key-cutting shop on an
old street. Short grey crew cut, sun-tanned wrinkled face, thick grey eyebrows, reading glasses
pushed up on his forehead, a faded navy work vest with many pockets over a white undershirt, a
carpenter's pencil behind one ear, a small paper bag of sunflower seeds in one hand.
Hands anatomically correct with five fingers, or kept out of frame.
Transparent background. Portrait 3:4. No text, no logos, no watermark.
```

表情（出完 `neutral.png` 再出）：
- `neutral.png`：`relaxed and chatty, mouth slightly open as if about to share gossip`
- `laugh.png`：`laughing loudly with eyes squeezed shut, the free hand raised mid-slap`
- `wistful.png`（第 10 天说要回老家钓鱼）：`a quiet wistful half-smile, eyes looking slightly off to the side`

### 4.3 阿凯（可选，第 10 天刚出院的骑手，和焰子同一个分拣站）

**要附的参考图：**
1. `assets/game_art/yan_zi/neutral.png`：同一个站的骑手，外套款式和配色要一样（橙色外套、反光条、绿裤子）。
2. `assets/game_art/lao_fang/neutral.png`：风格和构图参考。

**路径：** `assets/game_art/a_kai/` 下 `neutral.png`（928×1232）、`grin.png`（1792×2380）。

```
Character portrait for a slice-of-life anime visual novel, matching the attached reference
portraits exactly in style, framing and size (cel shading, crisp dark outlines, cropped at
mid-thigh, facing the viewer).
Subject: a young Chinese food-delivery rider, about 20, short messy black hair, wearing the same
orange rider jacket with reflective strips and green trousers as the rider in the reference, his
left arm in a white sling, a small bandage on his cheek.
Transparent background. Portrait 3:4. No text or logos on the jacket. No watermark.
```

表情：`neutral.png` 有点不好意思地挠头（只用右手）；`grin.png` 咧嘴笑。

## 5. 新背景（可选，需要我加一个小功能才能切换）

现在所有对白都用店内背景。下面两张能让最重要的两场戏换个地方，图到了我再加“某一段对白换背景”的功能。

### 现有对白背景的标准

| 项目 | 标准 |
|---|---|
| 文件 | PNG（RGB，不透明） |
| 尺寸 | 竖版 816×1456、横版 1456×816，各一张 |
| 画风 | 对白时用的是 `sunny_shop/shop_interior_*` 和 `home/apartment_*`：暖光、细节多、像动画电影背景的手绘风。不是街景主视觉 `main_visual_*` 那种扁平插画风，新背景要跟前者 |
| 构图 | 下方三分之一会被对话框盖住，重要的东西放在画面上半部分；人物立绘会站在左右两侧，画面中间留一点空 |
| 禁止 | 人物（立绘另画）、文字、招牌上的字、logo、水印 |

### 5.1 店门口的夜街和公交站灯箱（第 9 天程晚的演出）

**要附的参考图：**
1. `assets/game_art/sunny_shop/shop_interior_portrait.png`：画风和笔触参考（这张必须附）。
2. `assets/game_art/home/apartment_portrait.png`：同一画风下光线和细节的密度。
3. `assets/game_art/neon_night/main_visual_portrait.png`：只参考夜晚的色调和灯光，不参考画法。

**路径：** `assets/game_art/street/bus_stop_night_portrait.png`、`bus_stop_night_landscape.png`

```
Background art for a slice-of-life anime visual novel, matching the painterly style of the first
attached reference (warm, detailed, cinematic anime-film background), but at night; use the third
reference only for night colors and lighting.
Scene: a quiet old-neighborhood street at night, seen from the doorway of a small fruit juice
shop. Across the narrow street, a bus stop shelter with a large glowing advertising light box
showing a beautiful smiling young woman, glossy and perfect like a commercial. Warm streetlights,
a few parked scooters, a red motorbike with a small faded green toy dinosaur tied to the back
seat. Damp pavement reflecting the light box. Quietly melancholic, warm and cool light mixed.
Keep the lower third simple. No people other than the woman inside the light box.
No text, no letters, no logos anywhere, including on the light box and shop signs. No watermark.
```

### 5.2 雨夜地铁口和饮品机（第 7 天主角修机器）

**要附的参考图：** 同 5.1 的三张。

**路径：** `assets/game_art/street/subway_kiosk_rain_portrait.png`、`subway_kiosk_rain_landscape.png`

```
Background art for a slice-of-life anime visual novel, matching the painterly style of the first
attached reference, but on a rainy night; use the third reference only for night colors.
Scene: a subway station entrance on a city street in heavy rain. Beside the entrance stairs stands
a sleek white automated drink vending kiosk with a large screen showing a simple smiley-face icon,
its side maintenance panel slightly open. Puddles, streetlight and neon reflections, an orange
rider helmet resting on the kiosk ledge. Lonely, cinematic, blue and amber light.
Keep the lower third simple. No people. No text, no letters, no logos, no numbers anywhere.
No watermark.
```

## 6. 出图后的检查清单

- [ ] 尺寸和比例对：立绘 3:4（928×1232 / 1792×2380），背景 816×1456 / 1456×816。
- [ ] 立绘是透明背景，边缘没有白边或残留的背景色。
- [ ] 同一角色的几张表情叠在一起看：头的位置、大小、衣服都对得上。
- [ ] 放大检查屏幕、灯箱、招牌、衣服：没有乱码文字和 logo。
- [ ] 四个角落没有生图工具的水印。
- [ ] 手指数对（五根），或者手在画面外。
