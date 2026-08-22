(()=>{
'use strict';
if(window.__civicoCompareChartView)return;window.__civicoCompareChartView=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)],NS='http://www.w3.org/2000/svg';
let view='line',scheduled=false;

function styles(){if(q('#compareChartViewStyles'))return;document.head.insertAdjacentHTML('beforeend',`<style id="compareChartViewStyles">
.sv-cmp-chart-controls{display:flex;align-items:end;gap:8px;flex-wrap:wrap}.sv-cmp-chart-type{width:145px}.sv-cmp-chart-type label{font-size:9px!important;margin:0 0 4px!important;text-transform:uppercase}.sv-cmp-chart-type select{padding:8px 9px}.sv-cmp-bar-a{fill:#2f6f62}.sv-cmp-bar-b{fill:#0b6edb}.sv-cmp-bar{cursor:pointer;transition:opacity .15s ease}.sv-cmp-bar:hover{opacity:.82}.sv-cmp-bar-selected{stroke:#173b33;stroke-width:2}.sv-cmp-chartbox[data-chart-view="bar"] .sv-cmp-help{margin-top:6px}
@media(max-width:760px){.sv-cmp-chart-controls{display:grid;grid-template-columns:1fr 1fr;width:100%}.sv-cmp-chart-controls .sv-cmp-metric,.sv-cmp-chart-type{width:100%}}
</style>`)}

function ensureControl(){
  const box=q('#statsSec .sv-cmp-chartbox'),top=box?.querySelector('.sv-cmp-charttop'),metric=top?.querySelector('.sv-cmp-metric');if(!box||!top||!metric)return null;
  let controls=top.querySelector('.sv-cmp-chart-controls');
  if(!controls){controls=document.createElement('div');controls.className='sv-cmp-chart-controls';metric.insertAdjacentElement('beforebegin',controls);controls.appendChild(metric)}
  let wrap=controls.querySelector('.sv-cmp-chart-type');
  if(!wrap){wrap=document.createElement('div');wrap.className='sv-cmp-chart-type';wrap.innerHTML=`<label for="svCmpChartType">Tipo grafico</label><select id="svCmpChartType"><option value="line">Linee</option><option value="bar">Barre</option></select>`;controls.appendChild(wrap);const sel=wrap.querySelector('select');sel.value=view;sel.addEventListener('change',e=>{view=e.target.value;if(view==='line')restoreLine();else renderBars();})}
  else wrap.querySelector('select').value=view;
  return box;
}

function restoreLine(){
  const box=q('#statsSec .sv-cmp-chartbox');if(!box)return;box.dataset.chartView='line';const metric=q('#svCmpMetric');if(metric)metric.dispatchEvent(new Event('change',{bubbles:true}));
}

function baseline(svg){const ys=qa('#statsSec .sv-cmp-chartbox .sv-cmp-svg .sv-cmp-gridline').map(l=>Number(l.getAttribute('y1'))).filter(Number.isFinite);return ys.length?Math.max(...ys):222}
function pointData(svg,cls){return [...svg.querySelectorAll(cls)].map((c,i)=>({cx:Number(c.getAttribute('cx')),cy:Number(c.getAttribute('cy')),title:c.querySelector('title')?.textContent||'',i})).filter(x=>Number.isFinite(x.cx)&&Number.isFinite(x.cy))}
function makeRect(x,y,w,h,cls,title,idx,series){const r=document.createElementNS(NS,'rect');r.setAttribute('x',x.toFixed(2));r.setAttribute('y',y.toFixed(2));r.setAttribute('width',w.toFixed(2));r.setAttribute('height',Math.max(0,h).toFixed(2));r.setAttribute('rx','4');r.setAttribute('class',`sv-cmp-bar ${cls}`);r.dataset.barIndex=String(idx);r.dataset.barSeries=series;const t=document.createElementNS(NS,'title');t.textContent=title;r.appendChild(t);return r}
function axisLabel(box,idx,series,total){const rows=[...box.querySelectorAll('.sv-cmp-axis-row')];if(!rows.length)return'';const row=rows.length>1?(series==='A'?rows[0]:rows[1]):rows[0],labels=[...row.querySelectorAll('span')].map(x=>x.textContent.trim());return labels.length===total?(labels[idx]||''):''}
function wireBars(box,bars,total){let detail=box.querySelector('.sv-cmp-point-detail');if(!detail){detail=document.createElement('div');detail.className='sv-cmp-point-detail';box.appendChild(detail)}bars.forEach(r=>r.addEventListener('click',()=>{qa('#statsSec .sv-cmp-chartbox .sv-cmp-bar').forEach(x=>x.classList.toggle('sv-cmp-bar-selected',x===r));const series=r.dataset.barSeries,idx=Number(r.dataset.barIndex),label=axisLabel(box,idx,series,total),title=r.querySelector('title')?.textContent||'';detail.textContent=`Periodo ${series}${label?' · '+label:''}${title.includes('·')?' · '+title.split('·').slice(1).join('·').trim():''}`;detail.classList.add('show')}))}

function renderBars(){
  const box=ensureControl(),svg=box?.querySelector('.sv-cmp-svg');if(!box||!svg)return;if(svg.dataset.compareBars==='1'){box.dataset.chartView='bar';return}
  const a=pointData(svg,'.sv-cmp-point-a'),b=pointData(svg,'.sv-cmp-point-b');if(!a.length&&!b.length)return;
  const all=[...a,...b],xs=[...new Set(all.map(x=>x.cx))].sort((x,y)=>x-y),gaps=xs.slice(1).map((x,i)=>x-xs[i]).filter(x=>x>0),gap=gaps.length?Math.min(...gaps):44,bw=Math.max(5,Math.min(18,gap*.30)),base=baseline(svg),total=Math.max(a.length,b.length);
  svg.querySelectorAll('.sv-cmp-line-a,.sv-cmp-line-b,.sv-cmp-point-a,.sv-cmp-point-b').forEach(x=>x.remove());
  const ga=document.createElementNS(NS,'g'),gb=document.createElementNS(NS,'g');ga.setAttribute('class','sv-cmp-bars-a');gb.setAttribute('class','sv-cmp-bars-b');
  const bars=[];
  a.forEach(p=>{const r=makeRect(p.cx-bw-1,p.cy,bw,base-p.cy,'sv-cmp-bar-a',p.title,p.i,'A');ga.appendChild(r);bars.push(r)});
  b.forEach(p=>{const r=makeRect(p.cx+1,p.cy,bw,base-p.cy,'sv-cmp-bar-b',p.title,p.i,'B');gb.appendChild(r);bars.push(r)});
  svg.append(ga,gb);svg.dataset.compareBars='1';box.dataset.chartView='bar';
  const help=box.querySelector('.sv-cmp-help'),monthAxis=box.querySelector('.sv-cmp-axis-row.months');if(help)help.textContent=monthAxis?'Barre affiancate per mese: verde = Periodo A, blu = Periodo B. Tocca una barra per leggere il valore preciso.':'Barre affiancate sui punti temporali del confronto: verde = Periodo A, blu = Periodo B.';
  wireBars(box,bars,total)
}

function patch(){styles();const box=ensureControl();if(!box)return;if(view==='bar')renderBars();else box.dataset.chartView='line'}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patch()})}
function boot(){styles();patch();const mo=new MutationObserver(schedule);mo.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('#svCmpToggle'))setTimeout(schedule,60)});document.addEventListener('change',e=>{if(e.target.closest('#statsSec')&&!e.target.closest('#svCmpChartType'))setTimeout(schedule,50)})}
boot();
})();