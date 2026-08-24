(()=>{
'use strict';
if(window.__civicoAdminFinalFixes)return;window.__civicoAdminFinalFixes=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];

function ensureStyles(){
 if(q('#civicoFinalFixStyles'))return;
 document.head.insertAdjacentHTML('beforeend',`<style id="civicoFinalFixStyles">
/* AI Insights: leggibilita e gerarchia */
#aiInsightsSec .ig{gap:18px!important}
#aiInsightsSec .ic{padding:20px!important;border-radius:20px!important;box-shadow:0 8px 24px rgba(23,55,48,.055)}
#aiInsightsSec h2{font-size:23px!important;margin-bottom:12px!important}
#aiInsightsSec .ia{padding:14px!important;margin:10px 0!important;border-radius:14px!important}
#aiInsightsSec .ia b{font-size:14px!important;line-height:1.35!important}
#aiInsightsSec .ia p,#aiInsightsSec .ia small{font-size:13px!important;line-height:1.55!important;margin-top:6px!important}
#aiInsightsSec .gap{padding:13px!important;margin:9px 0!important;font-size:13px!important;line-height:1.5!important}
#aiInsightsSec .ip{grid-template-columns:minmax(140px,1fr) 88px 105px 72px!important;gap:9px!important;padding:11px 12px!important;margin:7px 0!important;font-size:13px!important;align-items:center!important}
#aiInsightsSec .ip>span{text-align:right;font-variant-numeric:tabular-nums}
#aiInsightsSec .ip-head{background:#f2f7f5!important;border-style:solid!important;color:var(--muted);font-size:10.5px!important;font-weight:900!important;text-transform:uppercase;letter-spacing:.035em}
#aiInsightsSec .ip-head>span:first-child{text-align:left}
#aiInsightsSec .insight-help{margin:-3px 0 10px;color:var(--muted);font-size:12px;line-height:1.45}
#aiInsightsSec .sim{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:11px!important;align-items:end}
#aiInsightsSec .sim-field{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:11px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.035em}
#aiInsightsSec .sim-field select,#aiInsightsSec .sim-field input{width:100%;min-width:0;font-size:14px!important;color:var(--ink);text-transform:none;font-weight:700}
#aiInsightsSec .sr{gap:10px!important;margin-top:14px!important}
#aiInsightsSec .sk{padding:13px!important;border-radius:13px!important}
#aiInsightsSec .sk span{font-size:10px!important;line-height:1.3!important}
#aiInsightsSec .sk strong{font-size:20px!important;margin-top:4px;display:block}
#aiInsightsSec #snote{display:block;font-size:12px!important;line-height:1.5;margin-top:10px}
#aiInsightsSec .ri-ai-check{font-size:12.5px!important;line-height:1.5!important}
/* Assistente AI: su desktop la risposta cresce con la pagina e non viene tagliata */
@media(min-width:901px){
 #aiSec .ai-main{overflow:visible!important}
 #aiSec .ai-chat{max-height:none!important;height:auto!important;overflow:visible!important;min-height:430px}
 #aiSec .ai-msg.assistant{overflow:visible!important}
}
/* Consuntivo/prenotato */
#statsSec .sa-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important}
#statsSec .sa-box.sa-net-indicative{background:#edf7f3;border-color:#cfe2db}
#statsSec .sa-box.sa-net-indicative strong{color:#266548}
#statsSec .sa-net-method{display:block;margin-top:4px;font-size:8.5px;color:var(--muted);line-height:1.3;font-weight:700;text-transform:none;letter-spacing:0}
@media(max-width:1050px){#statsSec .sa-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media(max-width:800px){
 #aiInsightsSec .ip{grid-template-columns:minmax(110px,1fr) 68px 88px 58px!important;font-size:12px!important}
 #aiInsightsSec .sim{grid-template-columns:1fr 1fr!important}
 #statsSec .sa-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media(max-width:520px){
 #aiInsightsSec .ic{padding:15px!important}
 #aiInsightsSec .ip{grid-template-columns:minmax(94px,1fr) 52px 72px 48px!important;gap:5px!important;padding:9px 7px!important;font-size:11px!important}
 #aiInsightsSec .ip-head{font-size:8.5px!important}
 #aiInsightsSec .sim{grid-template-columns:1fr!important}
}
</style>`);
}

function patchInsights(){
 const sec=q('#aiInsightsSec');if(!sec)return;
 const cards=qa('#aiInsightsSec .ic');
 const pace=cards.find(c=>(c.querySelector('h2')?.textContent||'').trim()==='Booking pace');
 if(pace){
  if(!pace.querySelector('.insight-help'))pace.querySelector('h2')?.insertAdjacentHTML('afterend','<div class="insight-help">Confronta le notti già prenotate oggi con quante ne risultavano prenotate, alla stessa data, per lo stesso mese dell’anno scorso.</div>');
  const first=pace.querySelector('.ip:not(.ip-head)');
  if(first&&!pace.querySelector('.ip-head'))first.insertAdjacentHTML('beforebegin','<div class="ip ip-head" aria-hidden="true"><span>Mese</span><span>Oggi</span><span>Anno scorso</span><span>Δ</span></div>');
 }
 const sim=cards.find(c=>(c.querySelector('h2')?.textContent||'').trim()==='Simulatore decisionale');
 if(sim){
  if(!sim.querySelector('.insight-help'))sim.querySelector('h2')?.insertAdjacentHTML('afterend','<div class="insight-help">Modifica prezzo e notti attese per vedere immediatamente lordo, netto stimato e punto di pareggio.</div>');
  const labels={sm:'Mese',bp:'Prezzo attuale (€)',np:'Nuovo prezzo (€)',nn:'Notti attese'};
  Object.entries(labels).forEach(([id,label])=>{
   const el=q('#'+id);if(!el||el.closest('.sim-field'))return;
   const wrap=document.createElement('label');wrap.className='sim-field';wrap.setAttribute('for',id);
   const cap=document.createElement('span');cap.textContent=label;
   el.parentNode.insertBefore(wrap,el);wrap.append(cap,el);
  });
 }
}

function reorderTabs(){
 const tabs=q('.navtabs');if(!tabs)return;
 const wanted=['calendarSec','pricesSec','statsSec','aiSec','aiInsightsSec','reportImportSec'];
 const all=qa('.navtabs .navtab');if(!all.length)return;
 const byId=new Map(all.map(x=>[x.dataset.section,x]));
 const preferred=wanted.map(x=>byId.get(x)).filter(Boolean);
 if(preferred.length<3)return;
 const rest=all.filter(x=>!wanted.includes(x.dataset.section));
 [...preferred,...rest].forEach(x=>tabs.appendChild(x));
 const insight=byId.get('aiInsightsSec');if(insight)insight.childNodes[0]&&(insight.childNodes[0].nodeValue='AI Insight');
}

function parseMoney(text){
 const s=String(text||'').replace(/\s/g,'').replace(/[^0-9,.-]/g,'');
 if(!s)return null;
 const normalized=s.includes(',')?s.replace(/\./g,'').replace(',','.'):s;
 const n=Number(normalized);return Number.isFinite(n)?n:null;
}
function euro(n){return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(n)}
function kpiByLabel(container,label){return qa(container+' .sv-kpi').find(c=>(c.querySelector('span')?.textContent||'').trim()===label)||null}
function periodLabel(){
 const mode=q('#svMode')?.value||'year',y=q('#historyStatsYear')?.value||new Date().getFullYear();
 if(mode==='month'){
  const m=q('#svMonth'),name=m?.selectedOptions?.[0]?.textContent||'';return `${name} ${y}`.trim();
 }
 if(mode==='custom'){
  const a=q('#svStart')?.value,b=q('#svEnd')?.value;return a&&b?`${a} → ${b}`:'periodo personalizzato';
 }
 return `anno ${y}`;
}
function patchStatsCoverage(){
 const box=q('#statsSec .sa-coverage');if(!box)return;
 const p=periodLabel();
 const muted=box.querySelector('.sa-coverage-head .muted');if(muted&&muted.textContent!==`Copertura economica · ${p}`)muted.textContent=`Copertura economica · ${p}`;
 const h=box.querySelector('.sa-coverage-head h3');if(h&&h.textContent!==`Consuntivo vs prenotato · ${p}`)h.textContent=`Consuntivo vs prenotato · ${p}`;
 const status=box.querySelector('.sa-status.partial');if(status&&status.textContent!=='Periodo parziale')status.textContent='Periodo parziale';
 const grid=box.querySelector('.sa-grid');if(!grid)return;
 let net=grid.querySelector('.sa-net-indicative');if(!net){net=document.createElement('div');net.className='sa-box sa-net-indicative';net.innerHTML='<span>Netto indicativo</span><strong>—</strong><small class="sa-net-method">stima sul periodo selezionato</small>';grid.appendChild(net)}
 const grossBox=qa('#statsSec .sa-box').find(c=>(c.querySelector('span')?.textContent||'').trim()==='Lordo indicativo');
 const grossIndic=parseMoney(grossBox?.querySelector('strong')?.textContent);
 const actualGross=parseMoney(kpiByLabel('#statsSec .sv-econ','Lordo piattaforme')?.querySelector('strong')?.textContent);
 const actualNet=parseMoney(kpiByLabel('#statsSec .sv-econ','Netto finale')?.querySelector('strong')?.textContent);
 let ratio=actualGross&&actualGross>0&&actualNet!=null?actualNet/actualGross:null;
 if(ratio!=null&&(ratio<=0||ratio>1.05))ratio=null;
 const strong=net.querySelector('strong'),method=net.querySelector('.sa-net-method');
 if(grossIndic!=null&&ratio!=null){strong.textContent='≈ '+euro(grossIndic*ratio);method.textContent=`stima con resa netta consuntiva ${Math.round(ratio*100)}%`}
 else{strong.textContent='—';method.textContent='disponibile quando esiste un rapporto netto/lordo consuntivo'}
 const note=box.querySelector('.sa-note');
 if(note&&!note.dataset.netExplained){note.insertAdjacentText('beforeend',' Il netto indicativo applica al lordo indicativo il rapporto netto/lordo già consuntivato nel periodo selezionato.');note.dataset.netExplained='1'}
}

let queued=false;
function patchAll(){queued=false;ensureStyles();patchInsights();patchStatsCoverage();reorderTabs()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(patchAll)}
function boot(){patchAll();const root=q('#adminView')||document.body;new MutationObserver(schedule).observe(root,{childList:true,subtree:true});document.addEventListener('change',e=>{if(e.target?.matches?.('#svMode,#historyStatsYear,#svMonth,#svStart,#svEnd'))setTimeout(patchStatsCoverage,80)});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();