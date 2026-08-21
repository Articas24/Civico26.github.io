(()=>{
'use strict';
if(window.__civicoStatsV2Polish)return;window.__civicoStatsV2Polish=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const iconSrc=p=>p==='booking'?'https://cdn.simpleicons.org/bookingdotcom/003580':p==='airbnb'?'https://cdn.simpleicons.org/airbnb/FF5A5F':'';
const icon=p=>{const src=iconSrc(p);return src?`<img class="ota-brand-icon" src="${src}" alt="" aria-hidden="true">`:''};
const platformOpen={booking:false,airbnb:false};
const chartFlags={net:true,cost:true,tax:true};

function styles(){if(q('#statsV2PolishStyles'))return;document.head.insertAdjacentHTML('beforeend',`<style id="statsV2PolishStyles">
.ota-brand-icon{width:17px;height:17px;object-fit:contain;display:inline-block;vertical-align:-3px;margin-right:7px;flex:0 0 auto}
#statsSec .sv-platform h3,#statsSec .sv-channel .sv-channel-name{display:flex;align-items:center}
#statsSec .sv-platform h3 .ota-brand-icon{width:24px;height:24px;margin-right:9px}
#statsSec .sv-channel{font-size:13px!important;gap:10px!important;padding:5px 0;grid-template-columns:auto minmax(82px,1fr) auto!important}
#statsSec .sv-channel span{font-size:13px!important;font-weight:850!important;color:var(--ink)!important}
#statsSec .sv-channel b{font-size:12px!important;white-space:nowrap}
#statsSec .sv-dot{width:12px!important;height:12px!important}
#statsSec .sv-donut{overflow:visible;width:175px!important;height:175px!important}
#statsSec .sv-donut-center span{font-size:12px!important}
#statsSec .sv-donut-center strong{font-size:28px!important}
.sv-donut-pct{position:absolute;z-index:5;left:50%;top:50%;transform:translate(-50%,-50%);padding:3px 6px;border-radius:999px;background:rgba(255,255,255,.96);box-shadow:0 2px 8px rgba(20,45,40,.16);font-size:10px;font-weight:900;color:var(--ink);white-space:nowrap;pointer-events:none}
#statsSec .sv-clickable-kpi{cursor:pointer;transition:.18s transform,.18s border-color,.18s box-shadow;user-select:none;position:relative}
#statsSec .sv-clickable-kpi:hover,#statsSec .sv-clickable-kpi:focus-visible{transform:translateY(-1px);border-color:#b8cec5;box-shadow:0 10px 27px rgba(23,55,48,.09);outline:none}
#statsSec .sv-clickable-kpi small:after{content:' · dettagli';font-weight:900;color:var(--green)}
#statsSec .sv-breakdown{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:-2px 0 12px;padding:10px;border:1px solid var(--line);border-radius:14px;background:#f8fbf9}
#statsSec .sv-breakdown>div{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 11px;border-radius:11px;background:#fff}
#statsSec .sv-breakdown span{font-size:11px;color:var(--muted);display:flex;align-items:center}
#statsSec .sv-breakdown b{font-size:12px}
#statsSec .sv-platform{padding:0!important;overflow:hidden;background:#fff!important}
#statsSec .sv-platform h3.sv-platform-toggle{margin:0!important;padding:13px 14px;cursor:pointer;user-select:none;justify-content:flex-start;gap:0}
#statsSec .sv-platform h3.sv-platform-toggle:focus-visible{outline:2px solid #9bc8bd;outline-offset:-2px}
#statsSec .sv-platform-arrow{margin-left:auto;color:var(--muted);font-family:Heebo,system-ui,sans-serif;font-size:20px;line-height:1;transition:transform .18s ease}
#statsSec .sv-platform.is-open .sv-platform-arrow{transform:rotate(180deg)}
#statsSec .sv-platform-body{padding:0 13px 12px;border-top:1px solid var(--line)}
#statsSec .sv-platform-body[hidden]{display:none!important}
#statsSec .sv-chart-controls{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 4px}
#statsSec .sv-chart-toggle{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;font-size:10px;font-weight:800;background:#fff;cursor:pointer;user-select:none}
#statsSec .sv-chart-toggle input{width:auto;margin:0;accent-color:var(--green)}
#statsSec .sv-chart-toggle .sv-toggle-dot{width:9px;height:9px;border-radius:3px;display:inline-block}
#statsSec .sv-chart-toggle .sv-toggle-dot.net{background:#2f6f62}#statsSec .sv-chart-toggle .sv-toggle-dot.cost{background:#bd6f45}#statsSec .sv-chart-toggle .sv-toggle-dot.tax{background:#8b5a21}
.future-booking-card .badge .ota-brand-icon{width:14px;height:14px;margin-right:5px}.sync-brand-title{display:inline-flex!important;align-items:center}.sync-brand-title .ota-brand-icon{width:18px;height:18px}
@media(max-width:560px){#statsSec .sv-channel{font-size:12px!important;padding:6px 0;grid-template-columns:auto minmax(70px,1fr) auto!important}#statsSec .sv-channel span{font-size:12px!important}#statsSec .sv-channel b{font-size:11px!important}#statsSec .sv-donut{width:152px!important;height:152px!important}#statsSec .sv-donut-pct{font-size:9px;padding:2px 5px}#statsSec .sv-breakdown{grid-template-columns:1fr}.ota-brand-icon{width:16px;height:16px}#statsSec .sv-chart-controls{gap:5px}#statsSec .sv-chart-toggle{padding:6px 8px;font-size:9px}}
</style>`)}

function sourceFromText(t){t=(t||'').toLowerCase();return t.includes('booking')?'booking':t.includes('airbnb')?'airbnb':null}
function enhanceFuture(){qa('#futureBookingsList .future-booking-card').forEach(card=>{const badge=card.querySelector('.badge.sync');if(!badge||badge.querySelector('.ota-brand-icon'))return;const p=sourceFromText(badge.textContent);if(p)badge.insertAdjacentHTML('afterbegin',icon(p))})}
function enhanceFeeds(){qa('#feedsList .item').forEach(card=>{const title=card.querySelector('strong');if(!title||title.querySelector('.ota-brand-icon'))return;const p=sourceFromText(title.textContent);if(!p)return;title.classList.add('sync-brand-title');title.insertAdjacentHTML('afterbegin',icon(p))})}
function removeDashboardShortcuts(){q('#adminDashboard .quick-actions')?.remove()}

function enhancePlatforms(){qa('#statsSec .sv-platform').forEach(card=>{const h=card.querySelector(':scope > h3');if(!h)return;const p=sourceFromText(h.textContent);if(p&&!h.querySelector('.ota-brand-icon'))h.insertAdjacentHTML('afterbegin',icon(p));if(card.dataset.collapseReady)return;card.dataset.collapseReady='1';const source=p||'other';const body=document.createElement('div');body.className='sv-platform-body';[...card.children].filter(x=>x!==h).forEach(x=>body.appendChild(x));card.appendChild(body);h.classList.add('sv-platform-toggle');h.setAttribute('role','button');h.setAttribute('tabindex','0');h.setAttribute('aria-expanded',platformOpen[source]?'true':'false');h.insertAdjacentHTML('beforeend','<span class="sv-platform-arrow" aria-hidden="true">⌄</span>');const apply=()=>{const open=!!platformOpen[source];card.classList.toggle('is-open',open);body.hidden=!open;h.setAttribute('aria-expanded',String(open))};const toggle=()=>{platformOpen[source]=!platformOpen[source];apply()};h.addEventListener('click',toggle);h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});apply()})}

function enhanceChannels(){const rows=qa('#statsSec .sv-channel');rows.forEach(row=>{const name=row.querySelector('span');if(!name)return;name.classList.add('sv-channel-name');if(name.querySelector('.ota-brand-icon'))return;const p=sourceFromText(name.textContent);if(p)name.insertAdjacentHTML('afterbegin',icon(p))});const donut=q('#statsSec .sv-donut');if(!donut)return;const signature=rows.map(row=>row.querySelector('b')?.textContent||'').join('|')+'|'+(window.innerWidth<=560?'m':'d');if(donut.dataset.pctSignature===signature)return;donut.dataset.pctSignature=signature;[...donut.querySelectorAll('.sv-donut-pct')].forEach(x=>x.remove());let cursor=0;rows.forEach(row=>{const m=(row.querySelector('b')?.textContent||'').match(/(\d+(?:[.,]\d+)?)%/);if(!m)return;const p=Number(m[1].replace(',','.'));if(!p)return;const mid=cursor+p/2,rad=(mid/100*360-90)*Math.PI/180,r=window.innerWidth<=560?50:59,x=Math.cos(rad)*r,y=Math.sin(rad)*r,label=document.createElement('span');label.className='sv-donut-pct';label.textContent=`${Math.round(p)}%`;label.style.marginLeft=`${x}px`;label.style.marginTop=`${y}px`;donut.appendChild(label);cursor+=p})}

function moneyText(t){if(!t||t.includes('—'))return null;let s=t.replace(/[^0-9,.-]/g,'');if(!s)return null;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');return Number(s)}
function platform(name){const card=qa('#statsSec .sv-platform').find(x=>(x.querySelector('h3')?.textContent||'').trim().toLowerCase().includes(name));if(!card)return null;const get=label=>{const row=[...card.querySelectorAll('.sv-row')].find(x=>(x.querySelector('span')?.textContent||'').trim().toLowerCase()===label);return moneyText(row?.querySelector('b')?.textContent||'')};const gross=get('lordo report')??0,commission=get('commissioni')??0,vat=get('iva servizi')??0,fee=get('costi transazione')??0,cost=get('costi piattaforma totali')??(commission+vat+fee),tax=get('cedolare secca')??0,payout=get('netto accreditato');return{gross,commission,vat,fee,cost,tax,payout,net:gross-cost-tax}}
function fmt(v){return v===null||!Number.isFinite(v)?'—':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(v)}
function breakdown(kind){const b=platform('booking'),a=platform('airbnb');if(!b&&!a)return '';const map={gross:['Lordo','gross'],net:['Netto finale','net'],cost:['Costi piattaforma','cost'],tax:['Cedolare secca','tax']},[label,key]=map[kind]||map.gross;const one=(p,name)=>`<div><span>${icon(name.toLowerCase())}${label} ${name}</span><b>${p?fmt(p[key]):'—'}</b></div>`;return one(b,'Booking')+one(a,'Airbnb')}
function toggleBreakdown(kind){const econ=q('#statsSec .sv-econ');if(!econ)return;let box=q('#statsSec #svBreakdown');if(box&&box.dataset.kind===kind){box.remove();return}if(!box){box=document.createElement('div');box.id='svBreakdown';box.className='sv-breakdown';econ.insertAdjacentElement('afterend',box)}box.dataset.kind=kind;box.innerHTML=breakdown(kind)}
function enhanceClickableCards(){const map={'Lordo piattaforme':'gross','Netto finale':'net','Costi piattaforme':'cost','Cedolare secca':'tax'};qa('#statsSec .sv-econ > .sv-kpi').forEach(card=>{const title=(card.querySelector('span')?.textContent||'').trim(),kind=map[title];if(!kind||card.dataset.clickReady)return;card.dataset.clickReady='1';card.classList.add('sv-clickable-kpi');card.setAttribute('role','button');card.setAttribute('tabindex','0');card.addEventListener('click',()=>toggleBreakdown(kind));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleBreakdown(kind)}})})}

function parseMoneyFromTitle(title,label){const re=new RegExp(`${label}\\s+€?\\s*([0-9.]+(?:,[0-9]{1,2})?)`,'i'),m=String(title||'').match(re);return m?moneyText(m[1]):0}
function econParts(col){const title=col.getAttribute('title')||'';return{net:parseMoneyFromTitle(title,'Netto'),cost:parseMoneyFromTitle(title,'Costi'),tax:parseMoneyFromTitle(title,'Cedolare')}}
function formatCompactEuro(v){return v?new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v):''}
function applyChartFlags(){const chart=q('#statsSec .sv-stacked');if(!chart)return;const cols=qa('#statsSec .sv-stacked .sv-stackcol'),data=cols.map(c=>econParts(c)),selected=k=>chartFlags[k],totals=data.map(x=>(selected('net')?Math.max(0,x.net):0)+(selected('cost')?Math.max(0,x.cost):0)+(selected('tax')?Math.max(0,x.tax):0)),max=Math.max(1,...totals);cols.forEach((col,i)=>{const x=data[i],total=totals[i],stack=col.querySelector('.sv-stack'),value=col.querySelector('.sv-value');if(value)value.textContent=formatCompactEuro(total);if(stack)stack.style.height=`${Math.max(total?5:1,total/max*100)}%`;['net','cost','tax'].forEach(k=>{const seg=col.querySelector(`.sv-seg.${k}`);if(!seg)return;seg.style.display=chartFlags[k]?'':'none';seg.style.height=chartFlags[k]&&total?`${Math.max(0,x[k])/total*100}%`:'0%'})})}
function enhanceChartControls(){const chart=q('#statsSec .sv-stacked');if(!chart)return;const card=chart.closest('.sv-card');if(!card)return;let controls=card.querySelector('.sv-chart-controls');if(!controls){controls=document.createElement('div');controls.className='sv-chart-controls';controls.innerHTML=`<label class="sv-chart-toggle"><input type="checkbox" data-sv-chart-flag="net"><i class="sv-toggle-dot net"></i>Netto</label><label class="sv-chart-toggle"><input type="checkbox" data-sv-chart-flag="cost"><i class="sv-toggle-dot cost"></i>Commissioni e costi</label><label class="sv-chart-toggle"><input type="checkbox" data-sv-chart-flag="tax"><i class="sv-toggle-dot tax"></i>Cedolare secca</label>`;chart.insertAdjacentElement('beforebegin',controls);controls.querySelectorAll('[data-sv-chart-flag]').forEach(input=>input.addEventListener('change',()=>{chartFlags[input.dataset.svChartFlag]=input.checked;applyChartFlags()}))}controls.querySelectorAll('[data-sv-chart-flag]').forEach(input=>{input.checked=!!chartFlags[input.dataset.svChartFlag]});applyChartFlags()}

function run(){styles();removeDashboardShortcuts();enhanceFuture();enhanceFeeds();enhancePlatforms();enhanceChannels();enhanceClickableCards();enhanceChartControls()}
function boot(){run();const root=q('#adminView')||document.body;let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;run()})}).observe(root,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('.navtab[data-section="futureSec"],.navtab[data-section="syncSec"],.navtab[data-section="statsSec"]'))setTimeout(run,120)});window.addEventListener('resize',()=>{const donut=q('#statsSec .sv-donut');if(donut){delete donut.dataset.pctSignature;run()}})}
boot();
})();
