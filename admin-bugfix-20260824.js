(()=>{
'use strict';
if(window.__civicoBugfix20260824)return;window.__civicoBugfix20260824=true;
const q=s=>document.querySelector(s),DAY=86400000;
let financeRows=null,financeLoading=null,refreshTimer=null;

function styles(){
  if(q('#civicoBugfix20260824Styles'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="civicoBugfix20260824Styles">
@media(max-width:760px){
  /* La card ha overflow:hidden: sticky qui causava sovrapposizioni su Chrome Android. */
  #calendarSec .subtabs{
    position:static!important;
    top:auto!important;
    z-index:auto!important;
    margin:0 0 12px!important;
    padding:4px!important;
    background:#f5f8f7!important;
  }
  /* Il tab dice già quale form è aperto: il titolo duplicato creava anche il testo sovrapposto. */
  #calendarSec #blockPanel>h2,
  #calendarSec #bookingPanel>h2{display:none!important}
  #calendarSec #blockPanel,
  #calendarSec #bookingPanel{margin-top:0!important;padding-top:0!important}
}
</style>`);
}

function parseDate(s){
  const m=String(s||'').slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null;
}
function plus(d,n){return new Date(d.getTime()+n*DAY)}
function days(a,b){return Math.max(0,Math.round((b-a)/DAY))}
function euro(n){return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0)}

function currentRange(){
  const mode=q('#svMode')?.value||'year';
  const year=Number(q('#historyStatsYear')?.value)||new Date().getFullYear();
  if(mode==='month'){
    const month=Number(q('#svMonth')?.value)||1;
    return{start:new Date(year,month-1,1),end:new Date(year,month,1)};
  }
  if(mode==='custom'){
    const a=q('#svStart')?.value,b=q('#svEnd')?.value;
    const start=parseDate(a),last=parseDate(b);
    if(start&&last){const end=plus(last,1);return{start,end:end>start?end:plus(start,1)}}
  }
  return{start:new Date(year,0,1),end:new Date(year+1,0,1)};
}

function spanFor(row){
  let start,end;
  if(row.stay_start){
    start=parseDate(row.stay_start);
    end=parseDate(row.stay_end);
    if(start&&(!end||end<=start))end=plus(start,1);
  }else{
    start=parseDate(row.stay_end||row.transaction_date);
    if(start)end=plus(start,1);
  }
  return start&&end?{start,end}:null;
}

function overlapWeight(row,range){
  const span=spanFor(row);if(!span)return 0;
  const a=new Date(Math.max(span.start.getTime(),range.start.getTime()));
  const b=new Date(Math.min(span.end.getTime(),range.end.getTime()));
  const overlap=days(a,b),total=Math.max(1,days(span.start,span.end));
  return overlap/total;
}

function sourceCost(source,range){
  return (financeRows||[])
    .filter(r=>r.source===source&&r.line_type!=='annual_tax_summary')
    .reduce((sum,r)=>{
      const w=overlapWeight(r,range);if(!w)return sum;
      const cost=(Number(r.platform_commission)||0)+(Number(r.vat_platform_services)||0)+(Number(r.transaction_fee)||0);
      return sum+cost*w;
    },0);
}

async function loadFinance(){
  if(financeRows)return financeRows;
  if(financeLoading)return financeLoading;
  financeLoading=(async()=>{
    const {data,error}=await sb.from('platform_finance_ledger').select('source,line_type,transaction_date,stay_start,stay_end,platform_commission,vat_platform_services,transaction_fee');
    if(error)throw error;
    financeRows=data||[];
    return financeRows;
  })().finally(()=>{financeLoading=null});
  return financeLoading;
}

function costCard(){
  return [...document.querySelectorAll('#statsSec .sv-econ > .sv-kpi')].find(c=>(c.querySelector('span')?.textContent||'').trim()==='Costi piattaforme')||null;
}

function ensureBreakdown(){
  const econ=q('#statsSec .sv-econ');if(!econ)return null;
  let box=q('#statsSec #svBreakdown');
  if(!box){box=document.createElement('div');box.id='svBreakdown';box.className='sv-breakdown';econ.appendChild(box)}
  else if(box.parentElement!==econ)econ.appendChild(box);
  return box;
}

async function renderCostBreakdown(){
  const box=ensureBreakdown();if(!box)return;
  box.dataset.kind='cost-fixed';
  box.innerHTML='<div><span>Costi piattaforma Booking</span><b>…</b></div><div><span>Costi piattaforma Airbnb</span><b>…</b></div>';
  try{
    await loadFinance();
    if(!box.isConnected||box.dataset.kind!=='cost-fixed')return;
    const range=currentRange(),booking=sourceCost('booking',range),airbnb=sourceCost('airbnb',range);
    box.innerHTML=`<div><span>Costi piattaforma Booking</span><b>${euro(booking)}</b></div><div><span>Costi piattaforma Airbnb</span><b>${euro(airbnb)}</b></div>`;
  }catch(err){
    console.error('Dettaglio costi piattaforme:',err);
    if(box.isConnected&&box.dataset.kind==='cost-fixed')box.innerHTML='<div><span>Dettaglio costi</span><b>Errore caricamento</b></div>';
  }
}

function toggleCostBreakdown(){
  const old=q('#statsSec #svBreakdown');
  if(old?.dataset.kind==='cost-fixed'){old.remove();return}
  old?.remove();
  renderCostBreakdown();
}

function isCostCard(el){
  const card=el?.closest?.('#statsSec .sv-econ > .sv-kpi');
  return card&&card===costCard()?card:null;
}

/* Intercetta solo questa card prima del vecchio handler che ricavava i valori dal DOM. */
document.addEventListener('click',e=>{
  const card=isCostCard(e.target);if(!card)return;
  e.preventDefault();e.stopImmediatePropagation();toggleCostBreakdown();
},true);

document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const card=isCostCard(e.target);if(!card)return;
  e.preventDefault();e.stopImmediatePropagation();toggleCostBreakdown();
},true);

function refreshOpenBreakdown(){
  if(!q('#statsSec #svBreakdown[data-kind="cost-fixed"]'))return;
  clearTimeout(refreshTimer);refreshTimer=setTimeout(renderCostBreakdown,120);
}
document.addEventListener('change',e=>{if(e.target?.closest?.('#statsSec'))refreshOpenBreakdown()},true);
window.addEventListener('civico-stats-range-change',refreshOpenBreakdown);

styles();
})();
