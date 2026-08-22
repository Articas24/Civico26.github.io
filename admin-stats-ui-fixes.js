(()=>{
'use strict';
if(window.__civicoStatsUiFixes)return;window.__civicoStatsUiFixes=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];

function styles(){
  if(q('#statsUiFixesStyles'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="statsUiFixesStyles">
#statsSec .sv-stacked{padding-left:6px!important;padding-right:6px!important;scroll-padding-inline:6px!important}
#statsSec .sv-econ #svBreakdown{grid-column:1/-1!important;width:100%!important;margin:0!important}
</style>`);
}

function economicCard(){return qa('#statsSec .sv-card').find(c=>(c.querySelector('h2')?.textContent||'').trim()==='Andamento economico')||null}
function currentNote(){return economicCard()?.querySelector('.sv-note')||null}

function syncEconomicNote(){
  const note=currentNote();
  if(!note)return;
  const selected=!!economicCard()?.querySelector('.sv-stackcol.sv-econ-selected');
  note.style.display=selected?'':'none';
}

function closeEconomicDetail(){
  const note=currentNote();
  qa('#statsSec .sv-stackcol.sv-econ-selected').forEach(x=>x.classList.remove('sv-econ-selected'));
  if(note){note.innerHTML='';note.style.display='none'}
}

function placeBreakdown(){
  const econ=q('#statsSec .sv-econ'),box=q('#statsSec #svBreakdown');
  if(!econ||!box)return;
  if(box.parentElement!==econ)econ.appendChild(box);
}

function sync(){styles();syncEconomicNote();placeBreakdown()}

// Capture phase: if the currently selected economic bar is tapped again,
// close the detail before the original detail handler can re-open it.
document.addEventListener('click',e=>{
  const col=e.target.closest('#statsSec .sv-stackcol');
  if(!col||col.closest('.sv-card')!==economicCard())return;
  if(col.classList.contains('sv-econ-selected')){
    e.preventDefault();
    e.stopImmediatePropagation();
    closeEconomicDetail();
  }
},true);

// After a first tap (or a tap on a different period), the existing module
// renders the detail; make the panel visible only then.
document.addEventListener('click',e=>{
  const col=e.target.closest('#statsSec .sv-stackcol');
  if(col&&col.closest('.sv-card')===economicCard()){
    requestAnimationFrame(syncEconomicNote);
    return;
  }
  if(e.target.closest('#statsSec .sv-clickable-kpi'))requestAnimationFrame(placeBreakdown);
});

function boot(){
  sync();
  const root=q('#statsSec')||document.body;
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;sync()});
  }).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
}
boot();
})();
