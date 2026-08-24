(()=>{
'use strict';
if(window.__civicoPrecheckinLinkFix)return;window.__civicoPrecheckinLinkFix=true;
const CANONICAL='https://www.civico26reggiocalabria.it/checkin-ospiti.html';
const q=s=>document.querySelector(s);
function canonicalFrom(value){
  try{
    const u=new URL(value||'',location.href);
    const token=u.searchParams.get('t');
    if(!token)return null;
    const out=new URL(CANONICAL);
    out.searchParams.set('t',token);
    return out.href;
  }catch{return null}
}
async function copy(text){try{await navigator.clipboard.writeText(text)}catch{}}
function fixBox(box,copyNow=false){
  if(!box)return;
  const input=box.querySelector('input');
  const link=canonicalFrom(input?.value);
  if(!link)return;
  if(input&&input.value!==link)input.value=link;
  const wa=box.querySelector('a[href*="wa.me"]');
  if(wa){
    try{
      const old=new URL(wa.href);
      const text='Ciao, puoi completare il pre-check-in di Civico 26 qui: '+link;
      old.searchParams.set('text',text);
      wa.href=old.href;
    }catch{}
  }
  if(copyNow)copy(link);
}
function scan(copyNow=false){document.querySelectorAll('#precheckinSec .pc-linkbox').forEach(b=>fixBox(b,copyNow))}

document.addEventListener('click',e=>{
  const copyBtn=e.target.closest('#precheckinSec .pc-linkbox [data-copy]');
  if(copyBtn){
    const box=copyBtn.closest('.pc-linkbox'),link=canonicalFrom(box?.querySelector('input')?.value);
    if(link){e.preventDefault();e.stopImmediatePropagation();fixBox(box,false);copy(link);return}
  }
  const wa=e.target.closest('#precheckinSec .pc-linkbox a[href*="wa.me"]');
  if(wa)fixBox(wa.closest('.pc-linkbox'),false);
},true);

const mo=new MutationObserver(muts=>{
  let created=false;
  for(const m of muts){
    for(const n of m.addedNodes){
      if(!(n instanceof Element))continue;
      if(n.matches?.('.pc-linkbox')||n.querySelector?.('.pc-linkbox')){created=true;break}
    }
    if(created)break;
  }
  if(created)requestAnimationFrame(()=>scan(true));
});
mo.observe(document.documentElement,{childList:true,subtree:true});
scan(false);
})();
