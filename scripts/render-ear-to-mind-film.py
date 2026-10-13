"""Ear to Mind: shot-directed 14s launch film.
Reference study: Burnwe compilation, Marvin / 10Web / Trumpet segments.
Revision: use the approved tagline for the two title beats; background music only, no interaction sound effects.
Actual current prototype captures with original motion, typography and audio.
UI panel proportions and button typography are preserved from the browser.
"""
from pathlib import Path
from functools import lru_cache
import math, sys, wave, subprocess, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'qa/ear-to-mind-film';OUT.mkdir(parents=True,exist_ok=True)
CAPTURES=ROOT/'scripts/film-captures'
FF='ffmpeg'
W,H,FPS,LENGTH=1920,1080,60,14
INK=(24,24,24); GRAY=(118,118,116); WHITE=(250,250,247)
@lru_cache(None)
def font(s,b=False):return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial'+(' Bold' if b else '')+'.ttf',round(s))
def clamp(x):return max(0,min(1,x))
def ease(x):return 1-(1-clamp(x))**4
def smooth(x):x=clamp(x);return x*x*(3-2*x)
def spring(x):
 x=clamp(x)
 return 1 if x==1 else 1-math.exp(-7*x)*math.cos(8.5*x)
def lerp(a,b,t):return a+(b-a)*t
def text(im,txt,x,y,s=40,col=INK,b=False,anchor='lt',gap=1.13):
 d=ImageDraw.Draw(im)
 for j,line in enumerate(txt.split('\n')):d.text((round(x),round(y+j*s*gap)),line,font=font(s,b),fill=col,anchor=anchor)
def box_text(im,txt,bounds,s,col=INK,align='center'):
 # Center the actual glyph bounds, not the nominal font size. Ascenders and
 # descenders otherwise move every button label above its visual center.
 d=ImageDraw.Draw(im);face=font(s);left,top,right,bottom=d.textbbox((0,0),txt,font=face)
 x1,y1,x2,y2=bounds
 x=x1-left if align=='left' else x2-right if align=='right' else (x1+x2-left-right)/2
 y=(y1+y2-top-bottom)/2
 d.text((round(x),round(y)),txt,font=face,fill=col)
def pill(im,txt,x,y,w,h=42,dark=False,s=23):
 d=ImageDraw.Draw(im);d.rounded_rectangle((x,y,x+w,y+h),radius=9,fill=INK if dark else (245,245,242),outline=(215,215,211),width=1)
 box_text(im,txt,(x,y,x+w,y+h),s,WHITE if dark else GRAY)
def card(w,h,color=WHITE,rad=24):
 im=Image.new('RGBA',(w,h));ImageDraw.Draw(im).rounded_rectangle((1,1,w-2,h-2),radius=rad,fill=color,outline=(215,215,211),width=2);return im
def density(key):
 return 3 if key.startswith(('support-', 'statement')) else 1

@lru_cache(maxsize=96)
def shadowed(key):
 a=asset(key);d=density(key);margin=65*d
 sh=Image.new('RGBA',(a.width+margin*2,a.height+margin*2));mask=Image.new('L',sh.size)
 mask.paste(a.getchannel('A'),(margin,margin+18*d));mask=mask.filter(ImageFilter.GaussianBlur(23*d)).point(lambda p:round(p*.18))
 sh.paste((0,0,0,255),(0,0,sh.width,sh.height),mask);sh.alpha_composite(a,(margin,margin));return sh
def put(im,key,cx,cy,scale=1,alpha=1,blur=0,shadow=True):
 if alpha<=0 or scale<=0:return
 a=shadowed(key) if shadow else asset(key)
 scale/=density(key)
 nw,nh=max(1,round(a.width*scale)),max(1,round(a.height*scale))
 # Skip assets that are wholly out of frame.
 if cx+nw/2<0 or cx-nw/2>W or cy+nh/2<0 or cy-nh/2>H:return
 a=a.resize((nw,nh),Image.Resampling.LANCZOS)
 if blur>.1:a=a.filter(ImageFilter.GaussianBlur(blur))
 if alpha<1:a.putalpha(a.getchannel('A').point(lambda p:round(p*alpha)))
 im.alpha_composite(a,(round(cx-nw/2),round(cy-nh/2)))
def overlay_text(im,txt,x,y,s,col=INK,alpha=1,b=False,anchor='lt'):
 if alpha<=0:return
 l=Image.new('RGBA',(W,H));text(l,txt,x,y,s,(*col,round(255*clamp(alpha))),b,anchor);im.alpha_composite(l)
@lru_cache(None)
def brand_symbol():
 return Image.open(ROOT/'assets/case-studies/mental-model/brand/ear-to-mind-symbol.png').convert('RGBA')
def logo(im,cx,cy,size=1,color=INK,word=True):
 # Match the website's accessible light silhouette without changing the source PNG.
 mark=Image.new('RGBA',brand_symbol().size,(*color,255));mark.putalpha(brand_symbol().getchannel('A'))
 mark=mark.resize((round(62*size),round(42*size)),Image.Resampling.LANCZOS)
 im.alpha_composite(mark,(round(cx),round(cy)))
 if word:text(im,'Ear to Mind',cx+74*size,cy+8*size,30*size,color)

@lru_cache(None)
def bg(dark=False):
 yy,xx=np.mgrid[0:H,0:W]
 dist=((xx-W*.55)/(W*.75))**2+((yy-H*.4)/(H*.95))**2
 rng=np.random.default_rng(8);grain=rng.normal(0,.38,(H,W))
 level=(17+18*np.exp(-dist*2.7) if dark else 242+12*np.exp(-dist*2))+grain
 data=np.repeat(np.clip(level,0,255).astype('uint8')[:,:,None],3,axis=2)
 return Image.fromarray(data).convert('RGBA')

@lru_cache(None)
def high_density_capture(name):
 im=Image.open(CAPTURES/'3x'/f'{name}.png').convert('RGBA')
 # Match the captured components' real rounded surfaces. The browser's
 # surrounding page matte is not part of a card and must not become a rim.
 mask=Image.new('L',im.size);d=ImageDraw.Draw(mask)
 if name.startswith('statement-'):
  d.rounded_rectangle((30,30,im.width-31,im.height-31),radius=21,fill=255)
 else:
  d.rounded_rectangle((0,0,im.width-1,im.height-1),radius=30,fill=255)
 im.putalpha(mask)
 return im

@lru_cache(maxsize=100)
def asset(key):
 # Interface footage comes from complete live prototype components. Never
 # reconstruct control labels or stretch the capture to a different aspect.
 if key.startswith('quote'):
  return Image.open(CAPTURES/f'quote-{key[-1]}.png').convert('RGBA')
 if key.startswith('statement'):
  return high_density_capture(f'statement-{key[-1]}')
 if key.startswith('editor-'):
  return Image.open(CAPTURES/f'{key}.png').convert('RGBA')
 if key.startswith('support-'):
  return high_density_capture(key)
 if key in ('map','coach'):
  return Image.open(CAPTURES/f'{key}.png').convert('RGBA')
 if key=='brand-lockup':
  return Image.open(ROOT/'assets/case-studies/mental-model/brand/ear-to-mind-lockup.png').convert('RGBA').crop((190,300,1064,950))
 if key in ('cta-dark','cta'):
  dark=key=='cta-dark';im=card(428,96,INK if dark else WHITE,48)
  box_text(im,'Try the assistant',(0,0,428,96),35,WHITE if dark else INK)
  return im
 raise KeyError(key)

def typed_capture(prefix,t,start,duration,steps):
 progress=clamp((t-start)/duration)
 return f'{prefix}-{steps[min(len(steps)-1,int(progress*len(steps)))]}'

def type_on(im,s,x,y,size,t,start,speed=30,col=INK,scale=1):
 n=min(len(s),max(0,int((t-start)*speed)));text(im,s[:n],x,y,size,col)
 if start<t<start+len(s)/speed+.2:
  xx=x+font(size).getlength(s[:n]);ImageDraw.Draw(im).line((xx+4,y-5,xx+4,y+size+9),fill=col,width=max(2,round(scale*2)))

def scene_open(t):
 im=bg(True).copy()
 # Moving foreground and background planes create depth around the words.
 for j,(x,y,sc) in enumerate([(-210,70,.70),(1850,905,.7),(1380,-130,.56),(-230,1010,.5)]):
  put(im,'quote'+str(j%3),x+W/2-960+(t-.6)*(160 if j%2 else -190),y,sc*1.8,.15,blur=5,shadow=False)
 v=ease(t/.43)
 overlay_text(im,'Go beyond',W/2,350+110*(1-v),144,WHITE,v,anchor='mt')
 v2=ease((t-.16)/.43)
 overlay_text(im,'what they say.',W/2,515+110*(1-v2),144,WHITE,v2,anchor='mt')
 # The quote itself becomes the transition, filling the lens.
 q=ease((t-1.04)/.38)
 if q>0:put(im,'quote0',W/2,lerp(1520,540,q),lerp(1.6,2.05,q))
 return im

def scene_quote(t):
 u=t-1.4;im=bg().copy()
 for j,(x,y,sc) in enumerate([(250,180,1.55),(1630,965,1.65),(1590,120,1.3)]):
  put(im,'quote'+str((j+1)%3),x+W/2-960-90*u,y+35*u,sc,.35,blur=2.4)
 # Show the whole quote card, including its actual actions and line wrapping.
 put(im,'quote0',W/2-25*u,540+12*u,2.05+.07*smooth(u/1.6))
 return im

def scene_editor(t):
 u=t-3;im=bg().copy()
 show=ease((u-1.0)/.6)
 z=lerp(2.18,2.08,ease(u/1.9)) if W>2200 else lerp(1.98,1.90,ease(u/1.9))
 cx=W/2-180*show
 key=typed_capture('editor',t,3.18,1.10,[0,5,10,16,22,28,34,'full'])
 # The original words were shown in the preceding shot. Now focus on the
 # complete editor alone so that its native controls remain legible.
 put(im,key,cx,535,z)
 if show>0:
  put(im,'coach',W/2+lerp(1200,850 if W>2200 else 675,show),535,1.12 if W>2200 else 1.02,show)
 return im

def scene_board(t):
 u=t-4.9;im=bg(True).copy()
 # A restrained pullback keeps the complete towers and opportunity fields
 # in view, rather than zooming into or cropping their fixed-height panels.
 z=lerp(1.20,1.12,smooth(u/2.3))
 put(im,'map',W/2,540,z)
 return im

def scene_support(t):
 u=t-7.2;im=bg().copy()
 for j,(dx,y,sc) in enumerate([(-650,400,1.7),(680,360,1.65),(700,840,1.35)]):
  put(im,'statement'+str(j),W/2+dx-u*15,y,sc,.85)
 a=ease(u/.45);z=lerp(1.9,2.45,a)
 key=typed_capture('support',t,7.43,1.15,[0,7,14,22,30,38,'full'])
 # 3x DOM-rendered captures retain the real controls plus 20px of surrounding
 # surface. Downsample once at composition time; never enlarge a 1x crop.
 put(im,key,W/2,lerp(650,530,a),z)
 return im

def scene_resolution(t):
 u=t-9.15
 if u<.62:
  im=bg().copy()
  # Cards leave quickly in opposing planes; the message takes their place.
  for j in range(3):put(im,'statement'+str(j),W/2+[-1200,0,1190][j]+(u*1300*(j-1)),[-60,1180,180][j],1.2,.16,blur=3)
  a=ease(u/.24);overlay_text(im,'Ask deeper.',W/2,449+90*(1-a),166,INK,a,anchor='mt')
 else:
  im=bg(True).copy();a=ease((u-.62)/.25)
  overlay_text(im,'Write it yourself.',W/2,460+80*(1-a),125,WHITE,a,anchor='mt')
 return im

def scene_end(t):
 u=t-10.75;im=Image.new('RGBA',(W,H),(254,254,254,255))
 # A quiet light end frame blends naturally with the supplied full logo's background.
 a=ease(u/.6)
 put(im,'brand-lockup',W/2,440+24*(1-a),.92+.03*a,a,shadow=False)
 overlay_text(im,'From what people say to how they think.',W/2,804,35,GRAY,ease((u-.55)/.4),anchor='mt')
 p=ease((u-.9)/.38);put(im,'cta-dark',W/2,936+20*(1-p),1,p,shadow=False)
 return im

CUTS=[(0,scene_open),(1.4,scene_quote),(3,scene_editor),(4.9,scene_board),(7.2,scene_support),(9.15,scene_resolution),(10.75,scene_end)]
def frame(t):
 idx=max(i for i,(s,_) in enumerate(CUTS) if t>=s)
 im=CUTS[idx][1](t)
 # Short motion match blends at UI cuts, while type cuts land sharply on beats.
 if idx in [2,3,4] and t-CUTS[idx][0]<.14:
  old=CUTS[idx-1][1](CUTS[idx][0]-.002)
  im=Image.blend(old,im,smooth((t-CUTS[idx][0])/.14))
 return im.convert('RGB')

def soundtrack():
 sr=48000;n=14*sr;buf=np.zeros((n,2));rng=np.random.default_rng(612)
 def add(v,t,amp,pan=0):
  off=int(t*sr)
  if off>=n:return
  count=min(len(v),n-off);g=np.sqrt([(1-pan)/2,(1+pan)/2]);buf[off:off+count]+=amp*v[:count,None]*g
 def hz(m):return 440*2**((m-69)/12)
 def note(m,d=1.0):
  tt=np.arange(int(sr*d))/sr;f=hz(m)
  env=(1-np.exp(-tt/.006))*np.exp(-tt/.26)*np.minimum(1,(d-tt)/.04)
  return (np.sin(2*np.pi*f*tt)+.22*np.sin(2*np.pi*2*f*tt)+.04*np.sin(2*np.pi*3*f*tt))*env
 chords=[[62,66,69,73],[59,62,66,69],[55,59,62,66],[57,62,64,69],[62,66,69,73]]
 for b in range(6):
  at=.08+b*2;ch=chords[min(b,4)]
  for j,m in enumerate(ch):add(note(m,1.7),at+j*.012,.066,(-.3+j*.2))
  for bt,j in [(1,2),(1.75,1),(2.5,3),(3.25,2)]:add(note(ch[j]+12,.65),at+bt*.5,.027,(-.4 if j%2 else .4))
  for beat in range(4):
   tt=np.arange(int(sr*.2))/sr;v=np.sin(2*np.pi*(47*tt+2.5*(1-np.exp(-tt*32))))*np.exp(-tt*24)*(1-np.exp(-tt*700));add(v,at+beat*.5,.094)
   if beat%2:
    tt=np.arange(int(sr*.055))/sr;v=rng.normal(0,1,len(tt));v=np.r_[0,np.diff(v)];add(v*np.exp(-tt*70),at+beat*.5,.013,.15)
   tt=np.arange(int(sr*.05))/sr;v=rng.normal(0,1,len(tt));add(np.r_[0,np.diff(v)]*np.exp(-tt*110),at+beat*.5+.25,.004,-.25)
  tt=np.arange(int(sr*.7))/sr;v=np.sin(2*np.pi*hz(ch[0]-24)*tt)*(1-np.exp(-tt/.014))*np.exp(-tt/.22);add(v,at,.11);add(v,at+1.5,.072)
 # Background music only: no card-entry sweeps, interaction taps, or closing stinger.
 dry=buf.copy()
 for sec,g in [(.09,.12),(.17,.07),(.29,.03)]:
  shift=int(sr*sec);buf[shift:]+=dry[:-shift,::-1]*g
 tail=np.clip((np.arange(n)/sr-11.55)/(14-11.55),0,1)
 buf*=np.minimum(1,np.arange(n)/(sr*.03))[:,None]*(np.cos(tail*np.pi/2)**2)[:,None]
 gain=min(.100/np.sqrt(np.mean(buf**2)),.75/np.max(np.abs(buf)));buf*=gain
 with wave.open(str(OUT/'Music only.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((buf*32767).astype('<i2').tobytes())
 print('Audio peak',round(20*np.log10(np.max(np.abs(buf))),2),'dBFS',flush=True)

def previews():
 times=[.7,1.8,2.6,3.7,4.35,5.65,6.85,8.60,9.45,10.3,11.2,12.6]
 thumb_h=round(720*H/W);row_h=thumb_h+30
 sheet=Image.new('RGB',(1440,6*row_h),(215,215,211));d=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  fr=frame(t);fr.save(OUT/f'frame-{t:.2f}.jpg',quality=94)
  sheet.paste(fr.resize((720,thumb_h),Image.Resampling.LANCZOS),((i%2)*720,(i//2)*row_h));text(sheet,f'{t:.2f}s',(i%2)*720+12,(i//2)*row_h+thumb_h+5,18)
 sheet.save(OUT/'Contact sheet.jpg',quality=93);frame(12.6).save(OUT/'Poster.jpg',quality=95)
 print('Previews ready',flush=True)
def render():
 soundtrack();path=OUT/'Ear to Mind — Product Film.mp4'
 args=[str(FF),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(OUT/'Music only.wav'),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','14','-movflags','+faststart',str(path)]
 p=subprocess.Popen(args,stdin=subprocess.PIPE)
 for f in range(LENGTH*FPS):
  p.stdin.write(frame(f/FPS).tobytes())
  if f%(FPS*2)==0:print(f'Rendered {f/FPS:.0f} / 14 seconds',flush=True)
 p.stdin.close()
 if p.wait():raise RuntimeError('Encoding failed')
 print('READY',path,flush=True)
if __name__=='__main__':
 if '--ffmpeg' in sys.argv:FF=sys.argv[sys.argv.index('--ffmpeg')+1]
 if '--width' in sys.argv:W=int(sys.argv[sys.argv.index('--width')+1])
 if '--output-dir' in sys.argv:OUT=Path(sys.argv[sys.argv.index('--output-dir')+1]);OUT.mkdir(parents=True,exist_ok=True)
 if '--preview' in sys.argv:previews()
 if '--render' in sys.argv:render()
