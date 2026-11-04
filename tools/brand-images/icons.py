import sys, os, math
from PIL import Image, ImageFilter, ImageDraw, ImageChops

og_dir, out = sys.argv[1], sys.argv[2]
sym = Image.open(os.path.join(og_dir, 'sym-s.png')).convert('RGBA')
alpha_full = sym.getchannel('A').crop(sym.getchannel('A').getbbox())

def chrome(w, h):
    """155deg gradient #FFF → #AECBFF → #5C8EFF → #FFF → #AECBFF → #FFF (brand palette only, like the 3D coin face)."""
    stops = [(0, (255, 255, 255)), (.28, (174, 203, 255)), (.47, (92, 142, 255)), (.60, (255, 255, 255)), (.82, (174, 203, 255)), (1, (255, 255, 255))]
    g = Image.new('RGB', (w, h)); px = g.load()
    a = math.radians(155); dx, dy = math.sin(a), -math.cos(a)
    L = abs(w * dx) + abs(h * dy)
    for y in range(h):
        for x in range(w):
            t = ((x - w / 2) * dx + (y - h / 2) * dy) / L + .5
            for k in range(len(stops) - 1):
                t0, c0 = stops[k]; t1, c1 = stops[k + 1]
                if t <= t1 or k == len(stops) - 2:
                    f = min(1, max(0, (t - t0) / (t1 - t0)))
                    px[x, y] = tuple(int(c0[i] + (c1[i] - c0[i]) * f) for i in range(3)); break
    return g

def place(canvas, width_frac, fill, glow=None):
    S = canvas.size[0]; w = int(S * width_frac); h = int(w * alpha_full.height / alpha_full.width)
    a = alpha_full.resize((w, h), Image.LANCZOS)
    x, y = (S - w) // 2, (S - h) // 2
    if glow:
        gl = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); m = Image.new('L', canvas.size, 0); m.paste(a, (x, y))
        gl.paste(Image.new('RGBA', canvas.size, glow + (255,)), (0, 0), m.filter(ImageFilter.GaussianBlur(S * .035)))
        canvas.alpha_composite(gl)
    layer = fill(w, h) if callable(fill) else Image.new('RGB', (w, h), fill)
    canvas.paste(layer, (x, y), a)
    return canvas

# App / home-screen icons: rendered glow background + chrome S
bg = Image.open(os.path.join(og_dir, 'icon-app.png')).convert('RGBA')
app = place(bg.copy(), .70, chrome, glow=(92, 142, 255))
app.convert('RGB').save(os.path.join(out, 'icon-512.png'), optimize=True)
app.resize((192, 192), Image.LANCZOS).convert('RGB').save(os.path.join(out, 'icon-192.png'), optimize=True)
app.resize((180, 180), Image.LANCZOS).convert('RGB').save(os.path.join(out, 'apple-touch-icon.png'), optimize=True)

# Favicons: white S on Royal Blue rounded square (readable at 16–32px)
def fav(size):
    big = 512
    c = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    ImageDraw.Draw(c).rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * .22), fill=(56, 66, 231, 255))
    place(c, .90, (255, 255, 255))
    return c.resize((size, size), Image.LANCZOS)
fav(32).save(os.path.join(out, 'favicon-32.png'), optimize=True)
f48 = fav(48)
f48.save(os.path.join(out, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
fav(256).save(os.path.join(og_dir, 'fav-preview.png'))

# Share image
Image.open(os.path.join(og_dir, 'og-raw.png')).convert('RGB').save(os.path.join(out, 'og-image.jpg'), quality=86, optimize=True, progressive=True)
print('ok')
