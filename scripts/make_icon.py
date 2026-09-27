"""Builds assets/mozare-workbench.ico: the Workbench 'MW' mark on the app's dark surface with its teal accent."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SIZE = 256
BACKGROUND = (22, 27, 26, 255)
ACCENT = (106, 168, 156, 255)
INK = (236, 240, 238, 255)

image = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((8, 8, SIZE - 8, SIZE - 8), radius=56, fill=BACKGROUND, outline=ACCENT, width=10)
font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 92)
box = draw.textbbox((0, 0), 'MW', font=font)
x = (SIZE - (box[2] - box[0])) / 2 - box[0]
y = (SIZE - (box[3] - box[1])) / 2 - box[1] - 10
draw.text((x, y), 'MW', font=font, fill=INK)
draw.rounded_rectangle((78, 192, SIZE - 78, 204), radius=6, fill=ACCENT)

target = ROOT / 'assets' / 'mozare-workbench.ico'
target.parent.mkdir(exist_ok=True)
image.save(target, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
image.save(ROOT / 'assets' / 'mozare-workbench.png')
print(target)
