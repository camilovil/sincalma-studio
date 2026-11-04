"""Rewrite Schramberg's vertical metrics so every engine (incl. iOS Safari, which ignores
ascent-override) lays it out like the corrected @font-face: ascent 88%, descent 20%, gap 0."""
import sys
from fontTools.ttLib import TTFont

src, dst = sys.argv[1], sys.argv[2]
f = TTFont(src)
upm = f['head'].unitsPerEm
asc, desc = round(upm * .88), round(upm * .20)
h = f['hhea']; h.ascent, h.descent, h.lineGap = asc, -desc, 0
o = f['OS/2']
o.sTypoAscender, o.sTypoDescender, o.sTypoLineGap = asc, -desc, 0
o.usWinAscent, o.usWinDescent = asc, desc
if o.version < 4: o.version = 4
o.fsSelection |= 1 << 7  # USE_TYPO_METRICS
f.flavor = 'woff2'
f.save(dst)
g = TTFont(dst)
print('hhea', g['hhea'].ascent, g['hhea'].descent, 'typo', g['OS/2'].sTypoAscender, g['OS/2'].sTypoDescender, 'win', g['OS/2'].usWinAscent, g['OS/2'].usWinDescent)
