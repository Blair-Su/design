"""Ear to Mind: shot-directed 14s launch film.
Reference study: Burnwe compilation, Marvin / 10Web / Trumpet segments.
Revision: use the approved tagline for the two title beats; background music only, no interaction sound effects.
Original UI motion, typography and audio; no reference footage or audio reused.
"""
from pathlib import Path
from functools import lru_cache
import math, sys, wave, subprocess, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'qa/ear-to-mind-film';OUT.mkdir(parents=True,exist_ok=True)
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
def pill(im,txt,x,y,w,h=42,dark=False,s=23):
 d=ImageDraw.Draw(im);d.rounded_rectangle((x,y,x+w,y+h),radius=9,fill=INK if dark else (245,245,242),outline=(215,215,211),width=1)
 text(im,txt,x+w/2,y+(h-s)/2-1,s,WHITE if dark else GRAY,anchor='mt')
def card(w,h,color=WHITE,rad=24):
 im=Image.new('RGBA',(w,h));ImageDraw.Draw(im).rounded_rectangle((1,1,w-2,h-2),radius=rad,fill=color,outline=(215,215,211),width=2);return im
@lru_cache(maxsize=96)
def shadowed(key):
 a=asset(key);margin=65
 sh=Image.new('RGBA',(a.width+margin*2,a.height+margin*2));mask=Image.new('L',sh.size)
 mask.paste(a.getchannel('A'),(margin,margin+18));mask=mask.filter(ImageFilter.GaussianBlur(23)).point(lambda p:round(p*.18))
 sh.paste((0,0,0,255),(0,0,sh.width,sh.height),mask);sh.alpha_composite(a,(margin,margin));return sh
def put(im,key,cx,cy,scale=1,alpha=1,blur=0,shadow=True):
 if alpha<=0 or scale<=0:return
 a=shadowed(key) if shadow else asset(key)
 nw,nh=max(1,round(a.width*scale)),max(1,round(a.height*scale))
 # Skip assets that are wholly out of frame.
 if cx+nw/2<0 or cx-nw/2>W or cy+nh/2<0 or cy-nh/2>H:return
 a=a.resize((nw,nh),Image.Resampling.BICUBIC)
 if blur>.1:a=a.filter(ImageFilter.GaussianBlur(blur))
 if alpha<1:a.putalpha(a.getchannel('A').point(lambda p:round(p*alpha)))
 im.alpha_composite(a,(round(cx-nw/2),round(cy-nh/2)))
def overlay_text(im,txt,x,y,s,col=INK,alpha=1,b=False,anchor='lt'):
 if alpha<=0:return
 l=Image.new('RGBA',(W,H));text(l,txt,x,y,s,(*col,round(255*clamp(alpha))),b,anchor);im.alpha_composite(l)
def logo(im,cx,cy,size=1,color=INK,word=True):
 d=ImageDraw.Draw(im)
 for j,hh in enumerate([28,48,36]):
  xx=cx+j*14*size;d.rounded_rectangle((xx,cy+(48-hh)*size,xx+8*size,cy+48*size),radius=max(1,1.5*size),fill=color)
 if word:text(im,'Ear to Mind',cx+52*size,cy+7*size,36*size,color)

@lru_cache(None)
def bg(dark=False):
 yy,xx=np.mgrid[0:H,0:W]
 dist=((xx-W*.55)/(W*.75))**2+((yy-H*.4)/(H*.95))**2
 rng=np.random.default_rng(8);grain=rng.normal(0,.38,(H,W))
 level=(17+18*np.exp(-dist*2.7) if dark else 242+12*np.exp(-dist*2))+grain
 data=np.repeat(np.clip(level,0,255).astype('uint8')[:,:,None],3,axis=2)
 return Image.fromarray(data).convert('RGBA')

QUOTES=[
 ('A tired Tuesday','“I just didn’t want to make\nanother decision.”'),
 ('A familiar meal','“I made the same pasta\nI always make.”'),
 ('One less thing','“It felt like I could finally\nstop working things out.”')]
@lru_cache(maxsize=100)
def asset(key):
 if key.startswith('quote'):
  idx=int(key[-1]);im=card(1200,410);title,q=QUOTES[idx]
  pill(im,'Sample participant',46,34,237,44,s=25);text(im,title,1154,44,24,GRAY,anchor='rt')
  text(im,q,48,139,59);text(im,'Source quote',48,328,24,GRAY)
  return im
 if key=='editor':
  im=card(1550,810)
  text(im,'The original words',48,39,29)
  text(im,'“I just didn’t want to make another decision.”',48,102,42)
  d=ImageDraw.Draw(im);d.line((48,187,1502,187),fill=(219,219,215),width=2)
  for label,x,w in [('Action',48,155),('Thought',215,174),('Feeling',401,162),('Philosophy',575,221)]:pill(im,label,x,231,w,66,dark=label=='Thought',s=29)
  text(im,'Your cognitive statement',48,341,30,GRAY)
  d.rounded_rectangle((48,408,1502,638),radius=15,fill=(251,251,249),outline=(174,174,169),width=2)
  pill(im,'Prepare ChatGPT review',48,699,335,64,True,27)
  text(im,'Save a version',1501,718,26,GRAY,anchor='rt')
  return im
 if key.startswith('statement'):
  idx=int(key[-1]);data=[('Thought','Avoid making\nanother decision'),('Feeling','Feel tired\nof choosing'),('Action','Check what is\nin the fridge'),('Thought','Gauge what feels\nmanageable'),('Action','Rely on a\nfamiliar meal')][idx]
  im=card(560,224,rad=18);pill(im,data[0],29,26,115 if data[0]!='Feeling' else 103,36,s=23)
  text(im,data[1],30,92,36);return im
 if key=='board':
  im=card(2400,1330,rad=28);d=ImageDraw.Draw(im)
  d.rounded_rectangle((0,0,274,1330),radius=28,fill=INK);d.rectangle((235,0,274,1330),fill=INK)
  logo(im,28,45,.85,WHITE)
  text(im,'Weeknight rituals',31,156,26,(220,220,217))
  nav=['Overview','Interviews','Quotes','Statements','Mental model','ChatGPT coach']
  for j,item in enumerate(nav):
   yy=286+j*90
   if j==4:d.rounded_rectangle((15,yy-16,254,yy+44),radius=9,fill=WHITE)
   text(im,item,41,yy,27,INK if j==4 else (192,192,188))
  text(im,'Guided tour',41,1040,26,(190,190,185))
  text(im,'Weeknight rituals',327,44,25,GRAY);d.line((274,99,2400,99),fill=(218,218,213),width=2)
  text(im,'See the connections.',330,156,65)
  text(im,'Make room for dinner',330,284,35)
  pill(im,'Add tower',2130,267,215,58,s=27)
  for x,title in [(330,'Reduce decision effort'),(988,'Take stock'),(1646,'Keep dinner manageable')]:
   d.rounded_rectangle((x-20,352,x+600,1238),radius=20,fill=(240,240,237),outline=(225,225,221),width=2)
   text(im,title,x+280,876,31,anchor='mt')
   text(im,'Edit tower',x+280,926,23,GRAY,anchor='mt')
   d.line((x,996,x+560,996),fill=(135,135,130),width=2)
   text(im,'Support opportunities',x,1036,25,GRAY)
   d.rounded_rectangle((x,1086,x+560,1207),radius=11,fill=(251,251,248),outline=(208,208,203),width=1)
  return im
 if key=='support':
  im=card(1370,518,rad=25);d=ImageDraw.Draw(im)
  text(im,'Reduce decision effort',685,40,41,anchor='mt')
  d.line((50,121,1320,121),fill=(131,131,127),width=2)
  text(im,'Support opportunities',51,161,30,GRAY)
  d.rounded_rectangle((49,235,1321,461),radius=17,fill=(249,249,246),outline=(201,201,195),width=2)
  return im
 if key=='cta':
  im=card(428,96,WHITE,48);text(im,'Try the assistant',214,30,35,INK,anchor='mt');return im
 if key=='coaching':
  im=card(510,285,rad=20);text(im,'A little perspective.',30,39,36)
  text(im,'Write your draft. Then ask\nChatGPT for a fresh perspective.',30,111,27,GRAY)
  text(im,'You keep the pen.',30,227,24,GRAY);return im
 raise KeyError(key)

def type_on(im,s,x,y,size,t,start,speed=30,col=INK,scale=1):
 n=min(len(s),max(0,int((t-start)*speed)));text(im,s[:n],x,y,size,col)
 if start<t<start+len(s)/speed+.2:
  xx=x+font(size).getlength(s[:n]);ImageDraw.Draw(im).line((xx+4,y-5,xx+4,y+size+9),fill=col,width=max(2,round(scale*2)))

def scene_open(t):
 im=bg(True).copy()
 # Moving foreground and background planes create depth around the words.
 for j,(x,y,sc) in enumerate([(-210,70,.70),(1850,905,.7),(1380,-130,.56),(-230,1010,.5)]):
  put(im,'quote'+str(j%3),x+(t-.6)*(160 if j%2 else -190),y,sc,.15,blur=5,shadow=False)
 v=ease(t/.43)
 overlay_text(im,'Go beyond',960,350+110*(1-v),144,WHITE,v,anchor='mt')
 v2=ease((t-.16)/.43)
 overlay_text(im,'what they say.',960,515+110*(1-v2),144,WHITE,v2,anchor='mt')
 # The quote itself becomes the transition, filling the lens.
 q=ease((t-1.04)/.38)
 if q>0:put(im,'quote0',960,lerp(1520,540,q),lerp(.9,1.28,q))
 return im

def scene_quote(t):
 u=t-1.4;im=bg().copy()
 for j,(x,y,sc) in enumerate([(250,180,.94),(1630,965,1.08),(1590,120,.75)]):
  put(im,'quote'+str((j+1)%3),x-90*u,y+35*u,sc,.47,blur=2.4)
 z=1.28+.06*smooth(u/1.6);cx=960-35*u;cy=540+15*u
 put(im,'quote0',cx,cy,z)
 # Focus the specific phrase; the surrounding UI softens just slightly.
 left=cx-600*z;top=cy-205*z
 p=ease((u-.2)/.45)
 lay=Image.new('RGBA',(W,H));d=ImageDraw.Draw(lay)
 d.rounded_rectangle((left+43*z,top+205*z,left+(43+548*p)*z,top+274*z),radius=7,fill=(70,70,60,25))
 im.alpha_composite(lay)
 return im

def scene_editor(t):
 u=t-3;im=bg().copy()
 # Start macro and drift across the writing surface; no static slide heading.
 z=lerp(1.42,1.20,ease(u/1.9));cx=960+45*(1-ease(u/.65));cy=440
 put(im,'editor',cx,cy,z)
 x=cx-775*z;y=cy-405*z
 start=3.24;phrase='Avoid making another decision'
 type_on(im,phrase,x+83*z,y+472*z,round(63*z),t,start,25)
 # Button feedback and a coaching plane enter as a secondary detail.
 if u>1.14:
  p=ease((u-1.14)/.48);put(im,'coaching',lerp(2200,1530,p),833,.86,p)
 return im

def board_camera(t):
 u=t-4.9
 # Pull back from the statement, then arc toward the opportunities below it.
 if u<1.7:
  a=smooth(u/1.7);return lerp(1.72,.76,a),lerp(604,1260,a),lerp(460,638,a)
 return .76,1260,638
def scene_board(t):
 u=t-4.9;im=bg(True).copy();z,camx,camy=board_camera(t)
 def xy(x,y):return 960+(x-camx)*z,540+(y-camy)*z
 bx,by=xy(1200,665);put(im,'board',bx,by,z)
 slots=[(610,500),(610,752),(1268,500),(1926,500),(1926,752)]
 for j,(x,y) in enumerate(slots):
  start=j*.12
  a=spring((u-start)/.75)
  xx=x+(1-a)*(510 if j%2 else -440);yy=y-(1-a)*(240+j*65)
  px,py=xy(xx,yy);put(im,'statement'+str(j),px,py,z,clamp((u-start)/.18))
 return im

def scene_support(t):
 u=t-7.2;im=bg().copy()
 # Other intentions stay behind the focal card, providing context and scale.
 for j,(x,y,sc) in enumerate([(90,155,.9),(1760,80,.85),(1660,1000,1.0)]):
  put(im,'statement'+str(j),x-u*55,y+u*22,sc,.33,blur=3.0)
 a=ease(u/.5);z=lerp(.8,1.14,a);cy=lerp(850,520,a)
 put(im,'support',960,cy,z)
 x=960-685*z;y=cy-259*z
 # Two lines stay readable as the camera gets close.
 phrase='Make familiar options'
 type_on(im,phrase,x+83*z,y+278*z,round(57*z),t,7.45,34)
 if t>8.08:type_on(im,'easier to compare.',x+83*z,y+352*z,round(57*z),t,8.08,36)
 return im

def scene_resolution(t):
 u=t-9.15
 if u<.62:
  im=bg().copy()
  # Cards leave quickly in opposing planes; the message takes their place.
  for j in range(3):put(im,'statement'+str(j),[-240,960,2150][j]+(u*1300*(j-1)),[-60,1180,180][j],1.2,.16,blur=3)
  a=ease(u/.24);overlay_text(im,'Ask deeper.',960,449+90*(1-a),166,INK,a,anchor='mt')
 else:
  im=bg(True).copy();a=ease((u-.62)/.25)
  overlay_text(im,'Write it yourself.',960,460+80*(1-a),125,WHITE,a,anchor='mt')
 return im

def scene_end(t):
 u=t-10.75;im=bg(True).copy()
 # Three stacked planes compress into the existing brand mark.
 factor=ease(u/.67)
 for j,hh in enumerate([28,48,36]):
  end=(510+j*14*2.8,405+(48-hh)*2.8,8*2.8,hh*2.8)
  start=(230+j*550,lerp(500,190,j/2),460,270)
  r=[lerp(a,b,factor) for a,b in zip(start,end)]
  d=ImageDraw.Draw(im);d.rounded_rectangle((r[0],r[1],r[0]+r[2],r[1]+r[3]),radius=lerp(22,4,factor),fill=WHITE)
 a=ease((u-.32)/.45)
 overlay_text(im,'Ear to Mind',650,428+40*(1-a),109,WHITE,a)
 overlay_text(im,'From what people say to how they think.',960,628,35,(177,177,173),ease((u-.78)/.4),anchor='mt')
 p=ease((u-1.02)/.38);put(im,'cta',960,773+27*(1-p),1,p,shadow=False)
 for j in range(8):
  age=u-1.40-j*.035
  if 0<age<.7:
   xx=960+(j-3.5)*27*ease(age/.7);yy=728-age*165+100*age*age;r=(4+j%3)*(1-age/.7)
   ImageDraw.Draw(im).ellipse((xx-r,yy-r,xx+r,yy+r),fill=(225,225,220,round(210*(1-age/.7))))
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
 sheet=Image.new('RGB',(1440,6*435),(215,215,211));d=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  fr=frame(t);fr.save(OUT/f'frame-{t:.2f}.jpg',quality=94)
  sheet.paste(fr.resize((720,405),Image.Resampling.LANCZOS),((i%2)*720,(i//2)*435));text(sheet,f'{t:.2f}s',(i%2)*720+12,(i//2)*435+410,18)
 sheet.save(OUT/'Contact sheet.jpg',quality=93);frame(12.6).save(OUT/'Poster.jpg',quality=95)
 print('Previews ready',flush=True)
def render():
 soundtrack();path=OUT/'Ear to Mind — Product Film.mp4'
 args=[str(FF),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r',str(FPS),'-i','pipe:0','-i',str(OUT/'Music only.wav'),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','14','-movflags','+faststart',str(path)]
 p=subprocess.Popen(args,stdin=subprocess.PIPE)
 for f in range(LENGTH*FPS):
  p.stdin.write(frame(f/FPS).tobytes())
  if f%(FPS*2)==0:print(f'Rendered {f/FPS:.0f} / 14 seconds',flush=True)
 p.stdin.close()
 if p.wait():raise RuntimeError('Encoding failed')
 print('READY',path,flush=True)
if __name__=='__main__':
 if '--ffmpeg' in sys.argv:FF=sys.argv[sys.argv.index('--ffmpeg')+1]
 if '--preview' in sys.argv:previews()
 if '--render' in sys.argv:render()
