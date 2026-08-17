#!/usr/bin/env python3
"""从 sprites.json / stages.json 生成游戏用的 JS 数据文件。"""
import json

out_dir = '.'
sprites = json.load(open('../sprites.json'))

# ---- 生成 sprites.js ----
# 颜色统一成游戏内可换色的调色板槽位：
# 坦克类精灵会被重新着色，这里把每个精灵的调色板保留，游戏内再做映射
js = []
js.append("// 自动生成：精灵数据。格式: {name: {rows: [16行字符串], pal: {char: [r,g,b]}}}")
js.append("const SPRITE_DATA = " + json.dumps(sprites, separators=(',', ':')) + ";")
open(f'{out_dir}/sprites.js', 'w').write("\n".join(js))

# ---- 生成 stages.js ----
stages = json.load(open('../ref/stages.json'))
# 关卡地图：26x26 半格 -> 13x13 瓦片（带子砖掩码）
def convert_map(grid26):
    tiles = []
    for ty in range(13):
        row = []
        for tx in range(13):
            subs = [
                grid26[ty*2][tx*2],     # TL
                grid26[ty*2][tx*2+1],   # TR
                grid26[ty*2+1][tx*2],   # BL
                grid26[ty*2+1][tx*2+1], # BR
            ]
            if subs[0] == subs[1] == subs[2] == subs[3]:
                v = subs[0]
                if v == 1: row.append([1, 15, 0])   # 全砖
                elif v == 2: row.append([2, 0, 15]) # 全钢
                else: row.append([v, 0, 0])
            else:
                # 混合：砖掩码 + 钢掩码（原版有半砖半钢的图块）
                bmask = 0; smask = 0
                for i, s in enumerate(subs):
                    if s == 1: bmask |= (1 << i)
                    elif s == 2: smask |= (1 << i)
                if bmask: row.append([1, bmask, smask])
                elif smask: row.append([2, 0, smask])
                else:
                    # 特殊地形与空混合：取众数
                    from collections import Counter
                    top = Counter(subs).most_common(1)[0][0]
                    row.append([top, 0, 0])
        tiles.append(row)
    return tiles

out = {"stages": {}, "enemies": {}}
for k in stages['stages']:
    out['stages'][k] = convert_map(stages['stages'][k])
out['enemies'] = stages['enemies']
open(f'{out_dir}/stages.js', 'w').write("const STAGE_DATA = " + json.dumps(out, separators=(',', ':')) + ";")
print("built sprites.js + stages.js")
