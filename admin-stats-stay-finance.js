(()=>{
'use strict';
if(window.__civicoStayFinance)return;window.__civicoStayFinance=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)],DAY=86400000;
const months=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const shortMonths=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const euro2=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
const euro0=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
const num=n=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:1}).format(Number(n)||0);
const parse=s=>{const [y,m,d]=String(s||'').slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const plus=(d,n)=>new Date(d.getTime()+n*DAY);
const days=(a,b)=>Math.max(0,Math.round((b-a)/DAY));
const periodPolicy=window.CivicoStatsPeriods;
let finance=[],history=[],normal=[],loaded=false,loading=null,scheduled=false;

function liveSource(e){
  if(['booking','airbnb','direct'].includes(e.source))return e.source;
  const f=(typeof feeds!=='undefined'?feeds:[]).find(x=>Number(x.id)===Number(e.external_feed_id));
  return f?.provider||e.source||'other';
}
function historyRows(){return history.filter(r=>r.status!=='cancelled'&&r.status!=='rejected')}
function allReservations(){
  const h=historyRows().map(r=>({...r,source:r.source||'other'}));
  const live=(typeof entries!=='undefined'?entries:[]).filter(e=>e.status==='booked').map(e=>({...e,source:liveSource(e)}));
  return [...h,...live.filter(e=>!h.some(r=>r.source===e.source&&r.start_date===e.start_date&&r.end_date===e.end_date))];
}
function overlap(start,end,r){
  const a=new Date(Math.max(start.getTime(),r.start.getTime())),b=new Date(Math.min(end.getTime(),r.end.getTime()));
  return Math.max(0,days(a,b));
}
function spanFor(row){
  if(row.stay_start){
    const start=parse(row.stay_start),rawEnd=row.stay_end?parse(row.stay_end):plus(start,1),end=rawEnd>start?rawEnd:plus(start,1);
    return{start,end};
  }
  const d=parse(row.stay_end||row.transaction_date);
  return{start:d,end:plus(d,1)};
}
function normalizeFinance(){
  const payouts=finance.filter(r=>r.line_type==='reservation_payout').map((r,i)=>({...r,__idx:i,__extraTax:0,__extraPayout:0}));
  const groups=new Map();
  payouts.forEach(r=>{const k=`${r.source}|${r.transaction_date}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)});
  const groupList=[...groups.entries()].map(([k,rows])=>{const [source,transaction_date]=k.split('|');return{source,transaction_date,rows,date:parse(transaction_date)}});
  const matchedTax=new Set();
  finance.filter(r=>r.line_type==='tax_withholding_adjustment').forEach(t=>{
    const target=parse(t.stay_end||t.transaction_date),candidates=groupList.filter(g=>g.source===t.source).map(g=>({...g,dist:Math.abs(g.date.getTime()-target.getTime())/DAY})).sort((a,b)=>a.dist-b.dist||a.date-b.date),best=candidates[0];
    if(!best||best.dist>2)return;
    matchedTax.add(t.id??`${t.source}|${t.external_ref||''}|${t.transaction_date}|${t.tax_withheld}`);
    const totalGross=best.rows.reduce((n,r)=>n+(Number(r.gross_amount)||0),0),den=totalGross||best.rows.length||1;
    best.rows.forEach(r=>{const share=totalGross?(Number(r.gross_amount)||0)/den:1/den;r.__extraTax+=(Number(t.tax_withheld)||0)*share;r.__extraPayout+=(Number(t.payout_amount)||0)*share});
  });
  const out=payouts.map(r=>{const s=spanFor(r);return{source:r.source,start:s.start,end:s.end,gross:Number(r.gross_amount)||0,commission:Number(r.platform_commission)||0,vat:Number(r.vat_platform_services)||0,fee:Number(r.transaction_fee)||0,tax:(Number(r.tax_withheld)||0)+r.__extraTax,payout:(Number(r.payout_amount)||0)+r.__extraPayout,kind:'reservation'}});
  finance.filter(r=>r.line_type!=='reservation_payout'&&r.line_type!=='annual_tax_summary').forEach(r=>{
    const taxKey=r.id??`${r.source}|${r.external_ref||''}|${r.transaction_date}|${r.tax_withheld}`;
    if(r.line_type==='tax_withholding_adjustment'&&matchedTax.has(taxKey))return;
    const s=spanFor(r);out.push({source:r.source,start:s.start,end:s.end,gross:Number(r.gross_amount)||0,commission:Number(r.platform_commission)||0,vat:Number(r.vat_platform_services)||0,fee:Number(r.transaction_fee)||0,tax:Number(r.tax_withheld)||0,payout:Number(r.payout_amount)||0,kind:r.line_type||'adjustment'});
  });
  normal=out;
}
function rowWeight(row,r){const total=Math.max(1,days(row.start,row.end)),ov=overlap(row.start,row.end,r);return ov/total}
function fullYear(r){return r.start.getMonth()===0&&r.start.getDate()===1&&r.end.getFullYear()===r.start.getFullYear()+1&&r.end.getMonth()===0&&r.end.getDate()===1}
function financeRange(r){
  const rows=normal.map(x=>({x,w:rowWeight(x,r)})).filter(z=>z.w>0);
  const sourceStats=source=>{
    const a=rows.filter(z=>z.x.source===source);
    if(a.length){const sum=k=>a.reduce((n,z)=>n+(Number(z.x[k])||0)*z.w,0);return{mode:'detail',gross:sum('gross'),commission:sum('commission'),vat:sum('vat'),fee:sum('fee'),tax:sum('tax'),payout:sum('payout')}}
    const annual=fullYear(r)?finance.find(x=>x.line_type==='annual_tax_summary'&&x.source===source&&String(x.transaction_date).startsWith(String(r.start.getFullYear()))):null;
    return annual?{mode:'annual',gross:Number(annual.gross_amount)||0,commission:null,vat:null,fee:null,tax:Number(annual.tax_withheld)||0,payout:null}:{mode:'none',gross:0,commission:0,vat:0,fee:0,tax:0,payout:null};
  };
  const b=sourceStats('booking'),a=sourceStats('airbnb'),gross=b.gross+a.gross,knownCost=b.mode==='detail'||a.mode==='detail',cost=(Number(b.commission)||0)+(Number(b.vat)||0)+(Number(b.fee)||0)+(Number(a.commission)||0)+(Number(a.vat)||0)+(Number(a.fee)||0),tax=(Number(b.tax)||0)+(Number(a.tax)||0),payout=(Number(b.payout)||0)+(Number(a.payout)||0),netFinal=knownCost?gross-cost-tax:null;
  return{b,a,gross,cost,tax,payout,netFinal,knownCost,detailCount:rows.length};
}
function currentRange(){
  const mode=q('#svMode')?.value||'year';
  if(mode==='month'){const y=Number(q('#historyStatsYear')?.value)||new Date().getFullYear(),m=Number(q('#svMonth')?.value)||1;return{start:new Date(y,m-1,1),end:new Date(y,m,1)}}
  if(mode==='custom'){const a=q('#svStart')?.value,b=q('#svEnd')?.value;if(a&&b){const s=parse(a),e=plus(parse(b),1);return{start:s,end:e>s?e:plus(s,1)}}}
  const y=Number(q('#historyStatsYear')?.value)||new Date().getFullYear();return{start:new Date(y,0,1),end:new Date(y+1,0,1)};
}
function economicNights(r){return historyRows().filter(x=>x.earnings!==null&&x.earnings!==undefined&&parse(x.start_date)<r.end&&parse(x.end_date)>r.start).reduce((n,x)=>n+overlap(parse(x.start_date),parse(x.end_date),r),0)}
function occupiedDates(r){const s=new Set();allReservations().filter(x=>parse(x.start_date)<r.end&&parse(x.end_date)>r.start).forEach(x=>{let d=new Date(Math.max(parse(x.start_date).getTime(),r.start.getTime()));const stop=Math.min(parse(x.end_date).getTime(),r.end.getTime());while(d.getTime()<stop){s.add(key(d));d=plus(d,1)}});return s}
function blockedDates(r){const s=new Set();(typeof entries!=='undefined'?entries:[]).filter(e=>e.status==='blocked').forEach(x=>{let d=new Date(Math.max(parse(x.start_date).getTime(),r.start.getTime()));const stop=Math.min(parse(x.end_date).getTime(),r.end.getTime());while(d.getTime()<stop){s.add(key(d));d=plus(d,1)}});return s}
function occupancy(r){const occ=occupiedDates(r),blocked=blockedDates(r);blocked.forEach(k=>occ.has(k)&&blocked.delete(k));const sell=Math.max(1,days(r.start,r.end)-blocked.size);return{occupied:occ.size,sellable:sell,pct:occ.size/sell*100}}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function findKpi(container,title){return [...(container?.querySelectorAll(':scope > .sv-kpi')||[])].find(c=>(c.querySelector('span')?.textContent||'').trim()===title)||null}
function patchKpis(r,f){
  const top=q('#statsSec .sv-kpis'),n=economicNights(r)||occupancy(r).occupied,adrG=n&&f.gross?f.gross/n:null,adrN=n&&f.netFinal!==null?f.netFinal/n:null;
  const g=findKpi(top,'ADR lordo'),nn=findKpi(top,'ADR netto');
  if(g){setText(g.querySelector('strong'),adrG===null?'—':euro2(adrG));setText(g.querySelector('small'),`lordo / ${n||'—'} notti economiche`)}
  if(nn)setText(nn.querySelector('strong'),adrN===null?'—':euro2(adrN));
  const econ=q('#statsSec .sv-econ');
  const vals={'Lordo piattaforme':f.gross?euro2(f.gross):'—','Netto finale':f.netFinal===null?'—':euro2(f.netFinal),'Costi piattaforme':f.knownCost?euro2(f.cost):'—','Cedolare secca':f.gross||f.tax?euro2(f.tax):'—'};
  Object.entries(vals).forEach(([k,v])=>setText(findKpi(econ,k)?.querySelector('strong'),v));
}
function platformCard(name){return qa('#statsSec .sv-platform').find(c=>(c.querySelector('h3')?.textContent||'').toLowerCase().includes(name.toLowerCase()))||null}
function patchPlatform(name,s){
  const card=platformCard(name);if(!card)return;
  const set=(label,val)=>{const row=[...card.querySelectorAll('.sv-row')].find(x=>(x.querySelector('span')?.textContent||'').trim().toLowerCase()===label.toLowerCase());setText(row?.querySelector('b'),val)};
  const cost=(Number(s.commission)||0)+(Number(s.vat)||0)+(Number(s.fee)||0);
  set('Lordo report',s.mode==='none'?'—':euro2(s.gross));
  set('Commissioni',s.mode==='annual'?'—':euro2(s.commission));
  set('IVA servizi',s.mode==='annual'?'—':euro2(s.vat));
  set('Costi transazione',s.mode==='annual'?'—':euro2(s.fee));
  set('Costi piattaforma totali',s.mode==='annual'?'—':euro2(cost));
  set('Cedolare secca',euro2(s.tax));
  set('Netto accreditato',s.payout===null?'—':euro2(s.payout));
}
function buckets(r){
  const out=[],total=days(r.start,r.end);
  if(total<=45){for(let d=new Date(r.start);d<r.end;d=plus(d,1)){const e=plus(d,1),f=financeRange({start:d,end:e});out.push({label:String(d.getDate()),start:new Date(d),end:e,f})}return out}
  let d=new Date(r.start.getFullYear(),r.start.getMonth(),1);while(d<r.end){const start=new Date(Math.max(d.getTime(),r.start.getTime())),next=new Date(d.getFullYear(),d.getMonth()+1,1),end=new Date(Math.min(next.getTime(),r.end.getTime())),f=financeRange({start,end});out.push({label:shortMonths[d.getMonth()],start,end,f});d=next}return out;
}
function patchChart(r){
  const card=qa('#statsSec .sv-card').find(c=>(c.querySelector('h2')?.textContent||'').trim()==='Andamento economico');if(!card)return;
  const sub=card.querySelector('.sv-sub');setText(sub,'Netto finale, costi piattaforma e cedolare attribuiti alle date di soggiorno.');
  const chart=card.querySelector('.sv-stacked');if(!chart)return;
  const sig=`${key(r.start)}|${key(r.end)}|${normal.length}`;if(chart.dataset.stayFinanceSig===sig)return;
  const data=buckets(r),max=Math.max(1,...data.map(x=>Math.max(0,x.f.netFinal??0)+Math.max(0,x.f.cost)+Math.max(0,x.f.tax)));
  chart.style.gridTemplateColumns=`repeat(${Math.max(data.length,1)},minmax(30px,1fr))`;
  chart.innerHTML=data.map(x=>{const net=Math.max(0,x.f.netFinal??0),cost=Math.max(0,x.f.cost),tax=Math.max(0,x.f.tax),t=net+cost+tax,h=t/max*100,label=x.label;return`<div class="sv-stackcol" data-sf-start="${key(x.start)}" data-sf-end="${key(x.end)}" data-sf-label="${label}" title="${label} · Netto ${euro2(net)} · Costi ${euro2(cost)} · Cedolare ${euro2(tax)}"><div class="sv-value">${t?euro0(t):''}</div><div class="sv-stack" style="height:${Math.max(t?5:1,h)}%"><i class="sv-seg net" style="height:${t?net/t*100:0}%"></i><i class="sv-seg cost" style="height:${t?cost/t*100:0}%"></i><i class="sv-seg tax" style="height:${t?tax/t*100:0}%"></i></div><div class="sv-label">${label}</div></div>`}).join('');
  chart.dataset.stayFinanceSig=sig;
}
function deltaHtml(a,b,type='pct'){const v=(Number(a)||0)-(Number(b)||0),cls=v>0?'up':v<0?'down':'';if(type==='pts')return`<span class="sv-delta ${cls}">${v>0?'+':''}${num(v)} pt</span>`;const p=b?((a-b)/Math.abs(b))*100:0;return`<span class="sv-delta ${cls}">${v>0?'+':''}${num(p)}%</span>`}
function shiftYear(r,d){const s=new Date(r.start),e=new Date(r.end);s.setFullYear(s.getFullYear()+d);e.setFullYear(e.getFullYear()+d);return{start:s,end:e}}
function compareRanges(){
  const mode=q('#svCmpMode')?.value||'same';if(mode==='same'){const a=currentRange();return periodPolicy?.sameRanges(a,(q('#svMode')?.value||'year')==='year')||[a,shiftYear(a,-1)]}
  if(mode==='year'){const a=Number(q('#svCmpYearA')?.value),b=Number(q('#svCmpYearB')?.value);return periodPolicy?.yearRanges(a,b)||[{start:new Date(a,0,1),end:new Date(a+1,0,1)},{start:new Date(b,0,1),end:new Date(b+1,0,1)}]}
  if(mode==='month'){const a=Number(q('#svCmpYearA')?.value),b=Number(q('#svCmpYearB')?.value),m=Number(q('#svCmpMonth')?.value)||1;return periodPolicy?.monthRanges(a,b,m)||[{start:new Date(a,m-1,1),end:new Date(a,m,1)},{start:new Date(b,m-1,1),end:new Date(b,m,1)}]}
  const sa=q('#svCmpStartA')?.value,ea=q('#svCmpEndA')?.value,sb=q('#svCmpStartB')?.value,eb=q('#svCmpEndB')?.value;if(sa&&ea&&sb&&eb)return[{start:parse(sa),end:plus(parse(ea),1)},{start:parse(sb),end:plus(parse(eb),1)}];return null;
}
function patchCompare(){
  const body=q('#statsSec .sv-compare-body');if(!body)return;const rr=compareRanges();if(!rr)return;const [a,b]=rr,fa=financeRange(a),fb=financeRange(b),oa=occupancy(a),ob=occupancy(b),na=economicNights(a)||oa.occupied,nb=economicNights(b)||ob.occupied,adrGa=na&&fa.gross?fa.gross/na:null,adrGb=nb&&fb.gross?fb.gross/nb:null,adrNa=na&&fa.netFinal!==null?fa.netFinal/na:null,adrNb=nb&&fb.netFinal!==null?fb.netFinal/nb:null;
  const vals={
    'Lordo piattaforme':[fa.gross,fb.gross,euro0,deltaHtml],
    'Netto finale':[fa.netFinal,fb.netFinal,euro0,deltaHtml],
    'ADR lordo':[adrGa,adrGb,euro0,deltaHtml],
    'ADR netto':[adrNa,adrNb,euro0,deltaHtml]
  };
  qa('#statsSec .sv-trow').forEach(row=>{const label=(row.querySelector('.sv-metric')?.textContent||'').trim(),v=vals[label];if(!v)return;const cells=row.children,aVal=v[0],bVal=v[1],fmt=v[2];setText(cells[1],aVal===null?'—':fmt(aVal));setText(cells[2],bVal===null?'—':fmt(bVal));if(cells[3]){const html=aVal===null||bVal===null?'—':deltaHtml(aVal,bVal);if(cells[3].innerHTML!==html)cells[3].innerHTML=html}});
  const note=body.querySelector(':scope > .sv-note');setText(note,'Le metriche operative e i valori economici sono attribuiti alle date di soggiorno. Le trattenute Booking registrate successivamente vengono ricondotte al payout e al soggiorno di competenza.');
}
function icon(name){const p=name==='Booking'?'bookingdotcom/003580':'airbnb/FF5A5F';return`<img class="ota-brand-icon" src="https://cdn.simpleicons.org/${p}" alt="" aria-hidden="true">`}
function patchBreakdown(f){const box=q('#statsSec #svBreakdown');if(!box)return;const map={gross:['Lordo','gross'],net:['Netto finale','netFinal'],cost:['Costi piattaforma','cost'],tax:['Cedolare secca','tax']},kind=box.dataset.kind||'gross',[label,k]=map[kind]||map.gross,one=(name,s)=>`<div><span>${icon(name)}${label} ${name}</span><b>${s.mode==='none'?'—':euro2(k==='netFinal'?(s.gross-(Number(s.commission)||0)-(Number(s.vat)||0)-(Number(s.fee)||0)-(Number(s.tax)||0)):s[k])}</b></div>`,html=one('Booking',f.b)+one('Airbnb',f.a);if(box.innerHTML!==html)box.innerHTML=html}
function selectedDetail(col){
  const start=parse(col.dataset.sfStart),end=parse(col.dataset.sfEnd),f=financeRange({start,end}),o=occupancy({start,end}),n=economicNights({start,end})||o.occupied,adrG=n&&f.gross?f.gross/n:null,adrN=n&&f.netFinal!==null?f.netFinal/n:null;
  const label=col.dataset.sfLabel||'';const mode=q('#svMode')?.value||'year';let title=label;if(mode==='year'){const y=Number(q('#historyStatsYear')?.value)||start.getFullYear(),idx=start.getMonth();title=`${months[idx]} ${y}`}else if(days(start,end)===1)title=new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric'}).format(start);else title=`${months[start.getMonth()]} ${start.getFullYear()}`;
  const card=col.closest('.sv-card'),note=card?.querySelector('.sv-note');if(!note)return;
  qa('#statsSec .sv-stackcol').forEach(x=>x.classList.toggle('sv-econ-selected',x===col));note.style.display='';note.innerHTML=`<div class="sv-econ-month-head"><strong>${title}</strong><span>Tocca un'altra colonna per confrontare a colpo d'occhio</span></div><div class="sv-econ-month-grid"><div class="sv-econ-month-item"><span>Notti prenotate</span><b>${o.occupied} / ${o.sellable}</b></div><div class="sv-econ-month-item"><span>Occupazione</span><b>${Math.round(o.pct)}%</b></div><div class="sv-econ-month-item"><span>ADR lordo</span><b>${adrG===null?'—':euro2(adrG)}</b></div><div class="sv-econ-month-item net"><span>ADR netto</span><b>${adrN===null?'—':euro2(adrN)}</b></div><div class="sv-econ-month-item"><span>Lordo piattaforme</span><b>${f.gross?euro2(f.gross):'—'}</b></div><div class="sv-econ-month-item net"><span>Netto finale</span><b>${f.netFinal===null?'—':euro2(f.netFinal)}</b></div></div>`;
}
function patchAll(){if(!loaded)return;const r=currentRange(),f=financeRange(r);patchKpis(r,f);patchPlatform('Booking',f.b);patchPlatform('Airbnb',f.a);patchChart(r);patchCompare();patchBreakdown(f)}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchAll()})}
async function loadData(){
  if(loaded)return true;if(loading)return loading;
  loading=(async()=>{try{const [fr,hr]=await Promise.all([sb.from('platform_finance_ledger').select('id,source,external_ref,line_type,transaction_date,stay_start,stay_end,gross_amount,platform_commission,vat_platform_services,transaction_fee,tax_withheld,payout_amount,currency,raw_origin'),sb.from('booking_history').select('source,status,start_date,end_date,nights,earnings')]);if(fr.error)throw fr.error;if(hr.error)throw hr.error;finance=fr.data||[];history=hr.data||[];normalizeFinance();loaded=true;schedule();return true}catch(err){console.error('Statistiche per data soggiorno:',err);return false}})();return loading;
}
function boot(){
  setTimeout(loadData,350);
  document.addEventListener('click',e=>{const col=e.target.closest('#statsSec .sv-stackcol[data-sf-start]');if(!col)return;if(col.classList.contains('sv-econ-selected'))return;e.preventDefault();e.stopImmediatePropagation();selectedDetail(col)},true);
  document.addEventListener('click',e=>{if(e.target.closest('.navtab[data-section="statsSec"]'))setTimeout(()=>{loadData();schedule()},120);if(e.target.closest('#statsSec .sv-clickable-kpi,#statsSec #svCmpToggle'))setTimeout(schedule,40)});
  document.addEventListener('change',e=>{if(e.target.closest('#statsSec'))setTimeout(schedule,30)});
  window.addEventListener('civico-stats-range-change',schedule);
  const root=q('#statsSec')||document.body;new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
}
boot();
})();
