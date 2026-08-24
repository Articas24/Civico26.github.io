(()=>{
'use strict';
if(window.__civicoPrecheckinDates)return;window.__civicoPrecheckinDates=true;
const API='https://wfhdtwzpjcaicxdrphcu.supabase.co/functions/v1/precheckin';
const KEY='sb_publishable_3SGl7pKrqv_uT8GIW2N8RA_Xook19Uh';
const FORM_URL='https://www.civico26reggiocalabria.it/checkin-ospiti.html';
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ISO=/^\d{4}-\d{2}-\d{2}$/;
let saved=new Map(),refreshTimer=0,loading=false;

function ensureStyles(){
  if(q('#pcDateStyles'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="pcDateStyles">
  #precheckinSec .pc-datebox{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:11px;border-top:1px solid var(--line)}
  #precheckinSec .pc-datebox label{margin:0 0 5px;font-size:11px}
  #precheckinSec .pc-datehint{grid-column:1/-1;margin:-2px 0 0;font-size:11px;color:var(--muted);line-height:1.4}
  @media(max-width:680px){#precheckinSec .pc-datebox{grid-template-columns:1fr}}
  </style>`);
}
async function authHeaders(){
  const {data}=await sb.auth.getSession();
  const token=data.session?.access_token;
  if(!token)throw new Error('Sessione admin scaduta. Accedi di nuovo.');
  return {'content-type':'application/json','apikey':KEY,'authorization':`Bearer ${token}`};
}
async function post(body){
  const r=await fetch(API,{method:'POST',headers:await authHeaders(),body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Errore pre-check-in');
  return d;
}
function futureEntries(){
  try{return (entries||[]).filter(e=>e.status==='booked').map(e=>e)}catch{return []}
}
function entryFor(id){return futureEntries().find(e=>Number(e.id)===Number(id))||null}
function reqFor(id){
  try{return (requests||[]).find(r=>Number(r.confirmed_entry_id)===Number(id))||null}catch{return null}
}
function inject(card){
  if(card.querySelector('.pc-datebox'))return;
  const id=Number(card.dataset.entry),entry=entryFor(id);if(!entry)return;
  const s=saved.get(id)||{};
  const start=s.checkin_date||entry.start_date||'';
  const end=s.checkout_date||entry.end_date||'';
  card.insertAdjacentHTML('beforeend',`<div class="pc-datebox">
    <div><label>Check-in del pre-check-in</label><input type="date" data-pc-checkin value="${safe(start)}"></div>
    <div><label>Check-out del pre-check-in</label><input type="date" data-pc-checkout value="${safe(end)}"></div>
    <p class="pc-datehint">Puoi modificare queste date prima di generare il link. Non cambiano le date della prenotazione nel calendario; vengono salvate nel pre-check-in quando generi o rigeneri il link.</p>
  </div>`);
}
function decorate(){ensureStyles();qa('#precheckinSec .pc-row').forEach(inject)}
async function refreshSaved(){
  if(loading)return;loading=true;
  try{
    const ids=futureEntries().map(e=>Number(e.id)).filter(Boolean);
    if(ids.length){
      const d=await post({action:'admin-list',calendar_entry_ids:ids});
      saved=new Map((d.sessions||[]).map(s=>[Number(s.calendar_entry_id),s]));
    }else saved=new Map();
  }catch(e){console.warn('precheckin dates',e)}finally{loading=false;decorate()}
}
function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshSaved,90)}
function toast(text){
  const old=q('.pc-date-toast');old?.remove();
  const d=document.createElement('div');d.className='pc-toast pc-date-toast';d.textContent=text;document.body.appendChild(d);setTimeout(()=>d.remove(),2600);
}
async function copy(text){try{await navigator.clipboard.writeText(text)}catch{}}
async function generate(card,btn){
  const id=Number(card.dataset.entry),start=card.querySelector('[data-pc-checkin]')?.value||'',end=card.querySelector('[data-pc-checkout]')?.value||'';
  if(!ISO.test(start)||!ISO.test(end)){alert('Inserisci sia la data di check-in sia quella di check-out.');return}
  if(end<=start){alert('Il check-out deve essere successivo al check-in.');return}
  btn.disabled=true;
  try{
    const d=await post({action:'create',calendar_entry_id:id,checkin_date:start,checkout_date:end});
    saved.set(id,{...(saved.get(id)||{}),...(d.session||{}),calendar_entry_id:id,checkin_date:start,checkout_date:end});
    const url=new URL(FORM_URL);url.searchParams.set('t',d.token);const link=url.href;
    await copy(link);
    card.querySelector('.pc-linkbox')?.remove();
    const req=reqFor(id),phone=req?.guest_phone?String(req.guest_phone).replace(/\D/g,''):'';
    const box=document.createElement('div');box.className='pc-linkbox';
    box.innerHTML=`<input readonly value="${safe(link)}"><button type="button" class="btn light small" data-copy data-pc-copy>Copia</button>${phone?`<a class="btn primary small" target="_blank" rel="noopener" href="https://wa.me/${phone}?text=${encodeURIComponent('Ciao, puoi completare il pre-check-in di Civico 26 qui: '+link)}">WhatsApp</a>`:'<button type="button" class="btn primary small" data-copy data-pc-copy>Link copiato</button>'}`;
    card.appendChild(box);
    box.querySelectorAll('[data-pc-copy]').forEach(b=>b.onclick=async()=>{await copy(link);toast('Link copiato')});
    const st=card.querySelector('.pc-status');if(st){st.className='pc-status open';st.textContent='Link creato · in attesa'}
    btn.textContent='Rigenera link';
    toast('Date salvate · nuovo link copiato');
  }catch(e){alert(e.message||'Errore pre-check-in')}finally{btn.disabled=false}
}

document.addEventListener('click',e=>{
  const btn=e.target.closest('#precheckinSec [data-create]');if(!btn)return;
  const card=btn.closest('.pc-row');if(!card)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  generate(card,btn);
},true);

const mo=new MutationObserver(muts=>{
  if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.pc-row')||n.querySelector?.('.pc-row')))))scheduleRefresh();
});
if(document.body)mo.observe(document.body,{childList:true,subtree:true});
setTimeout(scheduleRefresh,150);
})();
