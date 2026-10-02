"""GRAF approved portrait cards: deterministic typography, no generated architecture."""
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pathlib import Path
import json, argparse

W,H=1080,1920
INK='#24313b'; PAPER='#fafaf8'; TEAL='#075f66'
FONTS=Path('/usr/share/fonts/truetype/dejavu')
def font(size,bold=False):
    return ImageFont.truetype(str(FONTS/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)
def fit(draw,text,size,width,bold=False):
    while draw.textbbox((0,0),text,font=font(size,bold))[2]>width: size-=1
    return font(size,bold)
def render(item,out):
    style=item['style']; dark=style=='S06'
    im=Image.new('RGB',(W,H),INK if dark else PAPER)
    if item.get('imagePath'):
        if not item.get('imageVerified') or not item.get('imageSource'): raise ValueError('Verified exact-project image provenance required')
        bg=ImageOps.fit(Image.open(item['imagePath']).convert('RGB'),(W,H))
        if style!='S06': bg=ImageOps.grayscale(bg).convert('RGB')
        im=bg
        if dark: im=Image.blend(im,Image.new('RGB',(W,H),INK),.55)
    d=ImageDraw.Draw(im); fg=PAPER if dark else INK
    if style=='S07':
        if not item.get('imagePath'): d.rectangle((0,0,W,H),fill='#e2e5e6')
        d.rectangle((50,165,720,239),fill=PAPER)
        d.text((70,183),'GRAF / LAUNCH RADAR',font=font(30,True),fill=INK)
        panel=1020 if item.get('imagePath') else 420
        d.rectangle((50,panel,1030,panel+630),fill=PAPER)
        ty=panel+50; fg=INK
    elif style=='S08':
        d.text((70,185),'GRAF / LAUNCH RADAR',font=font(30,True),fill=INK)
        d.rectangle((50,350,1030,800),fill=INK)
        ty=405; fg=PAPER
    else:
        d.text((70,185),'GRAF / LAUNCH RADAR',font=font(30,True),fill=fg)
        ty=435
    for line in item['titleLines']:
        f=fit(d,line,145,940,True); d.text((70,ty),line,font=f,fill=fg);ty+=165
    if style=='S07':
        d.text((70,ty+15),item['location'],font=fit(d,item['location'],43,920),fill=INK)
        d.text((70,ty+100),item['category'],font=fit(d,item['category'],34,920),fill=INK)
        d.text((70,ty+180),item['developer'],font=fit(d,item['developer'],34,920),fill=INK)
        d.text((70,1720),item['status'],font=fit(d,item['status'],30,920,True),fill=INK)
        d.text((70,1780),'graf.ae',font=font(30),fill=INK)
    elif style=='S08':
        d.text((70,900),item['location'],font=fit(d,item['location'],46,940),fill=INK)
        d.text((70,980),item['category'],font=fit(d,item['category'],37,940),fill=INK)
        d.rectangle((50,1310,1030,1540),fill=INK)
        d.text((75,1347),item['status'],font=fit(d,item['status'],32,915,True),fill=PAPER)
        d.text((75,1430),item['timing'],font=fit(d,item['timing'],33,915),fill=PAPER)
        d.text((70,1650),item['developer'],font=fit(d,item['developer'],34,940),fill=INK)
        d.text((70,1770),'graf.ae',font=font(30),fill=INK)
    else:
        d.text((70,ty+45),item['location'],font=fit(d,item['location'],46,940),fill=PAPER)
        d.text((70,ty+130),item['category'],font=fit(d,item['category'],36,940),fill=PAPER)
        d.text((70,1300),item['status'],font=fit(d,item['status'],32,940,True),fill=PAPER)
        d.text((70,1370),item['timing'],font=fit(d,item['timing'],34,940),fill=PAPER)
        d.rectangle((50,1550,1030,1690),fill=PAPER)
        d.text((75,1595),item['developer'],font=fit(d,item['developer'],34,915),fill=INK)
        d.text((70,1770),'graf.ae',font=font(30),fill=PAPER)
    im.save(out,quality=96,subsampling=0)

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('input');a.add_argument('output');args=a.parse_args()
    p=Path(args.output);p.mkdir(parents=True,exist_ok=True)
    for item in json.loads(Path(args.input).read_text()): render(item,p/(item['id']+'-status.jpg'))
