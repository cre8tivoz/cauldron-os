from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math, random

OUT = Path('/Users/habibi/hermes/witch-daddy-labs/cauldron-os/assets/screenshots/rude-boy-build-sim')
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1440, 1000
BG = '#050606'
SURFACE = '#111314'
SURFACE2 = '#191c1d'
BORDER = '#343838'
BORDER_STRONG = '#d7ff3f'
CREAM = '#f7f8f2'
CREAM_MUTED = '#d9ded2'
ORANGE = '#d7ff3f'      # legacy variable name; actual Rude Boy acid lime
AMBER = '#d7ff3f'       # legacy variable name; actual Rude Boy acid lime
AMBER_MUTED = '#8ea82d'
MUTED = '#8f9792'
BLACK = '#030404'

FONT_CANDIDATES = [
    '/System/Library/Fonts/Supplemental/Arial Black.ttf',
    '/System/Library/Fonts/Supplemental/Impact.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]
MONO_CANDIDATES = [
    '/System/Library/Fonts/Menlo.ttc',
    '/System/Library/Fonts/Supplemental/Courier New Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]
REG_CANDIDATES = [
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]

def first_font(paths, size):
    for p in paths:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def font(size): return first_font(FONT_CANDIDATES, size)
def mono(size): return first_font(MONO_CANDIDATES, size)
def regular(size): return first_font(REG_CANDIDATES, size)

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0,2,4))

def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))

def background():
    img = Image.new('RGB', (W,H), BG)
    px = img.load()
    c1, c2 = hex_to_rgb('#111314'), hex_to_rgb('#050606')
    glow = hex_to_rgb('#46580a')
    for y in range(H):
        t = y/H
        base = lerp(c1,c2,t)
        for x in range(W):
            dx, dy = x-W*0.82, y-H*0.13
            dist = math.sqrt(dx*dx+dy*dy)/(W*0.55)
            g = max(0, 1-dist) * 0.22
            col = tuple(min(255, int(base[i]*(1-g)+glow[i]*g)) for i in range(3))
            px[x,y]=col
    d = ImageDraw.Draw(img, 'RGBA')
    for x in range(-W, W*2, 70):
        d.line([(x,0),(x+W//2,H)], fill=(215,255,63,16), width=1)
    for y in range(70,H,80):
        d.line([(0,y),(W,y-180)], fill=(247,248,242,10), width=1)
    random.seed(7)
    for _ in range(18000):
        x=random.randrange(W); y=random.randrange(H)
        v=random.randrange(5,22)
        r,g,b=px[x,y]
        px[x,y]=(min(255,r+v), min(255,g+v), min(255,b+v))
    return img

def rect(d, box, fill=SURFACE, outline=BORDER, width=1):
    d.rectangle(box, fill=fill, outline=outline, width=width)

def label(d, xy, text, fill=AMBER, size=18):
    d.text(xy, text.upper(), fill=fill, font=mono(size), spacing=6)

def big(d, xy, text, size=104, fill=CREAM, spacing=-6):
    d.multiline_text(xy, text.upper(), fill=fill, font=font(size), spacing=spacing)

def small(d, xy, text, fill=CREAM_MUTED, size=24, spacing=8):
    d.multiline_text(xy, text, fill=fill, font=regular(size), spacing=spacing)

def header(d, title, subtitle='RUDE BOY COFFEE CO / BUILD SIMULATION'):
    rect(d, (42,32,W-42,92), fill='#101113', outline=BORDER_STRONG)
    label(d, (68,52), subtitle, AMBER, 16)
    d.text((W-420,52), title.upper(), fill=CREAM, font=mono(17))
    d.ellipse((W-76,55,W-58,73), fill=ORANGE)

def nav_phone(d, x, y, active):
    labels = ['HOME','REWARDS','ORDER','PROFILE']
    w=1020; h=74
    rect(d, (x,y,x+w,y+h), fill='#101112', outline=BORDER)
    step=w//len(labels)
    for i,l in enumerate(labels):
        bx=x+i*step
        if l == active:
            d.rectangle((bx+8,y+10,bx+step-8,y+h-10), fill='#18200a', outline=ORANGE)
            col=AMBER
        else:
            col=MUTED
        d.text((bx+45,y+26), l, fill=col, font=mono(18))

def progress(d, box, pct):
    x1,y1,x2,y2=box
    d.rectangle(box, fill='#090a0b', outline=BORDER)
    fill_w=int((x2-x1)*pct)
    for x in range(x1, x1+fill_w):
        t=(x-x1)/max(1, fill_w)
        col=lerp(hex_to_rgb(ORANGE), hex_to_rgb(AMBER), t)
        d.line([(x,y1),(x,y2)], fill=col)

def reward_card(d, box, title, meta, active=False):
    fill = '#172008' if active else SURFACE2
    outline = AMBER_MUTED if active else BORDER
    rect(d, box, fill=fill, outline=outline, width=2 if active else 1)
    x1,y1,x2,y2=box
    d.text((x1+26,y1+26), title.upper(), fill=CREAM, font=font(30))
    d.text((x1+28,y2-48), meta.upper(), fill=AMBER, font=mono(17))
    if active:
        d.rectangle((x1+20,y1+18,x1+26,y2-18), fill=ORANGE)

def screen_home():
    img=background(); d=ImageDraw.Draw(img, 'RGBA')
    header(d, 'SCREEN 01 / LOYALTY HOME')
    rect(d, (92,135,1348,860), fill='#101112', outline=BORDER_STRONG, width=2)
    label(d, (132,178), 'Rewards prototype / Rude Boy Coffee Co.', AMBER, 18)
    big(d, (130,218), 'Earn\nRude\nLittle\nPerks.', 92, CREAM, -8)
    big(d, (610,226), 'Coffee\nLoyalty.\nNo Beige.\nNo Boredom.', 36, ORANGE, 4)
    rect(d, (1030,178,1288,575), fill=SURFACE, outline=BORDER_STRONG)
    label(d, (1060,212), 'Current\nBalance', AMBER, 17)
    d.text((1056,278), '740', fill=CREAM, font=font(104))
    progress(d, (1062,410,1258,436), .74)
    small(d, (1060,462), '260 points\nuntil the next\nfree bag of beans.', CREAM_MUTED, 24, 5)
    reward_card(d, (132,650,484,800), 'Free Flat White', '1000 points', True)
    reward_card(d, (516,650,868,800), 'House Beans', 'VIP tier')
    reward_card(d, (900,650,1252,800), 'Drop Access', '1200 points')
    nav_phone(d, 210, 884, 'HOME')
    return img

def screen_rewards():
    img=background(); d=ImageDraw.Draw(img, 'RGBA')
    header(d, 'SCREEN 02 / REWARD WALLET')
    rect(d, (92,132,1348,855), fill='#101112', outline=BORDER_STRONG, width=2)
    label(d, (132,172), 'Wallet / live points / member perks', AMBER, 18)
    big(d, (130,220), '740\nPOINTS', 96, CREAM, -8)
    progress(d, (132,440,650,470), .74)
    d.text((132,500), 'NEXT UNLOCK: FREE BAG OF BEANS', fill=ORANGE, font=font(34))
    cards=[('FREE FLAT WHITE','Ready at 1000 pts','260 pts away',False),('RUDE BOY BEANS','VIP tier / monthly bag','Locked',False),('DOUBLE STAMP HOUR','Today 2–3pm','Active',True),('SECRET DROP ACCESS','Members-only roast','1200 pts',False)]
    x0=720; y0=172
    for i,(t,m,s,a) in enumerate(cards):
        y=y0+i*150
        reward_card(d,(x0,y,x0+520,y+118),t,m,a)
        d.text((x0+360,y+72), s.upper(), fill=ORANGE if a else MUTED, font=mono(16))
    nav_phone(d, 210, 884, 'REWARDS')
    return img

def screen_order():
    img=background(); d=ImageDraw.Draw(img, 'RGBA')
    header(d, 'SCREEN 03 / ORDER + STAMPS')
    rect(d, (92,132,1348,855), fill='#101112', outline=BORDER_STRONG, width=2)
    label(d,(132,172),'Quick order / stamp boost',AMBER,18)
    big(d,(130,220),'Order\nLike You\nMean It.',90,CREAM,-8)
    items=[('Flat White','4.80','double stamp eligible'),('Long Black','4.20','house roast'),('Batch Brew','5.00','filter / rotating'),('Ham + Cheese Croissant','8.50','dangerously reliable')]
    for i,(name,price,meta) in enumerate(items):
        y=188+i*122
        rect(d,(720,y,1265,y+88), fill=SURFACE2 if i else '#172008', outline=AMBER_MUTED if i==0 else BORDER)
        d.text((746,y+18), name.upper(), fill=CREAM, font=font(32))
        d.text((746,y+58), meta.upper(), fill=AMBER if i==0 else MUTED, font=mono(15))
        d.text((1168,y+25), '$'+price, fill=ORANGE if i==0 else CREAM_MUTED, font=mono(22))
    rect(d,(132,642,600,785), fill='#111314', outline=ORANGE, width=2)
    d.text((160,670),'TODAY\'S MOVE', fill=AMBER, font=mono(16))
    d.text((160,706),'Flat white + croissant\ngets you 2x stamps.', fill=CREAM, font=font(30), spacing=7)
    nav_phone(d,210,884,'ORDER')
    return img

def screen_profile():
    img=background(); d=ImageDraw.Draw(img, 'RGBA')
    header(d, 'SCREEN 04 / MEMBER PROFILE')
    rect(d, (92,132,1348,855), fill='#101112', outline=BORDER_STRONG, width=2)
    label(d,(132,172),'Member profile / taste graph',AMBER,18)
    d.ellipse((132,225,292,385), fill='#18200a', outline=ORANGE, width=4)
    d.text((172,270),'RB', fill=CREAM, font=font(54))
    big(d,(330,224),'Billy\nNo Beige\nCards.',72,CREAM,-6)
    rect(d,(132,470,594,742),fill=SURFACE2,outline=BORDER)
    label(d,(160,500),'Favourite order',AMBER,16)
    d.text((160,545),'FLAT WHITE', fill=CREAM, font=font(48))
    d.text((160,610),'Oat milk / extra shot\nUsually before bad ideas become apps.', fill=CREAM_MUTED, font=regular(24), spacing=8)
    rect(d,(680,210,1258,742),fill=SURFACE,outline=BORDER)
    label(d,(710,242),'Taste graph',AMBER,16)
    stats=[('BITTERNESS',.82),('CHAOS',.66),('LOYALTY',.74),('BEIGE TOLERANCE',.05)]
    for i,(name,p) in enumerate(stats):
        y=310+i*92
        d.text((710,y),name,fill=CREAM,font=mono(18))
        progress(d,(940,y,1210,y+22),p)
    d.text((710,688),'STATUS: PROPERLY CAFFEINATED', fill=ORANGE, font=font(28))
    nav_phone(d,210,884,'PROFILE')
    return img

screens = [
    ('01-loyalty-home.png', screen_home()),
    ('02-rewards-wallet.png', screen_rewards()),
    ('03-order-stamps.png', screen_order()),
    ('04-member-profile.png', screen_profile()),
]
for name, img in screens:
    path=OUT/name
    img.save(path)
    print(path)
