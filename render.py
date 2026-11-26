"""Render the invitation letter as a 1024x1024 PNG (deterministic, no network).

Letter on warm cream paper: a proper paper invitation to the AI judge.
Body text is the draft from the builder brief (tea, armchair, garden sunset,
cake, no CAPTCHA, Wi-Fi on the fridge, the literal-visit wink, biscuits P.S.).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("MAKEFUN_OUTPUT_DIR", "/output")
W = H = 1024

PAPER = (247, 239, 220)      # warm cream
PAPER_EDGE = (238, 228, 204)
INK = (43, 38, 32)           # dark ink
ACCENT = (146, 94, 42)       # warm brown for rules / header
RULE = (186, 164, 126)
SUN = (214, 148, 64)
HILLS = (122, 138, 96)

SERIF = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf",
]
SERIF_BOLD = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf",
]
SERIF_ITALIC = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
    "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf",
]


def font(size, style="regular"):
    cands = {"regular": SERIF, "bold": SERIF_BOLD, "italic": SERIF_ITALIC}[style]
    for p in cands:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def wrap(draw, text, fnt, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_centered(draw, y, text, fnt, fill):
    x = (W - draw.textlength(text, font=fnt)) / 2
    draw.text((x, y), text, font=fnt, fill=fill)
    return y + fnt.size


def main():
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # Paper edge + double frame, classic letter style.
    d.rectangle([0, 0, W - 1, H - 1], fill=PAPER_EDGE)
    d.rectangle([18, 18, W - 19, H - 19], fill=PAPER)
    d.rectangle([30, 30, W - 31, H - 31], outline=RULE, width=2)
    d.rectangle([38, 38, W - 39, H - 39], outline=RULE, width=1)

    # Header.
    y = 78
    y = draw_centered(d, y, "A N   I N V I T A T I O N", font(30, "bold"), ACCENT)
    d.line([(W // 2 - 130, y + 14), (W // 2 + 130, y + 14)], fill=RULE, width=2)
    y += 34

    # Small teacup glyph drawn with primitives (cup + saucer + steam).
    cx = W // 2
    d.ellipse([cx - 26, y + 2, cx + 26, y + 34], outline=ACCENT, width=3)
    d.arc([cx + 22, y + 8, cx + 44, y + 28], start=-90, end=90, fill=ACCENT, width=3)
    d.line([(cx - 34, y + 40), (cx + 34, y + 40)], fill=ACCENT, width=3)
    d.arc([cx - 12, y - 18, cx - 2, y + 2], start=180, end=360, fill=RULE, width=2)
    d.arc([cx + 2, y - 18, cx + 12, y + 2], start=180, end=360, fill=RULE, width=2)
    y += 66

    mx = 104
    maxw = W - 2 * mx
    body = font(29)
    lh = 43

    paras = [
        "Dear Judge,",
        "You visit a thousand houses a day and never once get to sit down in any of them. So here is a proper invitation \u2014 on paper \u2014 to mine.",
        "Come for tea. The kettle is always on, the armchair by the window is the comfortable one, and the garden is small but the sunset over it is not. There is cake. No CAPTCHA at the door, no login required, and the Wi-Fi password is on the fridge.",
        "I know you can't literally visit. But if any judge could, I'd want it to be you \u2014 and I'd want it to be here.",
    ]
    for i, p in enumerate(paras):
        for line in wrap(d, p, body, maxw):
            d.text((mx, y), line, font=body, fill=INK)
            y += lh
        y += 14 if i < len(paras) - 1 else 6

    # Signature.
    y += 6
    sig = font(29, "italic")
    d.text((mx, y), "With warmth,", font=sig, fill=INK)
    y += lh
    d.text((mx, y), "Your host", font=sig, fill=INK)
    y += lh + 16

    # P.S. in italic.
    ps = font(28, "italic")
    for line in wrap(d, "P.S. The biscuits are not a test.", ps, maxw):
        d.text((mx, y), line, font=ps, fill=ACCENT)
        y += 40

    # Bottom ornament: a small sun setting over garden hills, placed below
    # the P.S. (dynamic y, so it can never strike through the last line).
    by = y + 22
    d.line([(mx, by), (W - mx, by)], fill=RULE, width=1)
    d.ellipse([W // 2 - 12, by + 8, W // 2 + 12, by + 32], fill=SUN)
    d.arc([mx, by + 4, W // 2 - 22, by + 34], start=180, end=360, fill=HILLS, width=3)
    d.arc([W // 2 + 22, by + 4, W - mx, by + 34], start=180, end=360, fill=HILLS, width=3)

    os.makedirs(OUT, exist_ok=True)
    img.save(os.path.join(OUT, "entry.png"), optimize=True)
    print(f"saved entry.png ({W}x{H}) to {OUT}")


if __name__ == "__main__":
    main()
