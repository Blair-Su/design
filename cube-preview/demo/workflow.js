'use strict';

const hasContent=value=>typeof value==='string'&&value.trim().length>0;
function stepIssue(stage,board=state){
 if(stage===0){
  if(!hasContent(board.goal))return {stage,field:'goal',message:'Add your goal in Context to continue.'};
 }
 if(stage===1){
  if(!board.hmws.length)return {stage,message:'Add at least one question in Decompose to continue.'};
  if(board.hmws.some(h=>!hasContent(h.text)))return {stage,message:'Complete or remove each empty question in Decompose to continue.'};
 }
 if(stage===2){
  if(!board.notes.length)return {stage,message:'Add at least one idea in Ideate before opening the map.'};
  if(board.notes.some(n=>!hasContent(n.text)))return {stage,message:'Complete or remove each empty idea before opening the map.'};
 }
 return null;
}
function workflowBlocker(target,board=state){
 for(let stage=0;stage<target;stage++){const issue=stepIssue(stage,board);if(issue)return issue;}
 return null;
}
function availableStage(board=state){return workflowBlocker(3,board)?.stage??3;}
function enforceWorkflow(){
 const next=Number.isInteger(state.stage)?Math.max(0,Math.min(state.stage,availableStage())):0;
 if(next===state.stage)return false;
 state.stage=next;selected=null;suggestion=null;save();return true;
}

// Read current fields without rerendering or discarding an unfinished draft.
function workflowDraft(){
 if(state.stage===0){
  const goal=$('#goal'),audience=$('#audience');
  if(goal&&audience)return {...state,goal:goal.value,audience:audience.value};
 }
 if(state.stage===1){
  const values=new Map([...document.querySelectorAll('[data-hmw]')].map(el=>[el.dataset.hmw,el.value]));
  return {...state,hmws:state.hmws.map(h=>values.has(h.id)?{...h,text:values.get(h.id)}:h)};
 }
 return state;
}
function saveWorkflowDraft(){
 if(state.stage===0){saveContext();return;}
 if(state.stage!==1)return;
 const draft=workflowDraft();
 if(draft.hmws.some((h,i)=>h.text!==state.hmws[i].text)){snapshot();state.hmws=draft.hmws;save();}
}
function stageGateAttributes(target){
 const issue=workflowBlocker(target);
 return issue?`disabled aria-disabled="true" title="${esc(issue.message)}"`:'aria-disabled="false"';
}
function updateWorkflowControls(){
 const draft=workflowDraft();
 for(const button of document.querySelectorAll('[data-stage]')){
  const issue=workflowBlocker(Number(button.dataset.stage),draft);
  button.disabled=!!issue;button.setAttribute('aria-disabled',String(!!issue));button.title=issue?.message||'';
  const lock=button.querySelector('.stage-lock');if(lock)lock.hidden=!issue;
 }
 const next=$('#context-continue');
 if(next){const issue=workflowBlocker(1,draft);next.disabled=!!issue;next.setAttribute('aria-disabled',String(next.disabled));next.title=issue?.message||'';}
 const hint=$('#step-requirement'),issue=workflowBlocker(state.stage+1,draft);
 if(hint){hint.hidden=!issue;hint.textContent=issue?.message||'';}
 const navHint=$('#workflow-nav-hint'),navIssue=workflowBlocker(3,draft);
 if(navHint){navHint.hidden=!navIssue;navHint.textContent=navIssue?.message||'';}
}
function explainWorkflowBlocker(issue){
 toast(issue.message);
 if(sidebarOpen)setSidebarOpen(false);
 if(state.stage!==issue.stage)return;
 const field=issue.field?$('#'+issue.field):issue.stage===1?[...document.querySelectorAll('[data-hmw]')].find(el=>!hasContent(el.value))||$('[data-action="add-hmw"]'):null;
 field?.focus();
}
