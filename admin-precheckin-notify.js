(()=>{
'use strict';
if(window.__civicoPrecheckinNotify)return;window.__civicoPrecheckinNotify=true;
const API='https://wfhdtwzpjcaicxdrphcu.supabase.co/functions/v1/precheckin';
const KEY='sb_publishable_3SGl7pKrqv_uT8GIW2N8RA_Xook19Uh';
let lastCount=null,timer=null,busy=false,pendingNow=[];
const q=s=>document.querySelector(s);
function today(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
async function headers(){const {data}=await sb.auth.getSession();const t=data.session?.access_token;if(!t)return null;return {'content-type':'application/json','apikey':KEY,'authorization':`Bearer ${t}`}}
async function post(body){const h=await headers();if(!h)return null;const r=await fetch(API,{method:'POST',headers:h,body:JSON.stringify(body)});if(!r.ok)return null;return r.json().catch(()=>null)}

function openPending(entryId){
 const id=Number(entryId||pendingNow[0]?.calendar_entry_id||0);
 const tab=q('.navtab[data-section="precheckinSec"]');
 if(!tab)return;
 tab.click();
 let tries=0;
 const find=()=>{
   tries++;
   const row=id?q(`#precheckinSec .pc-row[data-entry="${id}"]`):q('#precheckinSec .pc-row .pc-status.submitted')?.closest('.pc-row');
   const btn=row?.querySelector('[data-detail]');
   if(btn){btn.click();return}
   if(tries<25)setTimeout(find,120);
   else q('#precheckinSec')?.scrollIntoView({behavior:'smooth',block:'start'});
 };
 setTimeout(find,80);
}

function ensure(){
 if(!q('#pcPendingStyles'))document.head.insertAdjacentHTML('beforeend',`<style id="pcPendingStyles">
#pcPendingBanner{display:none;margin:0 0 14px;border:1px solid #d9b86d;background:#fff8e7;border-radius:15px;padding:12px 14px;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 7px 20px rgba(23,55,48,.045)}
#pcPendingBanner.show{display:flex}#pcPendingBanner strong{display:block;font-size:14px}#pcPendingBanner span{display:block;font-size:11px;color:var(--muted);margin-top:2px}.pc-pending-note{font-size:10px!important;margin-top:5px!important;color:#806a37!important}
.pc-pending-badge{display:inline-flex;min-width:19px;height:19px;padding:0 6px;align-items:center;justify-content:center;border-radius:999px;background:#b55a45;color:#fff;font-size:10px;font-weight:900;margin-left:5px;vertical-align:1px}
.pc-arrival-toast{position:fixed;right:20px;bottom:20px;z-index:1400;background:var(--ink);color:#fff;border-radius:12px;padding:12px 14px;font-size:12px;font-weight:800;box-shadow:0 12px 30px rgba(0,0,0,.24);cursor:pointer}
@media(max-width:650px){#pcPendingBanner{align-items:flex-start;flex-direction:column}#pcPendingBanner .btn{width:100%}}
</style>`);
 const sec=q('#precheckinSec');
 if(!sec)return;
 let b=q('#pcPendingBanner');
 if(!b){
   b=document.createElement('div');b.id='pcPendingBanner';
   b.innerHTML='<div><strong id="pcPendingTitle">Pre-check-in ricevuto</strong><span id="pcPendingText">Ci sono dati ospiti da verificare.</span><span class="pc-pending-note">La notifica scompare dopo “Verifica e distruggi foto”.</span></div><button type="button" class="btn primary small" id="pcPendingOpen">Apri dati</button>';
 }
 /* La notifica deve stare sempre all’inizio della sezione, mai in fondo. */
 if(sec.firstElementChild!==b)sec.insertBefore(b,sec.firstElementChild);
 const open=b.querySelector('#pcPendingOpen');if(open&&!open.dataset.bound){open.dataset.bound='1';open.addEventListener('click',()=>openPending())}
}
function toast(count){q('.pc-arrival-toast')?.remove();const x=document.createElement('div');x.className='pc-arrival-toast';x.textContent=count===1?'Nuovo pre-check-in ricevuto':'Nuovi pre-check-in ricevuti';x.onclick=()=>{x.remove();openPending()};document.body.appendChild(x);setTimeout(()=>x.remove(),7000)}
function render(pending){pendingNow=pending||[];ensure();const count=pendingNow.length,b=q('#pcPendingBanner'),tab=q('.navtab[data-section="precheckinSec"]');if(b){b.classList.toggle('show',count>0);if(count){q('#pcPendingTitle').textContent=count===1?'1 pre-check-in da verificare':`${count} pre-check-in da verificare`;const names=pendingNow.map(s=>{try{return (entries||[]).find(e=>Number(e.id)===Number(s.calendar_entry_id))?.guest_name}catch{return null}}).filter(Boolean);q('#pcPendingText').textContent=names.length?`Dati ricevuti: ${names.slice(0,3).join(', ')}${names.length>3?'…':''}`:'Sono arrivati dati ospiti da controllare.'}}
 if(tab){let badge=tab.querySelector('.pc-pending-badge');if(count&&!badge){badge=document.createElement('span');badge.className='pc-pending-badge';tab.appendChild(badge)}if(badge){badge.textContent=String(count);badge.style.display=count?'inline-flex':'none'}}
 if(lastCount!==null&&count>lastCount)toast(count);lastCount=count;
}
async function refresh(){if(busy)return;busy=true;try{if(typeof entries==='undefined'){render([]);return}const ids=(entries||[]).filter(e=>e.status==='booked'&&e.end_date>=today()).map(e=>e.id);if(!ids.length){render([]);return}const d=await post({action:'admin-list',calendar_entry_ids:ids});if(!d)return;render((d.sessions||[]).filter(s=>s.status==='submitted'))}finally{busy=false}}
function boot(){ensure();setTimeout(()=>{ensure();refresh()},500);setTimeout(()=>{ensure();refresh()},1800);timer=setInterval(()=>{if(!document.hidden)refresh()},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});document.addEventListener('click',e=>{if(e.target.closest('#pcRefresh,.navtab[data-section="precheckinSec"]'))setTimeout(()=>{ensure();refresh()},450)});window.addEventListener('civico-precheckin-updated',()=>setTimeout(refresh,80));try{sb.auth.onAuthStateChange((_e,s)=>{if(s)setTimeout(()=>{ensure();refresh()},700);else render([])})}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();