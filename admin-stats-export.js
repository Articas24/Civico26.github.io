(()=>{
'use strict';
if(window.__civicoStatsExport)return;window.__civicoStatsExport=true;
const q=s=>document.querySelector(s);
let ensureQueued=false;
function escFile(s){return String(s||'report').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'report'}
function addStyles(){if(q('#statsExportStyles'))return;document.head.insertAdjacentHTML('beforeend',`<style id="statsExportStyles">
#statsExportPdf{white-space:nowrap}.stats-print-meta{display:none}
@media print{
 @page{size:A4 landscape;margin:10mm}
 html,body{background:#fff!important}
 body>*{visibility:hidden!important}
 #statsSec,#statsSec *{visibility:visible!important}
 #statsSec{display:block!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;margin:0!important;padding:0!important;background:#fff!important;color:#16302b!important}
 #statsSec .sv-controls,#statsSec #statsExportPdf,#statsSec .sv-legacy{display:none!important}
 #statsSec .stats-print-meta{display:block!important;margin:0 0 10px;padding:8px 10px;border:1px solid #dbe6e2;border-radius:8px;font-size:9px;color:#526b65}
 #statsSec .sv-head{margin-bottom:8px!important}
 #statsSec .sv-head h1{font-size:25px!important}
 #statsSec .sv-chips{margin-bottom:8px!important}
 #statsSec .sv-kpis{grid-template-columns:repeat(6,1fr)!important;gap:5px!important;margin-bottom:8px!important}
 #statsSec .sv-econ{grid-template-columns:repeat(4,1fr)!important;gap:5px!important;margin-bottom:8px!important}
 #statsSec .sv-grid,#statsSec .sv-grid.equal{grid-template-columns:1fr 1fr!important;gap:8px!important;margin-bottom:8px!important}
 #statsSec .sv-kpi,#statsSec .sv-card,#statsSec .sa-coverage{box-shadow:none!important;border-color:#dbe6e2!important;break-inside:avoid-page!important;page-break-inside:avoid!important}
 #statsSec .sv-kpi{padding:8px!important}
 #statsSec .sv-kpi strong{font-size:16px!important}
 #statsSec .sv-card{padding:10px!important}
 #statsSec .sv-card h2,#statsSec .sv-card h3{font-size:16px!important}
 #statsSec .sv-chart{height:160px!important;overflow:visible!important}
 #statsSec .sv-track{height:110px!important}
 #statsSec .sv-stacked{height:175px!important;overflow:visible!important}
 #statsSec .sv-stack{height:125px!important}
 #statsSec .sv-donut{width:120px!important;height:120px!important}
 #statsSec .sv-donut:after{inset:25px!important}
 #statsSec .sv-platforms,#statsSec .sv-insights{break-inside:avoid-page!important}
 #statsSec .sv-compare{break-before:auto!important}
 #statsSec .sv-note,#statsSec .sa-note{font-size:8px!important}
 *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}
</style>`)}
function period(){return q('#statsSec .sv-chips .sv-chip')?.textContent?.trim()||'periodo-selezionato'}
function ensure(){addStyles();const head=q('#statsSec .sv-head');if(!head)return false;if(!q('#statsSec .stats-print-meta')){const m=document.createElement('div');m.className='stats-print-meta';const chips=q('#statsSec .sv-chips');(chips||head).insertAdjacentElement(chips?'beforebegin':'afterend',m)}const meta=q('#statsSec .stats-print-meta');if(meta){const now=new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short'}).format(new Date());const next=`Civico 26 · Report statistiche · ${period()} · Generato ${now}`;if(meta.textContent!==next)meta.textContent=next}
 if(q('#statsExportPdf'))return true;const controls=head.querySelector('.sv-controls')||head;const b=document.createElement('button');b.id='statsExportPdf';b.type='button';b.className='btn primary small';b.textContent='Esporta PDF';b.title='Crea il PDF della vista statistiche corrente';b.addEventListener('click',()=>{ensure();const old=document.title;document.title=`Civico26-statistiche-${escFile(period())}`;document.body.classList.add('stats-exporting');const cleanup=()=>{document.body.classList.remove('stats-exporting');document.title=old;window.removeEventListener('afterprint',cleanup)};window.addEventListener('afterprint',cleanup);setTimeout(()=>window.print(),60);setTimeout(()=>{if(document.title!==old)cleanup()},30000)});controls.appendChild(b);return true}
function queueEnsure(delay=0){if(ensureQueued)return;ensureQueued=true;setTimeout(()=>{ensureQueued=false;ensure()},delay)}
function boot(){ensure();const root=q('#statsSec');if(root)new MutationObserver(()=>queueEnsure()).observe(root,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('.navtab[data-section="statsSec"]'))queueEnsure(150)});window.addEventListener('civico-stats-range-change',()=>queueEnsure(80));queueEnsure(1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
