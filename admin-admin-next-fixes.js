(()=>{
'use strict';
if(window.__civicoAdminNextFixes)return;window.__civicoAdminNextFixes=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)],DAY=86400000;
const months=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parse=s=>{const [y,m,d]=String(s||'').slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const plus=(d,n)=>new Date(d.getTime()+n*DAY),days=(a,b)=>Math.max(0,Math.round((b-a)/DAY));
let scheduled=false;

function styles(){if(q('#adminNextFixStyles'))return;document.head.insertAdjacentHTML('beforeend',`<style id="adminNextFixStyles">
.sv-cmp-timeaxis{margin:2px 0 5px;padding:0 2.5% 0 8%;display:grid;gap:3px}.sv-cmp-axis-row{display:flex;justify-content:space-between;align-items:center;gap:2px;min-width:0}.sv-cmp-axis-row span{font-size:8.5px;font-weight:800;color:var(--muted);white-space:nowrap;text-align:center}.sv-cmp-axis-row.dual:before{content:attr(data-period);flex:0 0 14px;margin-left:-18px;font-size:8px;font-weight:900;color:var(--muted)}.sv-cmp-point-detail{min-height:25px;margin-top:7px;padding:6px 9px;border-radius:9px;background:#f2f7f5;color:var(--muted);font-size:10px;font-weight:700;display:none}.sv-cmp-point-detail.show{display:block}.sv-cmp-svg circle{cursor:pointer}.sv-cmp-chartbox .sv-cmp-help{margin-top:5px}
@media(max-width:760px){.sv-cmp-timeaxis{padding-left:9%;padding-right:2%}.sv-cmp-axis-row span{font-size:7.5px}.sv-cmp-axis-row.months span{font-size:7px}.sv-cmp-point-detail{font-size:9.5px}}
</style>`)}

function canDeleteRequest(r){const today=key(new Date());return !['new','waiting'].includes(String(r.status||'').toLowerCase())||String(r.check_out||'')<today}
function flash(text,type='ok'){const el=q('#requestMsg');if(!el)return;el.textContent=text;el.className=`msg show ${type}`;setTimeout(()=>{if(el.textContent===text)el.className='msg'},5000)}
async function deleteRequest(r){
  const linked=r.status==='confirmed'?'\n\nLa prenotazione e le date già presenti nel calendario NON verranno eliminate.':'';
  if(!confirm(`Eliminare definitivamente la richiesta ${r.request_code} dal registro?${linked}`))return;
  const {data,error}=await sb.from('booking_requests').delete().eq('id',r.id).select('id');
  if(error)return flash('Eliminazione non riuscita: '+error.message,'error');
  if(!data?.length)return flash('La richiesta non è stata eliminata.','error');
  if(typeof loadRequests==='function')await loadRequests();
  if(typeof renderRequests==='function')renderRequests();
  if(typeof renderAll==='function')renderAll();
  flash(`Richiesta ${r.request_code} eliminata dal registro.`,'ok');
  setTimeout(schedule,40);
}
function patchRequests(){
  if(typeof requests==='undefined')return;
  const cards=qa('#requestsList .admin-rich');
  cards.forEach((card,i)=>{
    const r=requests[i];if(!r||!canDeleteRequest(r)||card.querySelector('[data-request-delete]'))return;
    const actions=card.querySelector('.row-actions');if(!actions)return;
    const b=document.createElement('button');b.type='button';b.className='btn danger small request-delete';b.dataset.requestDelete=String(r.id);b.textContent='Elimina';b.title=r.status==='confirmed'?'Elimina solo la richiesta dal registro; la prenotazione resta nel calendario':'Elimina definitivamente questa richiesta dal registro';b.onclick=()=>deleteRequest(r);actions.appendChild(b);
  });
}

function currentRange(){const mode=q('#svMode')?.value||'year';if(mode==='month'){const y=Number(q('#historyStatsYear')?.value)||new Date().getFullYear(),m=Number(q('#svMonth')?.value)||1;return{start:new Date(y,m-1,1),end:new Date(y,m,1)}}if(mode==='custom'){const a=q('#svStart')?.value,b=q('#svEnd')?.value;if(a&&b)return{start:parse(a),end:plus(parse(b),1)}}const y=Number(q('#historyStatsYear')?.value)||new Date().getFullYear();return{start:new Date(y,0,1),end:new Date(y+1,0,1)}}
function shiftYear(r,d){const s=new Date(r.start),e=new Date(r.end);s.setFullYear(s.getFullYear()+d);e.setFullYear(e.getFullYear()+d);return{start:s,end:e}}
function compareRanges(){const mode=q('#svCmpMode')?.value||'same';if(mode==='same'){const a=currentRange();return[a,shiftYear(a,-1)]}if(mode==='year'){const a=Number(q('#svCmpYearA')?.value),b=Number(q('#svCmpYearB')?.value);if(Number.isFinite(a)&&Number.isFinite(b))return[{start:new Date(a,0,1),end:new Date(a+1,0,1)},{start:new Date(b,0,1),end:new Date(b+1,0,1)}]}if(mode==='month'){const a=Number(q('#svCmpYearA')?.value),b=Number(q('#svCmpYearB')?.value),m=Number(q('#svCmpMonth')?.value)||1;if(Number.isFinite(a)&&Number.isFinite(b))return[{start:new Date(a,m-1,1),end:new Date(a,m,1)},{start:new Date(b,m-1,1),end:new Date(b,m,1)}]}const sa=q('#svCmpStartA')?.value,ea=q('#svCmpEndA')?.value,sb=q('#svCmpStartB')?.value,eb=q('#svCmpEndB')?.value;if(sa&&ea&&sb&&eb)return[{start:parse(sa),end:plus(parse(ea),1)},{start:parse(sb),end:plus(parse(eb),1)}];return null}
function fullYear(r){return r.start.getMonth()===0&&r.start.getDate()===1&&r.end.getFullYear()===r.start.getFullYear()+1&&r.end.getMonth()===0&&r.end.getDate()===1}
function fmtDate(d,withMonth=true){return new Intl.DateTimeFormat('it-IT',withMonth?{day:'numeric',month:'short'}:{day:'numeric'}).format(d).replace('.','')}
function sampledDates(r,count=6){const total=Math.max(1,days(r.start,r.end)),out=[];for(let i=0;i<count;i++){const n=Math.min(total-1,Math.round((total-1)*i/(count-1)));out.push(fmtDate(plus(r.start,n)))}return out}
function dayTicks(r){const total=days(r.start,r.end),raw=[1,5,10,15,20,25,30,total].filter(x=>x>=1&&x<=total),vals=[...new Set(raw)].sort((a,b)=>a-b);return vals.map(String)}
function axisData(ra,rb){
  if(fullYear(ra)&&fullYear(rb))return{kind:'months',rows:[{labels:months}],help:'Ogni punto rappresenta lo stesso mese nei due anni: Gennaio contro Gennaio, Febbraio contro Febbraio, e così via.'};
  const da=days(ra.start,ra.end),db=days(rb.start,rb.end),mode=q('#svCmpMode')?.value||'same';
  if(mode==='month'&&da>=28&&da<=31&&db>=28&&db<=31)return{kind:'days',rows:[{labels:dayTicks(ra)}],help:'Asse orizzontale: giorno del mese. Le due linee confrontano gli stessi giorni dei due periodi.'};
  if(mode==='same'&&da===db&&da<=45)return{kind:'dates',rows:[{labels:sampledDates(ra,Math.min(6,Math.max(2,da)))}],help:'Asse orizzontale: date del periodo selezionato; il periodo precedente segue gli stessi punti temporali.'};
  return{kind:'dual',rows:[{period:'A',labels:sampledDates(ra,6)},{period:'B',labels:sampledDates(rb,6)}],help:'Per intervalli diversi sono mostrate due scale di date: A per la linea verde e B per la linea blu.'};
}
function pointLabel(r,count,cx){const total=days(r.start,r.end),plotStart=58,plotEnd=702,ratio=Math.max(0,Math.min(1,(Number(cx)-plotStart)/(plotEnd-plotStart))),i=Math.round(ratio*Math.max(0,count-1));if(fullYear(r)&&count===12)return months[i]||'';if(total<=31&&count===total)return fmtDate(plus(r.start,i));const n=Math.min(total-1,Math.round(total*i/Math.max(1,count)));return fmtDate(plus(r.start,Math.max(0,n)))}
function wirePoints(box,ra,rb){
  let detail=box.querySelector('.sv-cmp-point-detail');if(!detail){detail=document.createElement('div');detail.className='sv-cmp-point-detail';box.appendChild(detail)}
  const wire=(selector,r,period)=>{const pts=qa(`${selector}`),count=pts.length||1;pts.forEach(c=>{if(c.dataset.timeWired)return;c.dataset.timeWired='1';c.addEventListener('click',()=>{const title=c.querySelector('title')?.textContent||'',value=title.split('·').slice(1).join('·').trim(),label=pointLabel(r,count,c.getAttribute('cx'));detail.textContent=`Periodo ${period} · ${label}${value?' · '+value:''}`;detail.classList.add('show')})})};
  wire('#statsSec .sv-cmp-chartbox .sv-cmp-point-a',ra,'A');wire('#statsSec .sv-cmp-chartbox .sv-cmp-point-b',rb,'B');
}
function patchCompareAxis(){
  const box=q('#statsSec .sv-cmp-chartbox'),progress=box?.querySelector('.sv-cmp-progress');if(!box||!progress)return;const rr=compareRanges();if(!rr)return;const [ra,rb]=rr,mode=q('#svCmpMode')?.value||'same',sig=`${mode}|${key(ra.start)}|${key(ra.end)}|${key(rb.start)}|${key(rb.end)}|${box.querySelector('#svCmpMetric')?.value||''}`;if(progress.dataset.axisSig===sig){wirePoints(box,ra,rb);return}
  const ax=axisData(ra,rb);progress.className='sv-cmp-timeaxis';progress.dataset.axisSig=sig;progress.innerHTML=ax.rows.map(r=>`<div class="sv-cmp-axis-row ${ax.kind==='months'?'months':''} ${r.period?'dual':''}"${r.period?` data-period="${r.period}"`:''}>${r.labels.map(x=>`<span>${x}</span>`).join('')}</div>`).join('');
  const sub=box.querySelector('.sv-cmp-charttop .sv-sub');if(sub)sub.textContent='Confronto temporale della metrica selezionata';const help=box.querySelector('.sv-cmp-help');if(help)help.textContent=ax.help;wirePoints(box,ra,rb);
}
function patchAll(){styles();patchRequests();patchCompareAxis()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patchAll()})}
function boot(){styles();patchAll();const mo=new MutationObserver(schedule);mo.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('#dashRequestsCard,.navtab[data-section="requestsSec"],#svCmpToggle'))setTimeout(schedule,60)});document.addEventListener('change',e=>{if(e.target.closest('#statsSec'))setTimeout(schedule,50)})}
boot();
})();