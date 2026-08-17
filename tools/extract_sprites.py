#!/usr/bin/env python3
"""从 bc_0.png / bc_1.png 提取精灵图块，输出紧凑 JSON 供游戏使用。
每个 16x16 图块 -> 16 行字符串，每行 16 字符，字符为调色板索引或 '.' (透明)。
"""
from PIL import Image
import json, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))

S0 = Image.open(os.path.join(HERE, '..', 'ref', 'bc_0.png')).convert('RGBA')  # 16x16 tiles, 16 cols x 18 rows
S1 = Image.open(os.path.join(HERE, '..', 'ref', 'bc_1.png')).convert('RGBA')  # 8x8 tiles, 6 cols x 2 rows

def tile_to_index_grid(img, tx, ty, size=16):
    """将图块转为 索引字符网格；颜色->字母映射按出现顺序"""
    colormap = {}   # rgba -> 'a','b','c'...
    def idx(c):
        if c[3] < 128: return '.'
        if c not in colormap:
            colormap[c] = chr(ord('a') + len(colormap))
        return colormap[c]
    rows = []
    for y in range(ty*size, ty*size+size):
        rows.append(''.join(idx(img.getpixel((x, y))) for x in range(tx*size, tx*size+size)))
    # 颜色表：字母 -> [r,g,b]
    palette = {k: list(v[:3]) for v, k in colormap.items()}
    return rows, palette

out = {"palettes": {}, "sprites": {}}

def add(name, tx, ty, size=16, sheet=0):
    img = S0 if sheet == 0 else S1
    rows, pal = tile_to_index_grid(img, tx, ty, size)
    out["sprites"][name] = {"rows": rows, "pal": pal}

# ---- 坦克（每型 8 帧: up1,up2,left1,left2,down1,down2,right1,right2）----
# 玩家（黄）：bc_0 行 0 列 0-7
for i in range(8):
    add(f"player_{i}", i, 0)
# 敌人-普通（绿，小炮塔设计）：行 10 列 0-7
for i in range(8):
    add(f"enemy_small_green_{i}", i, 10)
# 敌人-重型（绿，大炮塔设计，将换红色调色板）：行 11 列 0-7
for i in range(8):
    add(f"enemy_big_green_{i}", i, 11)
# 敌人-灰色（小设计）：行 0 列 8-15
for i in range(8):
    add(f"enemy_gray_{i}", 8+i, 0)
# 敌人-白/红（大设计）：行 11 列 8-15
for i in range(8):
    add(f"enemy_big_fij_{i}", 8+i, 11)

# ---- 地形 ----
add("tree", 2, 8)               # 树 16x16
add("water_f0", 10, 8)          # 水（紫）16x16 帧1
add("water_f1", 11, 8)          # 水帧2
add("water_f2", 10, 9)          # 水帧3
add("steel8", 2, 0, size=8, sheet=1)   # 钢 8x8
add("ice8", 4, 0, size=8, sheet=1)     # 冰 8x8（将换浅蓝色调）
add("water8_f0", 2, 1, size=8, sheet=1)  # 蓝水 8x8 帧1
add("water8_f1", 3, 1, size=8, sheet=1)  # 帧2
add("water8_f2", 4, 1, size=8, sheet=1)  # 帧3

# ---- 老鹰（基地）----
add("eagle_tl", 12, 16); add("eagle_tr", 13, 16)
add("eagle_bl", 14, 16); add("eagle_br", 15, 16)
add("eagle_dmg_tl", 10, 17); add("eagle_dmg_tr", 11, 17)
add("eagle_dmg_bl", 12, 17); add("eagle_dmg_br", 13, 17)

# ---- 道具 ----
add("star_pow", 2, 16)   # 星星（白色4角星，用帧1）
add("star_pow2", 3, 16)
add("shovel_pow", 1, 16) # 铲子（箭头/锹形）
add("tank_pow", 8, 16)   # 坦克（加命）
add("tank_pow2", 9, 16)

# ---- 出生动画（白色星星，4帧：行16列2-5）----
add("spawn0", 2, 16)
add("spawn1", 3, 16)
add("spawn2", 4, 16)
add("spawn3", 5, 16)

json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sprites.json'), 'w'), separators=(',', ':'))
print("OK sprites.json:", len(json.dumps(out)), "bytes")
