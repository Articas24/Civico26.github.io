(()=>{
'use strict';
if(window.__civicoStatsLayout)return;window.__civicoStatsLayout=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];

function styles(){
  if(q('#statsLayoutStyles'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="statsLayoutStyles">
#statsSec .sv-chart-controls{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;flex-wrap:nowrap!important}
#statsSec .sv-chart-toggle{min-width:0!important;justify-content:center!important;white-space:nowrap!important;padding:7px 7px!important;font-size:9.5px!important;gap:4px!important}
#statsSec .sv-chart-toggle input{flex:0 0 auto!important}
#statsSec .sv-chart-toggle .sv-toggle-dot{flex:0 0 auto!important}
@media(max-width:560px){
  #statsSec .sv-chart-controls{gap:4px!important}
  #statsSec .sv-chart-toggle{padding:6px 3px!important;font-size:8.3px!important;gap:3px!important}
  #statsSec .sv-chart-toggle input{width:16px!important;height:16px!important;flex-basis:16px!important}
  #statsSec .sv-chart-toggle .sv-toggle-dot{width:8px!important;height:8px!important;flex-basis:8px!important}
}
</style>`);
}

function cardByTitle(title){
  return qa('#statsSec > .sv-card').find(card=>(card.querySelector(':scope > h2')?.textContent||'').trim()===title)||null;
}

function gridByTitle(title){
  return qa('#statsSec > .sv-grid').find(grid=>[...grid.querySelectorAll(':scope > .sv-card > h2')].some(h=>(h.textContent||'').trim()===title))||null;
}

function reorder(){
  const sec=q('#statsSec'),kpis=sec?.querySelector(':scope > .sv-kpis');
  if(!sec||!kpis)return;
  const economicChart=cardByTitle('Andamento economico');
  const economicCards=sec.querySelector(':scope > .sv-econ');
  const occupancyChannels=gridByTitle('Occupazione nel periodo');
  const platformIndicators=gridByTitle('Dettaglio piattaforme');
  const compare=sec.querySelector(':scope > .sv-compare');
  const order=[economicChart,economicCards,occupancyChannels,platformIndicators,compare].filter(Boolean);
  let anchor=kpis;
  order.forEach(node=>{
    if(anchor.nextElementSibling!==node)anchor.insertAdjacentElement('afterend',node);
    anchor=node;
  });
}

function shortenCommissionLabel(){
  const input=q('#statsSec [data-sv-chart-flag="cost"]');
  const label=input?.closest('label');
  if(!label)return;
  const textNode=[...label.childNodes].find(n=>n.nodeType===3&&/commissioni/i.test(n.textContent||''));
  if(textNode&&textNode.textContent.trim()!=='Commissioni')textNode.textContent='Commissioni';
}

function run(){styles();reorder();shortenCommissionLabel()}

function boot(){
  run();
  const root=q('#statsSec')||document.body;
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;run()});
  }).observe(root,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    if(e.target.closest('.navtab[data-section="statsSec"]'))setTimeout(run,120);
  });
}
boot();
})();
