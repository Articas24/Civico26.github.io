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
#statsSec .sv-card,#statsSec .sv-grid,#statsSec .sv-grid>.sv-card{min-width:0!important}
#statsSec .sv-occ-selectable{cursor:pointer;border-radius:10px;transition:transform .15s ease,background .15s ease}
#statsSec .sv-occ-selectable:focus-visible{outline:2px solid var(--green);outline-offset:3px}
#statsSec .sv-occ-selectable.sv-occ-selected{background:#f1f7f4;transform:translateY(-1px)}
#statsSec .sv-occ-selectable.sv-occ-selected .sv-track{outline:2px solid var(--green);outline-offset:2px}
#statsSec .sv-occ-detail{margin-top:12px;padding:11px 13px;border:1px solid #cfe1da;border-radius:13px;background:#f5faf8;display:flex;align-items:center;justify-content:space-between;gap:12px}
#statsSec .sv-occ-detail strong{font-size:13px;color:var(--ink)}
#statsSec .sv-occ-detail span{font-size:11px;color:var(--muted);white-space:nowrap}
@media(max-width:760px){
  #statsSec .sv-chart-controls{gap:4px!important}
  #statsSec .sv-chart-toggle{padding:6px 3px!important;font-size:8.3px!important;gap:3px!important}
  #statsSec .sv-chart-toggle input{width:16px!important;height:16px!important;flex-basis:16px!important}
  #statsSec .sv-chart-toggle .sv-toggle-dot{width:8px!important;height:8px!important;flex-basis:8px!important}
  #statsSec .sv-donut-wrap{display:flex!important;justify-content:center!important;align-items:center!important;width:100%!important;margin:16px auto 18px!important;overflow:visible!important}
  #statsSec .sv-donut{margin:0 auto!important;flex:0 0 152px!important;transform:none!important}
  #statsSec .sv-legend{width:100%!important;min-width:0!important;gap:10px!important}
  #statsSec .sv-channel{width:100%!important;min-width:0!important;grid-template-columns:auto minmax(0,1fr)!important;grid-template-rows:auto auto!important;column-gap:10px!important;row-gap:2px!important;padding:7px 0!important}
  #statsSec .sv-channel .sv-dot{grid-column:1!important;grid-row:1 / span 2!important;align-self:center!important}
  #statsSec .sv-channel .sv-channel-name{grid-column:2!important;grid-row:1!important;min-width:0!important}
  #statsSec .sv-channel b{grid-column:2!important;grid-row:2!important;justify-self:start!important;white-space:normal!important;min-width:0!important;font-size:10px!important;color:var(--muted)!important;line-height:1.3!important}
  #statsSec .sv-mobile-occ-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:14px;width:100%}
  #statsSec .sv-mobile-occ-weekday{text-align:center;font-size:9px;font-weight:900;color:var(--muted);text-transform:uppercase;padding:2px 0 4px}
  #statsSec .sv-mobile-occ-spacer{min-height:38px}
  #statsSec .sv-mobile-occ-day{min-width:0;height:42px;border-radius:10px;display:grid;place-items:center;border:1px solid var(--line);font-size:11px;font-weight:900;background:#eef4f2;color:var(--muted)}
  #statsSec .sv-mobile-occ-day.occupied{background:var(--green);border-color:var(--green);color:#fff}
  #statsSec .sv-mobile-occ-day.blocked{background:#fff1dc;border-color:#e4b881;color:#91622f}
  #statsSec .sv-mobile-occ-legend{grid-column:1/-1;display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding-top:4px;font-size:9.5px;color:var(--muted)}
  #statsSec .sv-mobile-occ-legend span{display:inline-flex;align-items:center;gap:5px}
  #statsSec .sv-mobile-occ-legend i{width:9px;height:9px;border-radius:3px;display:inline-block}
  #statsSec .sv-mobile-occ-legend .occ{background:var(--green)}
  #statsSec .sv-mobile-occ-legend .free{background:#eef4f2;border:1px solid var(--line)}
  #statsSec .sv-mobile-occ-legend .blocked{background:#fff1dc;border:1px solid #e4b881}
  #statsSec .sv-occ-detail{align-items:flex-start;flex-direction:column;gap:2px}
  #statsSec .sv-occ-detail strong{font-size:12px}
  #statsSec .sv-occ-detail span{font-size:10px;white-space:normal}
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

function occupancyCard(){
  return qa('#statsSec .sv-card').find(card=>(card.querySelector('h2')?.textContent||'').trim()==='Occupazione nel periodo')||null;
}

function monthlyOccupancyDetails(){
  const card=occupancyCard(),chart=card?.querySelector('.sv-chart');
  if(!card||!chart||chart.style.display==='none')return;
  const cols=[...chart.querySelectorAll('.sv-barcol')].filter(col=>/(\d+)\s+notti\s+su\s+(\d+)/i.test(col.getAttribute('title')||''));
  if(!cols.length){card.querySelector('.sv-occ-detail')?.remove();return}
  cols.forEach(col=>{
    if(col.dataset.occTapReady)return;
    col.dataset.occTapReady='1';
    col.classList.add('sv-occ-selectable');
    col.setAttribute('role','button');
    col.setAttribute('tabindex','0');
    col.setAttribute('aria-label',`${col.querySelector('.sv-label')?.textContent||'Mese'}: ${col.getAttribute('title')||''}`);
    const open=()=>{
      const match=(col.getAttribute('title')||'').match(/(\d+)\s+notti\s+su\s+(\d+)/i);
      if(!match)return;
      const occupied=Number(match[1]),sellable=Number(match[2]);
      const label=(col.querySelector('.sv-label')?.textContent||'Mese').trim();
      const percent=(col.querySelector('.sv-value')?.textContent||'').trim()||`${sellable?Math.round(occupied/sellable*100):0}%`;
      cols.forEach(x=>x.classList.toggle('sv-occ-selected',x===col));
      let detail=card.querySelector('.sv-occ-detail');
      if(!detail){detail=document.createElement('div');detail.className='sv-occ-detail';chart.insertAdjacentElement('afterend',detail)}
      detail.innerHTML=`<strong>${label}: ${occupied} notti occupate su ${sellable} vendibili</strong><span>${percent} di occupazione</span>`;
    };
    col.addEventListener('click',open);
    col.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
}

function mobileOccupancy(){
  const card=occupancyCard();
  if(!card)return;
  const old=card.querySelector('.sv-mobile-occ-calendar');
  const chart=card.querySelector('.sv-chart');
  const mobile=window.matchMedia('(max-width:760px)').matches;
  const monthMode=q('#svMode')?.value==='month';
  if(!mobile||!monthMode){if(old)old.remove();if(chart)chart.style.display='';return}
  card.querySelector('.sv-occ-detail')?.remove();
  if(!chart)return;
  const cols=[...chart.querySelectorAll('.sv-barcol')];
  if(!cols.length)return;
  const year=Number(q('#historyStatsYear')?.value)||new Date().getFullYear();
  const month=Number(q('#svMonth')?.value)||1;
  const states=cols.map((col,i)=>{
    const day=Number(col.querySelector('.sv-label')?.textContent)||i+1;
    const occupied=(col.querySelector('.sv-value')?.textContent||'').includes('%');
    const barStyle=col.querySelector('.sv-bar')?.getAttribute('style')||'';
    const blocked=!occupied&&/bd6f45|background/i.test(barStyle);
    return{day,state:occupied?'occupied':blocked?'blocked':'free'};
  });
  const sig=`${year}-${month}-${states.map(x=>x.state[0]).join('')}`;
  if(old?.dataset.signature===sig){chart.style.display='none';return}
  old?.remove();
  const box=document.createElement('div');box.className='sv-mobile-occ-calendar';box.dataset.signature=sig;
  const weekdays=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  weekdays.forEach(w=>box.insertAdjacentHTML('beforeend',`<div class="sv-mobile-occ-weekday">${w}</div>`));
  const offset=(new Date(year,month-1,1).getDay()+6)%7;
  for(let i=0;i<offset;i++)box.insertAdjacentHTML('beforeend','<div class="sv-mobile-occ-spacer"></div>');
  states.forEach(x=>box.insertAdjacentHTML('beforeend',`<div class="sv-mobile-occ-day ${x.state}">${x.day}</div>`));
  box.insertAdjacentHTML('beforeend','<div class="sv-mobile-occ-legend"><span><i class="occ"></i>Occupata</span><span><i class="free"></i>Libera</span><span><i class="blocked"></i>Bloccata</span></div>');
  chart.insertAdjacentElement('afterend',box);chart.style.display='none';
}

function mobileChannels(){
  if(!window.matchMedia('(max-width:760px)').matches)return;
  const card=qa('#statsSec .sv-card').find(x=>(x.querySelector('h2')?.textContent||'').trim()==='Canali');
  if(!card)return;
  card.style.minWidth='0';
  const donut=card.querySelector('.sv-donut');if(donut){donut.style.marginLeft='auto';donut.style.marginRight='auto'}
}

function run(){styles();reorder();shortenCommissionLabel();mobileOccupancy();monthlyOccupancyDetails();mobileChannels()}

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
  window.addEventListener('resize',()=>setTimeout(run,80));
}
boot();
})();
