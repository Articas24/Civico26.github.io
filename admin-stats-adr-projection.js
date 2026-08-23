(()=>{
'use strict';
if(window.__civicoAdrProjection)return;window.__civicoAdrProjection=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)],DAY=86400000;
const euro=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
function money(t){let s=String(t||'').replace(/\s/g,'').replace('€','');if(!s)return null;s=s.replace(/\./g,'').replace(',','.').replace(/[^0-9+\-.]/g,'');const n=Number(s);return Number.isFinite(n)?n:null}
function intText(t){const m=String(t||'').match(/-?\d+/);return m?Number(m[0]):0}
function kpi(container,label){return [...(container?.querySelectorAll(':scope > .sv-kpi')||[])].find(x=>(x.querySelector('span')?.textContent||'').trim()===label)||null}
function box(label){return qa('#statsSec .sa-box').find(x=>(x.querySelector('span')?.textContent||'').trim()===label)||null}
function parseDate(s){const [y,m,d]=String(s||'').slice(0,10).split('-').map(Number);return new Date(y,m-1,d)}
function days(a,b){return Math.max(0,Math.round((b-a)/DAY))}
function median(a){const x=a.filter(v=>Number.isFinite(v)&&v>0).sort((a,b)=>a-b);if(!x.length)return null;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2}
let fallbackPromise=null,fallback=null,patchSeq=0;
function styles(){if(q('#adrProjectionStyles'))return;document.head.insertAdjacentHTML('beforeend',`<style id="adrProjectionStyles">
.sa-adr-proj{margin:0 0 14px;padding:14px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,#fbfdfc,#f7faf8);box-shadow:0 7px 20px rgba(23,55,48,.045)}.sa-adr-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:11px}.sa-adr-head h3{margin:0;font-size:21px}.sa-adr-badge{display:inline-flex;padding:5px 8px;border-radius:999px;background:#edf8f3;color:#266548;font-size:9px;font-weight:900;text-transform:uppercase;white-space:nowrap}.sa-adr-badge.avg{background:#eef3f2;color:#536761}.sa-adr-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.sa-adr-box{padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff}.sa-adr-box span{display:block;color:var(--muted);font-size:9px;font-weight:900;text-transform:uppercase;line-height:1.25}.sa-adr-box strong{display:block;margin-top:4px;font-size:17px}.sa-adr-box.future strong,.sa-adr-box.total strong{color:var(--green)}.sa-adr-note{font-size:10.5px;color:var(--muted);line-height:1.5;margin:10px 1px 0}.sa-adr-note b{color:var(--ink)}@media(max-width:900px){.sa-adr-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:560px){.sa-adr-grid{grid-template-columns:1fr 1fr}.sa-adr-head{flex-direction:column}.sa-adr-proj{padding:12px}}
</style>`)}
async function historicalAverage(){
 if(fallback)return fallback;if(fallbackPromise)return fallbackPromise;
 fallbackPromise=(async()=>{
  try{
   const [hr,fr]=await Promise.all([
    sb.from('booking_history').select('source,status,start_date,end_date,nights,external_id,gross_amount'),
    sb.from('platform_finance_ledger').select('id,source,external_ref,line_type,transaction_date,stay_start,stay_end,gross_amount,platform_commission,vat_platform_services,transaction_fee,tax_withheld')
   ]);
   if(hr.error)throw hr.error;if(fr.error)throw fr.error;
   const hist=(hr.data||[]).filter(r=>r.status!=='cancelled'&&r.status!=='rejected'),hmap=new Map(hist.filter(r=>r.source==='booking'&&r.external_id).map(r=>[String(r.external_id),r]));
   const payouts=(fr.data||[]).filter(r=>r.line_type==='reservation_payout').map(r=>({...r,__extraTax:0})),groups=new Map();
   payouts.forEach(r=>{const k=`${r.source}|${r.transaction_date}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)});
   const gl=[...groups.entries()].map(([k,rows])=>{const i=k.indexOf('|'),ds=k.slice(i+1);return{source:k.slice(0,i),rows,date:parseDate(ds)}});
   (fr.data||[]).filter(r=>r.line_type==='tax_withholding_adjustment').forEach(t=>{const target=parseDate(t.stay_end||t.transaction_date),c=gl.filter(g=>g.source===t.source).map(g=>({...g,dist:Math.abs(g.date-target)/DAY})).sort((a,b)=>a.dist-b.dist),best=c[0];if(!best||best.dist>2)return;const total=best.rows.reduce((z,r)=>z+(Number(r.gross_amount)||0),0),den=total||best.rows.length||1;best.rows.forEach(r=>{const share=total?(Number(r.gross_amount)||0)/den:1/den;r.__extraTax+=(Number(t.tax_withheld)||0)*share})});
   const rates=[];payouts.forEach(r=>{if(r.source!=='booking')return;const h=hmap.get(String(r.external_ref||'')),g=Number(h?.gross_amount)||0,c=Number(r.platform_commission)||0;if(g>0&&c>0)rates.push(c/g)});const commRate=median(rates);
   let gross=0,net=0,nights=0;
   payouts.forEach(r=>{const a=parseDate(r.stay_start),b=parseDate(r.stay_end),nn=days(a,b);if(!r.stay_start||!r.stay_end||!nn)return;const report=Number(r.gross_amount)||0,h=r.source==='booking'?hmap.get(String(r.external_ref||'')):null;let g=h&&Number.isFinite(Number(h.gross_amount))?Number(h.gross_amount):report;if(r.source==='booking'&&!h&&commRate&&(Number(r.platform_commission)||0)>0){const inferred=(Number(r.platform_commission)||0)/commRate;if(inferred>0&&inferred<=report*1.02)g=inferred}const cost=(Number(r.platform_commission)||0)+(Number(r.vat_platform_services)||0)+(Number(r.transaction_fee)||0),tax=(Number(r.tax_withheld)||0)+(Number(r.__extraTax)||0),nt=g-cost-tax;if(g>0&&Number.isFinite(nt)){gross+=g;net+=nt;nights+=nn}});
   fallback=nights?{adrG:gross/nights,adrN:net/nights,nights}:null;return fallback;
  }catch(e){console.error('ADR medio storico:',e);return null}
 })();return fallbackPromise;
}
function periodLabel(){const mode=q('#svMode')?.value||'year';if(mode==='month'){const t=q('#svMonth option:checked')?.textContent?.trim()||'mese';return{mode,label:t}}if(mode==='year')return{mode,label:`${q('#historyStatsYear')?.value||''}`.trim()};return{mode,label:'periodo selezionato'}}
async function patch(){
 const seq=++patchSeq,cov=q('#statsSec .sa-coverage');if(!cov)return;
 const unvalued=intText(box('Prenotate senza importo')?.querySelector('strong')?.textContent),valued=intText(box('Notti valorizzate')?.querySelector('strong')?.textContent);let card=q('#statsSec .sa-adr-proj');
 if(!unvalued){card?.remove();return}
 const top=q('#statsSec .sv-kpis'),econ=q('#statsSec .sv-econ'),localG=money(kpi(top,'ADR lordo')?.querySelector('strong')?.textContent),localN=money(kpi(top,'ADR netto')?.querySelector('strong')?.textContent),actualG=money(kpi(econ,'Lordo piattaforme')?.querySelector('strong')?.textContent),actualN=money(kpi(econ,'Netto finale')?.querySelector('strong')?.textContent),period=periodLabel();
 let adrG=valued>0?localG:null,adrN=valued>0?localN:null,source='local',sample=valued;
 if(adrG==null||adrN==null){const avg=await historicalAverage();if(seq!==patchSeq)return;if(!avg){card?.remove();return}adrG=avg.adrG;adrN=avg.adrN;source='average';sample=avg.nights}
 const futureG=adrG*unvalued,futureN=adrN*unvalued,baseG=actualG??0,baseN=actualN??0,totalG=baseG+futureG,totalN=baseN+futureN,cal=money(box('Stima tariffa calendario')?.querySelector('strong')?.textContent),sig=[source,sample,unvalued,adrG,adrN,baseG,baseN,cal,period.label].join('|');if(card?.dataset.sig===sig)return;
 if(!card){cov.insertAdjacentHTML('afterend','<div class="sa-adr-proj"></div>');card=q('#statsSec .sa-adr-proj')}
 const confidence=source==='local'?(sample>=10?'campione discreto':sample>=5?'campione ancora parziale':'campione ridotto'):`media su ${sample} notti storiche`,sourceTitle=source==='local'?(period.mode==='month'?`ADR ${period.label} consuntivo`:'ADR medio del periodo'):'ADR medio storico',actualText=source==='local'?`${sample} notti reali · ${confidence}`:`Fallback · ${confidence}`;
 card.dataset.sig=sig;
 card.innerHTML=`<div class="sa-adr-head"><div><div class="muted">Proiezione economica principale</div><h3>Stima su ${sourceTitle}</h3></div><span class="sa-adr-badge ${source==='average'?'avg':''}">${actualText}</span></div><div class="sa-adr-grid"><div class="sa-adr-box"><span>ADR lordo usato</span><strong>${euro(adrG)}</strong></div><div class="sa-adr-box"><span>ADR netto usato</span><strong>${euro(adrN)}</strong></div><div class="sa-adr-box future"><span>Lordo futuro stimato</span><strong>≈ ${euro(futureG)}</strong></div><div class="sa-adr-box future"><span>Netto futuro stimato</span><strong>≈ ${euro(futureN)}</strong></div><div class="sa-adr-box total"><span>Lordo totale proiettato</span><strong>≈ ${euro(totalG)}</strong></div><div class="sa-adr-box total"><span>Netto totale proiettato</span><strong>≈ ${euro(totalN)}</strong></div></div><div class="sa-adr-note"><b>Metodo:</b> ${source==='local'?`le ${unvalued} notti prenotate senza importo vengono stimate usando l’ADR lordo e netto già osservato nello stesso ${period.mode==='month'?'mese':'periodo'}.`:`questo mese non ha ancora notti contabilizzate, quindi le ${unvalued} notti prenotate vengono stimate usando l’ADR medio storico ponderato di tutte le notti già valorizzate.`} La proiezione non è un incasso certo.${cal!=null?` La tariffa calendario resta un controllo secondario e stima circa ${euro(cal)} lordi sulle sole notti non valorizzate.`:''}</div>`;
}
function boot(){styles();let timer=null;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>patch(),120)};schedule();document.addEventListener('click',e=>{if(e.target.closest('.navtab[data-section="statsSec"],#statsSec'))schedule()},true);document.addEventListener('change',e=>{if(e.target.closest('#statsSec'))schedule()},true);const root=q('#statsSec');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true})}
setTimeout(boot,650);
})();