(()=>{
'use strict';
if(window.__civicoAdrProjection)return;window.__civicoAdrProjection=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const euro=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
function money(t){let s=String(t||'').replace(/\s/g,'').replace('€','');if(!s)return null;s=s.replace(/\./g,'').replace(',','.').replace(/[^0-9+\-.]/g,'');const n=Number(s);return Number.isFinite(n)?n:null}
function intText(t){const m=String(t||'').match(/-?\d+/);return m?Number(m[0]):0}
function kpi(container,label){return [...(container?.querySelectorAll(':scope > .sv-kpi')||[])].find(x=>(x.querySelector('span')?.textContent||'').trim()===label)||null}
function box(label){return qa('#statsSec .sa-box').find(x=>(x.querySelector('span')?.textContent||'').trim()===label)||null}
function styles(){if(q('#adrProjectionStyles'))return;document.head.insertAdjacentHTML('beforeend',`<style id="adrProjectionStyles">
.sa-adr-proj{margin:0 0 14px;padding:14px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,#fbfdfc,#f7faf8);box-shadow:0 7px 20px rgba(23,55,48,.045)}.sa-adr-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:11px}.sa-adr-head h3{margin:0;font-size:21px}.sa-adr-badge{display:inline-flex;padding:5px 8px;border-radius:999px;background:#edf8f3;color:#266548;font-size:9px;font-weight:900;text-transform:uppercase;white-space:nowrap}.sa-adr-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.sa-adr-box{padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff}.sa-adr-box span{display:block;color:var(--muted);font-size:9px;font-weight:900;text-transform:uppercase;line-height:1.25}.sa-adr-box strong{display:block;margin-top:4px;font-size:17px}.sa-adr-box.future strong,.sa-adr-box.total strong{color:var(--green)}.sa-adr-note{font-size:10.5px;color:var(--muted);line-height:1.5;margin:10px 1px 0}.sa-adr-note b{color:var(--ink)}@media(max-width:900px){.sa-adr-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:560px){.sa-adr-grid{grid-template-columns:1fr 1fr}.sa-adr-head{flex-direction:column}.sa-adr-proj{padding:12px}}
</style>`)}
function patch(){
 const cov=q('#statsSec .sa-coverage');if(!cov)return;
 const unvalued=intText(box('Prenotate senza importo')?.querySelector('strong')?.textContent),valued=intText(box('Notti valorizzate')?.querySelector('strong')?.textContent);
 let card=q('#statsSec .sa-adr-proj');
 if(!unvalued||!valued){card?.remove();return}
 const top=q('#statsSec .sv-kpis'),econ=q('#statsSec .sv-econ');
 const adrG=money(kpi(top,'ADR lordo')?.querySelector('strong')?.textContent),adrN=money(kpi(top,'ADR netto')?.querySelector('strong')?.textContent),actualG=money(kpi(econ,'Lordo piattaforme')?.querySelector('strong')?.textContent),actualN=money(kpi(econ,'Netto finale')?.querySelector('strong')?.textContent);
 if(adrG==null||adrN==null||actualG==null||actualN==null)return;
 const futureG=adrG*unvalued,futureN=adrN*unvalued,totalG=actualG+futureG,totalN=actualN+futureN,cal=money(box('Stima tariffa calendario')?.querySelector('strong')?.textContent);
 const sig=[valued,unvalued,adrG,adrN,actualG,actualN,cal].join('|');if(card?.dataset.sig===sig)return;
 if(!card){cov.insertAdjacentHTML('afterend','<div class="sa-adr-proj"></div>');card=q('#statsSec .sa-adr-proj')}
 const confidence=valued>=10?'campione discreto':valued>=5?'campione ancora parziale':'campione ridotto';
 card.dataset.sig=sig;
 card.innerHTML=`<div class="sa-adr-head"><div><div class="muted">Proiezione economica principale</div><h3>Stima su ADR consuntivo</h3></div><span class="sa-adr-badge">${valued} notti reali · ${confidence}</span></div><div class="sa-adr-grid"><div class="sa-adr-box"><span>ADR lordo reale</span><strong>${euro(adrG)}</strong></div><div class="sa-adr-box"><span>ADR netto reale</span><strong>${euro(adrN)}</strong></div><div class="sa-adr-box future"><span>Lordo futuro stimato</span><strong>≈ ${euro(futureG)}</strong></div><div class="sa-adr-box future"><span>Netto futuro stimato</span><strong>≈ ${euro(futureN)}</strong></div><div class="sa-adr-box total"><span>Lordo totale proiettato</span><strong>≈ ${euro(totalG)}</strong></div><div class="sa-adr-box total"><span>Netto totale proiettato</span><strong>≈ ${euro(totalN)}</strong></div></div><div class="sa-adr-note"><b>Metodo:</b> ADR lordo/netto delle ${valued} notti già contabilizzate × ${unvalued} notti prenotate senza importo, poi somma al consuntivo già noto. È una proiezione, non un incasso certo.${cal!=null?` Come controllo secondario, la tariffa calendario stima circa ${euro(cal)} lordi sulle sole notti non ancora valorizzate.`:''}</div>`;
}
function boot(){styles();let timer=null;const schedule=()=>{clearTimeout(timer);timer=setTimeout(patch,100)};schedule();document.addEventListener('click',e=>{if(e.target.closest('.navtab[data-section="statsSec"],#statsSec'))schedule()},true);document.addEventListener('change',e=>{if(e.target.closest('#statsSec'))schedule()},true);const root=q('#statsSec');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true})}
setTimeout(boot,650);
})();