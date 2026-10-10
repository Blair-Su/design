'use strict';
// Demo content only. Layout, interactions and validation use the shared app.
(()=>{
 const example={stage:2,title:'Onboarding exploration',goal:'Help new users experience the product’s value in their first five minutes and improve first-week retention.',audience:'Product designers and small design teams trying a collaborative design tool for the first time.',hmws:[{id:'h1',text:'How might we make the first step feel effortless?'},{id:'h2',text:'How might we create a little moment of delight?'},{id:'h3',text:'How might we give people a reason to return?'}],notes:[{id:'n1',group:'h1',face:'user',text:'One real task instead of a long product tour.',likes:3,x:0,y:0,impact:9,effort:3},{id:'n2',group:'h1',face:'tech',text:'A ready-to-edit project, tailored to their role.',likes:2,x:0,y:0,impact:8,effort:6},{id:'n3',group:'h1',face:'constraint',text:'One core action. A first win in 60 seconds.',likes:1,x:0,y:0,impact:7,effort:2},{id:'n4',group:'h2',face:'emotion',text:'A small celebration for that very first win.',likes:4,x:0,y:0,impact:7,effort:3},{id:'n5',group:'h2',face:'user',text:'A head start instead of a blank canvas.',likes:2,x:0,y:0,impact:9,effort:4},{id:'n6',group:'h2',face:'business',text:'Let people feel the value before signing up.',likes:3,x:0,y:0,impact:8,effort:7},{id:'n7',group:'h3',face:'business',text:'Save a next step before they leave.',likes:2,x:0,y:0,impact:7,effort:3},{id:'n8',group:'h3',face:'emotion',text:'Show personal progress, not the pressure of a streak.',likes:1,x:0,y:0,impact:6,effort:5}],attachments:[],axis:'impact',mapPlaced:false};
 let board=example;
 // Preserve edits made in the original demo; never read the real workspace.
 try{
  const legacy=JSON.parse(localStorage.getItem('cube-prototype-en-v1'));
  if(legacy&&typeof legacy.title==='string'&&typeof legacy.goal==='string'&&typeof legacy.audience==='string'&&Array.isArray(legacy.hmws)&&Array.isArray(legacy.notes)&&legacy.hmws.every(h=>typeof h.id==='string'&&typeof h.text==='string')&&legacy.notes.every(n=>typeof n.id==='string'&&typeof n.text==='string'&&['user','emotion','business','tech','constraint','wildcard'].includes(n.face)))board=legacy;
 }catch{}
 const axes=['impact','novelty','value'],occupancy={impact:{},novelty:{},value:{}};
 const rating=(value,fallback)=>Number.isFinite(value)?Math.max(1,Math.min(10,value)):fallback;
 const notes=board.notes.map(n=>{
  const impact=rating(n.impact,6),effort=rating(n.effort,5);
  const scores={impact:{x:effort,y:impact},novelty:{x:rating(n.feasibility,11-effort),y:rating(n.novelty,{wildcard:9,tech:8,emotion:7,user:5,business:6,constraint:4}[n.face])},value:{x:rating(n.businessValue,n.face==='business'?9:Math.min(9,impact-1)),y:rating(n.userValue,impact)}};
  const evaluations={};
  for(const axis of axes){
   const {x,y}=scores[axis],col=x>5?1:0,row=y>5?0:1,key=col+','+row,slot=occupancy[axis][key]||0;occupancy[axis][key]=slot+1;
   const existingPosition=axis===board.axis&&Number.isFinite(n.mx)&&Number.isFinite(n.my);
   evaluations[axis]={x,y,source:'example',reason:axis===board.axis&&typeof n.reason==='string'?n.reason:'',mx:existingPosition?n.mx:60+col*420+(slot%2)*200,my:existingPosition?n.my:71+row*265+Math.floor((slot%6)/2)*71+Math.floor(slot/6)*7};
  }
  return {...n,evaluations};
 });
 window.cubeDemo={title:board.title,goal:board.goal,audience:board.audience,stage:[0,1,2,3].includes(board.stage)?board.stage:2,axis:axes.includes(board.axis)?board.axis:'impact',hmws:board.hmws,notes,attachments:Array.isArray(board.attachments)?board.attachments:[],mapPlaced:!!board.mapPlaced};
})();
