"""
fix-outlines.py — 把所有生成帧中的纯黑轮廓线替换为暖深棕
#000000 → #2B1D0F
运行：python3 scripts/fix-outlines.py
"""

import os, sys
from PIL import Image

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'generated')
FROM_COLOR = (0, 0, 0)       # #000000 纯黑
TO_COLOR   = (43, 29, 15)    # #2B1D0F 暖深棕
THRESHOLD  = 10              # 允许轮廓色有轻微误差

def replace_outline(path: str) -> int:
    """返回替换的像素数"""
    img = Image.open(path).convert('RGBA')
    pixels = img.load()
    w, h = img.size
    count = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 10:
                continue  # 透明像素跳过
            # 色距判断（欧氏距离）
            dr = r - FROM_COLOR[0]
            dg = g - FROM_COLOR[1]
            db = b - FROM_COLOR[2]
            if dr*dr + dg*dg + db*db <= THRESHOLD * THRESHOLD:
                pixels[x, y] = (TO_COLOR[0], TO_COLOR[1], TO_COLOR[2], a)
                count += 1
    if count > 0:
        img.save(path)
    return count

def main():
    total = 0
    for root, _dirs, files in os.walk(ASSETS_DIR):
        for fname in files:
            if not fname.endswith('.png'):
                continue
            fpath = os.path.join(root, fname)
            n = replace_outline(fpath)
            if n > 0:
                rel = os.path.relpath(fpath, ASSETS_DIR)
                print(f"  {rel}: 替换了 {n} 个像素")
                total += n
    print(f"\n完成，共替换 {total} 个像素（#000000 → #2B1D0F）")

if __name__ == '__main__':
    main()
