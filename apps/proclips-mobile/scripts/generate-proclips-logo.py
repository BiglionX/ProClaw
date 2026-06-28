#!/usr/bin/env python3
"""
Generate ProClips logo: ProClaw logo + colorful sunglasses overlay.

- Input:  mobile/assets/proclaw-logo.png  (400x400 RGBA)
- Output: mobile/assets/proclips-logo.png (1024x1024 RGBA, Expo icon recommended size)

策略：
1. 将原 logo 居中缩放到 1024x1024 画布（透明背景）
2. 在眼睛区域叠加彩色墨镜（左镜片青色渐变，右镜片品红渐变，金色镜框）
3. 输出 proclips-logo.png 作为 app icon

注：此脚本生成的是临时占位图标，建议使用豆包等 AI 工具生成更精美的图标后替换。
"""
import sys
from PIL import Image, ImageDraw, ImageFilter
import math
import os

SRC = r'd:\BigLionX\ProClaw\mobile\assets\proclaw-logo.png'
DST = r'd:\BigLionX\ProClaw\mobile\assets\proclips-logo.png'

CANVAS = 1024  # Expo 推荐 icon 尺寸
LOGO_SIZE = 900  # 原 logo 在画布上的尺寸（留些边距）
# 原 logo 中眼睛大致位置（基于像素分析：中心 200,200，眼睛区域 y≈160-220，左眼 x≈150-180，右眼 x≈220-250）
# 在 1024 画布中映射后的眼睛中心
LEFT_EYE = (370, 470)
RIGHT_EYE = (654, 470)
LENS_RX = 130  # 镜片水平半径
LENS_RY = 95   # 镜片垂直半径
FRAME_WIDTH = 18
BRIDGE_WIDTH = 22


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(min(len(c1), len(c2))))


def draw_sunglass_lens(draw, center, rx, ry, color_top, color_bottom):
    """绘制单个彩色镜片（垂直渐变 + 高光）。"""
    cx, cy = center
    # 创建临时图像绘制渐变镜片（用 mask 限制椭圆区域）
    lens_img = Image.new('RGBA', (rx * 2 + 4, ry * 2 + 4), (0, 0, 0, 0))
    lens_draw = ImageDraw.Draw(lens_img)
    bbox = [2, 2, 2 + rx * 2, 2 + ry * 2]
    # 垂直渐变填充
    steps = 60
    for i in range(steps):
        t = i / (steps - 1)
        color = lerp_color(color_top, color_bottom, t)
        y0 = bbox[1] + (ry * 2) * i / steps
        y1 = bbox[1] + (ry * 2) * (i + 1) / steps + 1
        # 用椭圆 mask 限制
        slice_img = Image.new('RGBA', lens_img.size, (0, 0, 0, 0))
        slice_draw = ImageDraw.Draw(slice_img)
        slice_draw.rectangle([bbox[0], y0, bbox[2], y1], fill=color + (220,))
        slice_mask = Image.new('L', lens_img.size, 0)
        slice_mask_draw = ImageDraw.Draw(slice_mask)
        slice_mask_draw.ellipse(bbox, fill=255)
        lens_img = Image.composite(slice_img, lens_img, slice_mask)
    # 镜片高光（左上角弧形）
    highlight = Image.new('RGBA', lens_img.size, (0, 0, 0, 0))
    hl_draw = ImageDraw.Draw(highlight)
    hl_draw.ellipse(
        [bbox[0] + 15, bbox[1] + 10, bbox[0] + rx * 1.2, bbox[1] + ry * 0.9],
        fill=(255, 255, 255, 90),
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(radius=8))
    lens_img = Image.alpha_composite(lens_img, highlight)
    # 镜框（粗描边）
    frame = Image.new('RGBA', lens_img.size, (0, 0, 0, 0))
    frame_draw = ImageDraw.Draw(frame)
    frame_draw.ellipse(bbox, outline=(45, 30, 80, 255), width=FRAME_WIDTH)
    # 内层金边（亮）
    frame_draw.ellipse(
        [bbox[0] + FRAME_WIDTH // 2, bbox[1] + FRAME_WIDTH // 2,
         bbox[2] - FRAME_WIDTH // 2, bbox[3] - FRAME_WIDTH // 2],
        outline=(255, 200, 80, 200), width=3,
    )
    lens_img = Image.alpha_composite(lens_img, frame)
    return lens_img, (cx - rx - 2, cy - ry - 2)


def main():
    if not os.path.exists(SRC):
        print(f'ERROR: source not found: {SRC}', file=sys.stderr)
        sys.exit(1)

    src = Image.open(SRC).convert('RGBA')
    print(f'Source: {src.size} mode={src.mode}')

    # 创建 1024x1024 透明画布
    canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))

    # 缩放原 logo 居中放置
    logo = src.resize((LOGO_SIZE, LOGO_SIZE), Image.LANCZOS)
    offset = ((CANVAS - LOGO_SIZE) // 2, (CANVAS - LOGO_SIZE) // 2)
    canvas.paste(logo, offset, logo)

    # 绘制墨镜图层
    glasses_layer = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))

    # 左镜片（青→蓝渐变）
    left_lens, left_pos = draw_sunglass_lens(
        ImageDraw.Draw(glasses_layer),
        LEFT_EYE, LENS_RX, LENS_RY,
        color_top=(0, 220, 255),    # 青色
        color_bottom=(50, 80, 220), # 蓝色
    )
    glasses_layer.paste(left_lens, left_pos, left_lens)

    # 右镜片（品红→紫渐变）
    right_lens, right_pos = draw_sunglass_lens(
        ImageDraw.Draw(glasses_layer),
        RIGHT_EYE, LENS_RX, LENS_RY,
        color_top=(255, 80, 200),    # 品红
        color_bottom=(150, 50, 220), # 紫色
    )
    glasses_layer.paste(right_lens, right_pos, right_lens)

    # 桥梁（连接两镜片）
    bridge = ImageDraw.Draw(glasses_layer)
    bridge_y = LEFT_EYE[1]
    bridge.rectangle(
        [LEFT_EYE[0] + LENS_RX - 5, bridge_y - BRIDGE_WIDTH // 2,
         RIGHT_EYE[0] - LENS_RX + 5, bridge_y + BRIDGE_WIDTH // 2],
        fill=(45, 30, 80, 255),
    )
    # 桥梁金边
    bridge.line(
        [(LEFT_EYE[0] + LENS_RX - 5, bridge_y - BRIDGE_WIDTH // 2),
         (RIGHT_EYE[0] - LENS_RX + 5, bridge_y - BRIDGE_WIDTH // 2)],
        fill=(255, 200, 80, 220), width=2,
    )
    bridge.line(
        [(LEFT_EYE[0] + LENS_RX - 5, bridge_y + BRIDGE_WIDTH // 2),
         (RIGHT_EYE[0] - LENS_RX + 5, bridge_y + BRIDGE_WIDTH // 2)],
        fill=(255, 200, 80, 220), width=2,
    )

    # 镜腿（向两侧延伸的短杆）
    arm_top = bridge_y - BRIDGE_WIDTH // 2
    arm_bot = bridge_y + BRIDGE_WIDTH // 2
    # 左镜腿
    bridge.rectangle(
        [LEFT_EYE[0] - LENS_RX - 80, arm_top,
         LEFT_EYE[0] - LENS_RX + 5, arm_bot],
        fill=(45, 30, 80, 255),
    )
    # 右镜腿
    bridge.rectangle(
        [RIGHT_EYE[0] + LENS_RX - 5, arm_top,
         RIGHT_EYE[0] + LENS_RX + 80, arm_bot],
        fill=(45, 30, 80, 255),
    )

    # 合成墨镜到画布
    canvas = Image.alpha_composite(canvas, glasses_layer)

    # 保存
    canvas.save(DST, 'PNG', optimize=True)
    print(f'Output: {DST}  size={canvas.size}')


if __name__ == '__main__':
    main()
