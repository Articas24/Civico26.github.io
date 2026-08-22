(()=>{
'use strict';
if(window.__civicoStatsEconDetail)return;window.__civicoStatsEconDetail=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)],DAY=86400000;
const months=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const euro=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
const pct=n=>`${Math.round(Number(n)||0)}%`;
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parse=s=>{const [y,m,d]=String(s).slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const days=(a,b)=>Math.max(0,Math.round((b-a)/DAY));
const plus=(d,n)=>new Date(d.getTime()+n*DAY);
let history=[],finance=[],loaded=false,loading=null;

function styles(){
  if(q('#econMonthDetailStyles'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="econMonthDetailStyles">
#statsSec .sv-stackcol{cursor:pointer;border-radius:10px;transition:background .15s ease,transform .15s ease}
#statsSec .sv-stackcol:active{transform:translateY(-1px)}
#statsSec .sv-stackcol.sv-econ-selected{background:#f1f7f4}
#statsSec .sv-stackcol.sv-econ-selected .sv-stack{outline:2px solid var(--green);outline-offset:2px}
#statsSec .sv-econ-month-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
#statsSec .sv-econ-month-head strong{font-size:15px;color:var(--ink)}
#statsSec .sv-econ-month-head span{font-size:10px;color:var(--muted)}
#statsSec .sv-econ-month-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
#statsSec .sv-econ-month-item{background:#fff;border:1px solid var(--line);border-radius:11px;padding:9px;min-width:0}
#statsSec .sv-econ-month-item span{display:block;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)}
#statsSec .sv-econ-month-item b{display:block;font-size:14px;color:var(--ink);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#statsSec .sv-econ-month-item.net b{color:#266548}
@media(max-width:760px){
 #statsSec .sv-econ-month-head{align-items:flex-start;flex-direction:column;gap:2px}
 #statsSec .sv-econ-month-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
 #statsSec .sv-econ-month-item{padding:8px}
 #statsSec .sv-econ-month-item b{font-size:13px}
}
</style>`);
}

async function loadData(){
  if(loaded)return true;
  if(loading)return loading;
  loading=(async()=>{
    try{
      const [h,f]=await Promise.all([
        sb.from('booking_history').select('source,status,start_date,end_date,nights,earnings'),
        sb.from('platform_finance_ledger').select('source,line_type,transaction_date,gross_amount,platform_commission,vat_platform_services,transaction_fee,tax_withheld,payout_amount')
      ]);
      if(h.error)throw h.error;if(f.error)throw f.error;
      history=h.data||[];finance=f.data||[];loaded=true;return true;
    }catch(err){console.error('Dettaglio mensile andamento economico:',err);return false}
  })();
  return loading;
}

function liveSource(e){
  if(['booking','airbnb','direct'].includes(e.source))return e.source;
  const f=(typeof feeds!=='undefined'?feeds:[]).find(x=>Number(x.id)===Number(e.external_feed_id));
  return f?.provider||e.source||'other';
}
function hist(){return history.filter(r=>r.status!=='cancelled'&&r.status!=='rejected')}
function reservations(){
  const h=hist();
  const live=(typeof entries!=='undefined'?entries:[]).filter(e=>e.status==='booked').map(e=>({...e,source:liveSource(e)}));
  return [...h,...live.filter(e=>!h.some(x=>x.source===e.source&&x.start_date===e.start_date&&x.end_date===e.end_date))];
}
function overlap(r,start,end){return Math.max(0,days(new Date(Math.max(parse(r.start_date),start)),new Date(Math.min(parse(r.end_date),end))))}
function uniqueDates(rows,start,end){
  const out=new Set();
  rows.forEach(r=>{let d=new Date(Math.max(parse(r.start_date),start));const stop=Math.min(parse(r.end_date),end);while(d<stop){out.add(key(d));d=plus(d,1)}});
  return out;
}
function blockedDates(start,end){
  const out=new Set();
  (typeof entries!=='undefined'?entries:[]).filter(e=>e.status==='blocked').forEach(r=>{let d=new Date(Math.max(parse(r.start_date),start));const stop=Math.min(parse(r.end_date),end);while(d<stop){out.add(key(d));d=plus(d,1)}});
  return out;
}
function monthStats(start,end){
  const res=reservations().filter(r=>parse(r.start_date)<end&&parse(r.end_date)>start);
  const occupied=uniqueDates(res,start,end),blocked=blockedDates(start,end);
  blocked.forEach(k=>occupied.has(k)&&blocked.delete(k));
  const sellable=Math.max(1,days(start,end)-blocked.size),occ=occupied.size/sellable*100;
  const revRows=hist().filter(r=>r.earnings!==null&&r.earnings!==undefined&&parse(r.start_date)<end&&parse(r.end_date)>start);
  const revNights=revRows.reduce((n,r)=>n+overlap(r,start,end),0),adrNights=revNights||occupied.size;
  const ks=key(start),ke=key(end),detail=finance.filter(r=>r.line_type!=='annual_tax_summary'&&r.transaction_date>=ks&&r.transaction_date<ke);
  const payouts=detail.filter(r=>r.line_type==='reservation_payout');
  const gross=payouts.reduce((n,r)=>n+(Number(r.gross_amount)||0),0);
  const costs=detail.reduce((n,r)=>n+(Number(r.platform_commission)||0)+(Number(r.vat_platform_services)||0)+(Number(r.transaction_fee)||0),0);
  const tax=detail.reduce((n,r)=>n+(Number(r.tax_withheld)||0),0);
  const net=detail.length?gross-costs-tax:null;
  return{occupied:occupied.size,sellable,occ,gross,net,adrGross:adrNights&&gross?gross/adrNights:null,adrNet:adrNights&&net!==null?net/adrNights:null};
}

function economicCard(){return qa('#statsSec .sv-card').find(c=>(c.querySelector('h2')?.textContent||'').trim()==='Andamento economico')||null}
function rangeForColumn(col){
  const card=economicCard(),cols=card?[...card.querySelectorAll('.sv-stackcol')]:[],idx=cols.indexOf(col);if(idx<0)return null;
  const mode=q('#svMode')?.value||'year';
  if(mode==='year'){
    const y=Number(q('#historyStatsYear')?.value)||new Date().getFullYear();
    return{start:new Date(y,idx,1),end:new Date(y,idx+1,1),label:`${months[idx]} ${y}`,kind:'month'};
  }
  if(mode==='month'){
    const y=Number(q('#historyStatsYear')?.value)||new Date().getFullYear(),m=(Number(q('#svMonth')?.value)||1)-1,d=idx+1;
    return{start:new Date(y,m,d),end:new Date(y,m,d+1),label:new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m,d)),kind:'day'};
  }
  const svStart=q('#svStart')?.value,svEnd=q('#svEnd')?.value;if(!svStart||!svEnd)return null;
  const start=parse(svStart),end=plus(parse(svEnd),1),total=days(start,end);
  if(total<=45){const s=plus(start,idx);return{start:s,end:plus(s,1),label:new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric'}).format(s),kind:'day'}}
  let cursor=new Date(start.getFullYear(),start.getMonth(),1);for(let i=0;i<idx;i++)cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
  const next=new Date(cursor.getFullYear(),cursor.getMonth()+1,1),s=new Date(Math.max(cursor,start)),e=new Date(Math.min(next,end));
  return{start:s,end:e,label:`${months[cursor.getMonth()]} ${cursor.getFullYear()}`,kind:'month'};
}
function renderDetail(note,period,m){
  note.innerHTML=`<div class="sv-econ-month-head"><strong>${period.label}</strong><span>Tocca un'altra colonna per confrontare a colpo d'occhio</span></div><div class="sv-econ-month-grid"><div class="sv-econ-month-item"><span>Notti prenotate</span><b>${m.occupied} / ${m.sellable}</b></div><div class="sv-econ-month-item"><span>Occupazione</span><b>${pct(m.occ)}</b></div><div class="sv-econ-month-item"><span>ADR lordo</span><b>${m.adrGross===null?'—':euro(m.adrGross)}</b></div><div class="sv-econ-month-item net"><span>ADR netto</span><b>${m.adrNet===null?'—':euro(m.adrNet)}</b></div><div class="sv-econ-month-item"><span>Lordo piattaforme</span><b>${m.gross?euro(m.gross):'—'}</b></div><div class="sv-econ-month-item net"><span>Netto finale</span><b>${m.net===null?'—':euro(m.net)}</b></div></div>`;
}
async function selectColumn(col){
  const card=economicCard(),note=card?.querySelector('.sv-note'),period=rangeForColumn(col);if(!card||!note||!period)return;
  qa('#statsSec .sv-stackcol').forEach(x=>x.classList.toggle('sv-econ-selected',x===col));
  note.innerHTML='<span>Caricamento dettaglio…</span>';
  if(!await loadData()){note.textContent='Impossibile caricare il dettaglio del periodo.';return}
  renderDetail(note,period,monthStats(period.start,period.end));
}
function boot(){
  styles();loadData();
  document.addEventListener('click',e=>{const col=e.target.closest('#statsSec .sv-stackcol');if(col&&col.closest('.sv-card')===economicCard())selectColumn(col)});
}
boot();
})();
