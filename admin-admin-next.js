(()=>{
'use strict';
if(window.__civicoAdminNext)return;window.__civicoAdminNext=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)],DAY=86400000;
const months=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const parse=s=>{const [y,m,d]=String(s||'').slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const plus=(d,n)=>new Date(d.getTime()+n*DAY),days=(a,b)=>Math.max(0,Math.round((b-a)/DAY));
const euro=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
const euro2=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
const num=n=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:1}).format(Number(n)||0);
const periodPolicy=window.CivicoStatsPeriods;
let metric='net',finance=[],history=[],normal=[],loaded=false,loading=null,scheduled=false;

function styles(){if(q('#adminNextStyles'))return;document.head.insertAdjacentHTML('beforeend',`<style id="adminNextStyles">
.dash-open{display:none!important}
.request-delete{margin-left:4px}
.sv-cmp-chartbox{margin:12px 0 14px;padding:13px;border:1px solid var(--line);border-radius:14px;background:#fbfdfc}
.sv-cmp-charttop{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:8px}.sv-cmp-charttop h4{margin:0;font-size:15px}.sv-cmp-charttop .sv-sub{margin-top:2px}.sv-cmp-metric{width:190px}.sv-cmp-metric label{font-size:9px!important;margin:0 0 4px!important;text-transform:uppercase}.sv-cmp-metric select{padding:8px 9px}
.sv-cmp-legend{display:flex;gap:14px;flex-wrap:wrap;margin:7px 0 3px;font-size:10px;font-weight:800;color:var(--muted)}.sv-cmp-legend span{display:inline-flex;align-items:center;gap:5px}.sv-cmp-line-dot{width:9px;height:9px;border-radius:50%;display:inline-block}.sv-cmp-line-dot.a{background:#2f6f62}.sv-cmp-line-dot.b{background:#0b6edb}
.sv-cmp-svg{width:100%;height:auto;display:block;overflow:visible}.sv-cmp-axis{font:700 9px Heebo,system-ui,sans-serif;fill:#73827e}.sv-cmp-gridline{stroke:#e3ebe8;stroke-width:1}.sv-cmp-line-a{fill:none;stroke:#2f6f62;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.sv-cmp-line-b{fill:none;stroke:#0b6edb;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.sv-cmp-point-a{fill:#fff;stroke:#2f6f62;stroke-width:2}.sv-cmp-point-b{fill:#fff;stroke:#0b6edb;stroke-width:2}.sv-cmp-progress{display:flex;justify-content:space-between;color:var(--muted);font-size:9px;font-weight:800;margin:0 2px}.sv-cmp-help{font-size:9.5px;color:var(--muted);line-height:1.4;margin-top:7px}
@media(max-width:760px){.sv-cmp-charttop{align-items:stretch;flex-direction:column}.sv-cmp-metric{width:100%}.sv-cmp-chartbox{padding:10px}.sv-cmp-legend{gap:9px}}
</style>`)}

function patchDashboard(){
  const card=q('#dashRequestsCard');if(card){const label=card.querySelector('.dash-label'),sub=card.querySelector('.dash-sub');if(label)label.textContent='Richieste';if(sub&&/apri richieste/i.test(sub.textContent||''))sub.textContent='Nuove da gestire'}
  qa('#adminDashboard .dash-open').forEach(x=>x.remove());
}
function flash(text,type='ok'){
  const el=q('#requestMsg');if(!el)return;el.textContent=text;el.className=`msg show ${type}`;setTimeout(()=>{if(el.textContent===text)el.className='msg'},5000)
}
function canDeleteRequest(r){const today=key(new Date());return ['rejected','cancelled'].includes(r.status)||String(r.check_out||'')<today}
async function deleteRequest(r){
  const linked=r.status==='confirmed'?' La prenotazione/calendario eventualmente collegato non verrà cancellato.':'';
  if(!confirm(`Eliminare definitivamente la richiesta ${r.request_code}?${linked}`))return;
  const {data,error}=await sb.from('booking_requests').delete().eq('id',r.id).select('id');
  if(error)return flash('Eliminazione non riuscita: '+error.message,'error');
  if(!data?.length)return flash('La richiesta non è stata eliminata. Controlla i permessi admin.','error');
  await loadRequests();
  if(typeof renderRequests==='function')renderRequests();
  flash(`Richiesta ${r.request_code} eliminata.`,'ok');
}
function patchRequests(){
  if(typeof requests==='undefined')return;const cards=qa('#requestsList .admin-rich');
  cards.forEach((card,i)=>{const r=requests[i];if(!r||!canDeleteRequest(r)||card.querySelector('[data-request-delete]'))return;const actions=card.querySelector('.row-actions');if(!actions)return;const b=document.createElement('button');b.type='button';b.className='btn danger small request-delete';b.dataset.requestDelete=String(r.id);b.textContent='Elimina';b.title='Elimina definitivamente questa vecchia richiesta dal registro';b.onclick=()=>deleteRequest(r);actions.appendChild(b)})
}

function liveSource(e){if(['booking','airbnb','direct'].includes(e.source))return e.source;const f=(typeof feeds!=='undefined'?feeds:[]).find(x=>Number(x.id)===Number(e.external_feed_id));return f?.provider||e.source||'other'}
function historyRows(){return history.filter(r=>r.status!=='cancelled'&&r.status!=='rejected')}
function allReservations(){const h=historyRows().map(r=>({...r,source:r.source||'other'})),live=(typeof entries!=='undefined'?entries:[]).filter(e=>e.status==='booked').map(e=>({...e,source:liveSource(e)}));return[...h,...live.filter(e=>!h.some(r=>r.source===e.source&&r.start_date===e.start_date&&r.end_date===e.end_date))]}
function overlap(start,end,r){const a=new Date(Math.max(start.getTime(),r.start.getTime())),b=new Date(Math.min(end.getTime(),r.end.getTime()));return Math.max(0,days(a,b))}
function spanFor(row){if(row.stay_start){const start=parse(row.stay_start),rawEnd=row.stay_end?parse(row.stay_end):plus(start,1),end=rawEnd>start?rawEnd:plus(start,1);return{start,end}}const d=parse(row.stay_end||row.transaction_date);return{start:d,end:plus(d,1)}}
function normalizeFinance(){
  const payouts=finance.filter(r=>r.line_type==='reservation_payout').map((r,i)=>({...r,__idx:i,__extraTax:0,__extraPayout:0})),groups=new Map();
  payouts.forEach(r=>{const k=`${r.source}|${r.transaction_date}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)});
  const groupList=[...groups.entries()].map(([k,rows])=>{const [source,transaction_date]=k.split('|');return{source,transaction_date,rows,date:parse(transaction_date)}}),matchedTax=new Set();
  finance.filter(r=>r.line_type==='tax_withholding_adjustment').forEach(t=>{const target=parse(t.stay_end||t.transaction_date),candidates=groupList.filter(g=>g.source===t.source).map(g=>({...g,dist:Math.abs(g.date.getTime()-target.getTime())/DAY})).sort((a,b)=>a.dist-b.dist||a.date-b.date),best=candidates[0];if(!best||best.dist>2)return;matchedTax.add(t.id??`${t.source}|${t.external_ref||''}|${t.transaction_date}|${t.tax_withheld}`);const totalGross=best.rows.reduce((n,r)=>n+(Number(r.gross_amount)||0),0),den=totalGross||best.rows.length||1;best.rows.forEach(r=>{const share=totalGross?(Number(r.gross_amount)||0)/den:1/den;r.__extraTax+=(Number(t.tax_withheld)||0)*share;r.__extraPayout+=(Number(t.payout_amount)||0)*share})});
  const out=payouts.map(r=>{const s=spanFor(r);return{source:r.source,start:s.start,end:s.end,gross:Number(r.gross_amount)||0,commission:Number(r.platform_commission)||0,vat:Number(r.vat_platform_services)||0,fee:Number(r.transaction_fee)||0,tax:(Number(r.tax_withheld)||0)+r.__extraTax,payout:(Number(r.payout_amount)||0)+r.__extraPayout,kind:'reservation'}});
  finance.filter(r=>r.line_type!=='reservation_payout'&&r.line_type!=='annual_tax_summary').forEach(r=>{const taxKey=r.id??`${r.source}|${r.external_ref||''}|${r.transaction_date}|${r.tax_withheld}`;if(r.line_type==='tax_withholding_adjustment'&&matchedTax.has(taxKey))return;const s=spanFor(r);out.push({source:r.source,start:s.start,end:s.end,gross:Number(r.gross_amount)||0,commission:Number(r.platform_commission)||0,vat:Number(r.vat_platform_services)||0,fee:Number(r.transaction_fee)||0,tax:Number(r.tax_withheld)||0,payout:Number(r.payout_amount)||0,kind:r.line_type||'adjustment'})});normal=out
}
function rowWeight(row,r){const total=Math.max(1,days(row.start,row.end));return overlap(row.start,row.end,r)/total}
function fullYear(r){return r.start.getMonth()===0&&r.start.getDate()===1&&r.end.getFullYear()===r.start.getFullYear()+1&&r.end.getMonth()===0&&r.end.getDate()===1}
function financeRange(r){
  const rows=normal.map(x=>({x,w:rowWeight(x,r)})).filter(z=>z.w>0);const sourceStats=source=>{const a=rows.filter(z=>z.x.source===source);if(a.length){const sum=k=>a.reduce((n,z)=>n+(Number(z.x[k])||0)*z.w,0);return{mode:'detail',gross:sum('gross'),commission:sum('commission'),vat:sum('vat'),fee:sum('fee'),tax:sum('tax'),payout:sum('payout')}}const annual=fullYear(r)?finance.find(x=>x.line_type==='annual_tax_summary'&&x.source===source&&String(x.transaction_date).startsWith(String(r.start.getFullYear()))):null;return annual?{mode:'annual',gross:Number(annual.gross_amount)||0,commission:null,vat:null,fee:null,tax:Number(annual.tax_withheld)||0,payout:null}:{mode:'none',gross:0,commission:0,vat:0,fee:0,tax:0,payout:null}};
  const b=sourceStats('booking'),a=sourceStats('airbnb'),gross=b.gross+a.gross,knownCost=b.mode==='detail'||a.mode==='detail',cost=(Number(b.commission)||0)+(Number(b.vat)||0)+(Number(b.fee)||0)+(Number(a.commission)||0)+(Number(a.vat)||0)+(Number(a.fee)||0),tax=(Number(b.tax)||0)+(Number(a.tax)||0),netFinal=knownCost?gross-cost-tax:null;return{gross,cost,tax,netFinal,knownCost}
}
function occupiedDates(r){const s=new Set();allReservations().filter(x=>parse(x.start_date)<r.end&&parse(x.end_date)>r.start).forEach(x=>{let d=new Date(Math.max(parse(x.start_date).getTime(),r.start.getTime()));const stop=Math.min(parse(x.end_date).getTime(),r.end.getTime());while(d.getTime()<stop){s.add(key(d));d=plus(d,1)}});return s}
function blockedDates(r){const s=new Set();(typeof entries!=='undefined'?entries:[]).filter(e=>e.status==='blocked').forEach(x=>{let d=new Date(Math.max(parse(x.start_date).getTime(),r.start.getTime()));const stop=Math.min(parse(x.end_date).getTime(),r.end.getTime());while(d.getTime()<stop){s.add(key(d));d=plus(d,1)}});return s}
function occupancy(r){const occ=occupiedDates(r),blocked=blockedDates(r);blocked.forEach(k=>occ.has(k)&&blocked.delete(k));const sell=Math.max(1,days(r.start,r.end)-blocked.size);return{occupied:occ.size,sellable:sell,pct:occ.size/sell*100}}
function economicNights(r){return historyRows().filter(x=>x.earnings!==null&&x.earnings!==undefined&&parse(x.start_date)<r.end&&parse(x.end_date)>r.start).reduce((n,x)=>n+overlap(parse(x.start_date),parse(x.end_date),r),0)}
function stays(r){return allReservations().filter(x=>parse(x.start_date)>=r.start&&parse(x.start_date)<r.end).length}
function currentRange(){const mode=q('#svMode')?.value||'year';if(mode==='month'){const y=Number(q('#historyStatsYear')?.value)||new Date().getFullYear(),m=Number(q('#svMonth')?.value)||1;return{start:new Date(y,m-1,1),end:new Date(y,m,1)}}if(mode==='custom'){const a=q('#svStart')?.value,b=q('#svEnd')?.value;if(a&&b){const s=parse(a),e=plus(parse(b),1);return{start:s,end:e>s?e:plus(s,1)}}}const y=Number(q('#historyStatsYear')?.value)||new Date().getFullYear();return{start:new Date(y,0,1),end:new Date(y+1,0,1)}}
function shiftYear(r,d){const s=new Date(r.start),e=new Date(r.end);s.setFullYear(s.getFullYear()+d);e.setFullYear(e.getFullYear()+d);return{start:s,end:e}}
function compareRanges(){const mode=q('#svCmpMode')?.value||'same';if(mode==='same'){const a=currentRange();return periodPolicy?.sameRanges(a,(q('#svMode')?.value||'year')==='year')||[a,shiftYear(a,-1)]}if(mode==='year'){const a=Number(q('#svCmpYearA')?.value),b=Number(q('#svCmpYearB')?.value);return periodPolicy?.yearRanges(a,b)||[{start:new Date(a,0,1),end:new Date(a+1,0,1)},{start:new Date(b,0,1),end:new Date(b+1,0,1)}]}if(mode==='month'){const a=Number(q('#svCmpYearA')?.value),b=Number(q('#svCmpYearB')?.value),m=Number(q('#svCmpMonth')?.value)||1;return periodPolicy?.monthRanges(a,b,m)||[{start:new Date(a,m-1,1),end:new Date(a,m,1)},{start:new Date(b,m-1,1),end:new Date(b,m,1)}]}const sa=q('#svCmpStartA')?.value,ea=q('#svCmpEndA')?.value,sb=q('#svCmpStartB')?.value,eb=q('#svCmpEndB')?.value;if(sa&&ea&&sb&&eb)return[{start:parse(sa),end:plus(parse(ea),1)},{start:parse(sb),end:plus(parse(eb),1)}];return null}
function rangeLabel(r){const f=d=>new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric'}).format(d);return`${f(r.start)} – ${f(plus(r.end,-1))}`}
function bucketRanges(r){
  const calendarMonths=periodPolicy?.monthBuckets(r,months)||[];if(calendarMonths.length)return calendarMonths;
  const total=days(r.start,r.end);if(total<=31)return Array.from({length:total},(_,i)=>({start:plus(r.start,i),end:plus(r.start,i+1),label:String(i+1)}));
  const count=12,out=[];for(let i=0;i<count;i++){const a=Math.round(total*i/count),b=Math.round(total*(i+1)/count);out.push({start:plus(r.start,a),end:plus(r.start,Math.max(a+1,b)),label:String(i+1)})}return out
}
function metricValue(r,name){const f=financeRange(r),o=occupancy(r),n=economicNights(r)||o.occupied;if(name==='gross')return f.gross;if(name==='net')return f.netFinal;if(name==='adrGross')return n&&f.gross?f.gross/n:null;if(name==='adrNet')return n&&f.netFinal!==null?f.netFinal/n:null;if(name==='occ')return o.pct;if(name==='nights')return o.occupied;if(name==='stays')return stays(r);return null}
function metricMeta(name){return({net:['Netto finale','€'],gross:['Lordo piattaforme','€'],adrNet:['ADR netto','€'],adrGross:['ADR lordo','€'],occ:['Occupazione','%'],nights:['Notti occupate','n'],stays:['Soggiorni','n']})[name]||['Netto finale','€']}
function fmtMetric(v,name,axis=false){if(v===null||v===undefined||!Number.isFinite(Number(v)))return'—';const unit=metricMeta(name)[1];if(unit==='%')return`${axis?Math.round(v):num(v)}%`;if(unit==='€')return axis?euro(v):euro2(v);return axis?String(Math.round(v)):num(v)}
function lineParts(vals,w,h,pad,max){const parts=[];let current=[];vals.forEach((v,i)=>{if(v===null||!Number.isFinite(v)){if(current.length)parts.push(current);current=[];return}const x=pad.l+(vals.length===1?.5:i/(vals.length-1))*(w-pad.l-pad.r),y=pad.t+(1-v/max)*(h-pad.t-pad.b);current.push([x,y,v,i])});if(current.length)parts.push(current);return parts}
function svgChart(aVals,bVals,name){
  const W=720,H=250,p={l:58,r:18,t:20,b:28},all=[...aVals,...bVals].filter(v=>v!==null&&Number.isFinite(v)),fixed=name==='occ'?100:null,max=Math.max(1,fixed||Math.max(0,...all)*1.12),a=lineParts(aVals,W,H,p,max),b=lineParts(bVals,W,H,p,max),grid=[0,.25,.5,.75,1];
  const path=parts=>parts.map(seg=>`<polyline points="${seg.map(x=>`${x[0].toFixed(1)},${x[1].toFixed(1)}`).join(' ')}"/>`).join(''),pts=(parts,cls,label)=>parts.flat().map(x=>`<circle class="${cls}" cx="${x[0].toFixed(1)}" cy="${x[1].toFixed(1)}" r="3.3"><title>${label} · ${fmtMetric(x[2],name)}</title></circle>`).join('');
  return`<svg class="sv-cmp-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafico confronto ${metricMeta(name)[0]}">${grid.map(g=>{const y=p.t+(1-g)*(H-p.t-p.b),v=max*g;return`<line class="sv-cmp-gridline" x1="${p.l}" y1="${y}" x2="${W-p.r}" y2="${y}"></line><text class="sv-cmp-axis" x="${p.l-8}" y="${y+3}" text-anchor="end">${fmtMetric(v,name,true)}</text>`}).join('')}<g class="sv-cmp-line-a">${path(a)}</g><g class="sv-cmp-line-b">${path(b)}</g>${pts(a,'sv-cmp-point-a','Periodo A')}${pts(b,'sv-cmp-point-b','Periodo B')}</svg>`
}
function renderCompareChart(){
  patchDashboard();patchRequests();const body=q('#statsSec .sv-compare-body');if(!body||!loaded)return;const rr=compareRanges();if(!rr)return;const [ra,rb]=rr,table=body.querySelector('.sv-table');if(!table)return;let box=body.querySelector('.sv-cmp-chartbox');if(!box){box=document.createElement('div');box.className='sv-cmp-chartbox';table.insertAdjacentElement('beforebegin',box)}
  const sig=`${key(ra.start)}|${key(ra.end)}|${key(rb.start)}|${key(rb.end)}|${metric}|${normal.length}|${history.length}`;if(box.dataset.sig===sig)return;box.dataset.sig=sig;
  const ba=bucketRanges(ra),bb=bucketRanges(rb),av=ba.map(x=>metricValue(x,metric)),bv=bb.map(x=>metricValue(x,metric));
  box.innerHTML=`<div class="sv-cmp-charttop"><div><h4>Andamento a confronto</h4><div class="sv-sub">Due linee sullo stesso avanzamento temporale</div></div><div class="sv-cmp-metric"><label>Valore del grafico</label><select id="svCmpMetric"><option value="net"${metric==='net'?' selected':''}>Netto finale</option><option value="gross"${metric==='gross'?' selected':''}>Lordo piattaforme</option><option value="adrNet"${metric==='adrNet'?' selected':''}>ADR netto</option><option value="adrGross"${metric==='adrGross'?' selected':''}>ADR lordo</option><option value="occ"${metric==='occ'?' selected':''}>Occupazione</option><option value="nights"${metric==='nights'?' selected':''}>Notti occupate</option><option value="stays"${metric==='stays'?' selected':''}>Soggiorni</option></select></div></div><div class="sv-cmp-legend"><span><i class="sv-cmp-line-dot a"></i>A · ${rangeLabel(ra)}</span><span><i class="sv-cmp-line-dot b"></i>B · ${rangeLabel(rb)}</span></div>${svgChart(av,bv,metric)}<div class="sv-cmp-progress"><span>Inizio</span><span>25%</span><span>50%</span><span>75%</span><span>Fine</span></div><div class="sv-cmp-help">Le linee sono allineate dall’inizio alla fine dei due periodi: questo rende leggibili anche confronti tra intervalli di durata diversa. Per anni interi i punti corrispondono ai 12 mesi.</div>`;
  q('#svCmpMetric')?.addEventListener('change',e=>{metric=e.target.value;box.dataset.sig='';renderCompareChart()})
}
async function loadData(){if(loaded)return true;if(loading)return loading;loading=(async()=>{try{const [fr,hr]=await Promise.all([sb.from('platform_finance_ledger').select('id,source,external_ref,line_type,transaction_date,stay_start,stay_end,gross_amount,platform_commission,vat_platform_services,transaction_fee,tax_withheld,payout_amount'),sb.from('booking_history').select('source,status,start_date,end_date,nights,earnings')]);if(fr.error)throw fr.error;if(hr.error)throw hr.error;finance=fr.data||[];history=hr.data||[];normalizeFinance();loaded=true;schedule();return true}catch(e){console.error('Grafico confronto:',e);return false}})();return loading}
function patchAll(){styles();patchDashboard();patchRequests();renderCompareChart()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchAll()})}
function boot(){styles();patchAll();loadData();const mo=new MutationObserver(schedule);mo.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('#dashRequestsCard,.navtab[data-section="requestsSec"],#svCmpToggle'))setTimeout(schedule,50)});document.addEventListener('change',e=>{if(e.target.closest('#statsSec'))setTimeout(schedule,30)})}
boot();
})();
