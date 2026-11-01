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
