(()=>{
'use strict';
if(window.__civicoComplianceSettings)return;window.__civicoComplianceSettings=true;
const API='https://wfhdtwzpjcaicxdrphcu.supabase.co/functions/v1/compliance-oneclick';
const KEY='sb_publishable_3SGl7pKrqv_uT8GIW2N8RA_Xook19Uh';
const q=s=>document.querySelector(s);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let configured={alloggiati:false,ross1000:false},openProvider=null,busy=false,refreshing=false;

async function headers(){
  const {data}=await sb.auth.getSession(),token=data.session?.access_token;
  if(!token)throw new Error('Sessione admin scaduta. Esci e accedi di nuovo.');
  return {'content-type':'application/json','apikey':KEY,'authorization':`Bearer ${token}`};
}
async function post(body){
  const r=await fetch(API,{method:'POST',headers:await headers(),body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||`Errore HTTP ${r.status}`);
  return d;
}
function chip(ok,label){
  return `<span class="acs-chip ${ok?'ok':'missing'}">${ok?'✓':'○'} ${safe(label)} · ${ok?'configurato':'da configurare'}</span>`;
}
function styles(){
  if(q('#adminComplianceSettingsStyles'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="adminComplianceSettingsStyles">
  #pcCredentialsCard{margin-bottom:16px}.acs-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.acs-head h2{margin-bottom:4px}.acs-status{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0}.acs-chip{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:10px;font-weight:900}.acs-chip.ok{background:#e8f6ef;color:#256448}.acs-chip.missing{background:#fff4df;color:#8a6428}.acs-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.acs-provider{border:1px solid var(--line);border-radius:14px;padding:13px;background:#fafcfb}.acs-provider h3{font-size:14px;margin:0 0 6px}.acs-provider p{font-size:10px;line-height:1.45;color:var(--muted);margin:5px 0}.acs-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.acs-form{display:none;margin-top:11px;padding-top:10px;border-top:1px solid var(--line)}.acs-form.open{display:block}.acs-form label{margin-top:7px}.acs-result{display:none;margin-top:12px;padding:10px 12px;border-radius:10px;font-size:11px;line-height:1.5}.acs-result.show{display:block}.acs-result.ok{background:#edf8f3;color:#266548}.acs-result.error{background:#fff0ef;color:#913f39}@media(max-width:680px){.acs-head{flex-direction:column}.acs-grid{grid-template-columns:1fr}}
  </style>`);
}
function markup(){
  return `<div class="acs-head"><div><h2>Credenziali adempimenti</h2><p class="muted" style="margin:0">Impostazioni generali per Alloggiati Web e ROSS1000, indipendenti dai singoli soggiorni.</p></div><button class="btn light small" type="button" id="acsRefresh">Aggiorna stato</button></div>
  <div class="acs-status">${chip(!!configured.alloggiati,'Alloggiati Web')}${chip(!!configured.ross1000,'ROSS1000')}</div>
  <div class="acs-grid">
    <div class="acs-provider"><h3>Alloggiati Web</h3><p>${configured.alloggiati?'Credenziali presenti e cifrate. Inserisci tutti i dati soltanto se vuoi sostituirle.':'Inserisci utente, password e WSKEY.'}</p><div class="acs-actions"><button class="btn light small" type="button" id="acsAwToggle">${configured.alloggiati?'Aggiorna credenziali':'Configura'}</button>${configured.alloggiati?'<button class="btn light small" type="button" id="acsAwTest">Verifica accesso</button>':''}</div><div class="acs-form ${openProvider==='alloggiati'?'open':''}" id="acsAwForm"><label>Utente</label><input id="acsAwUser" autocomplete="off"><label>Nuova password</label><input id="acsAwPass" type="password" autocomplete="new-password"><label>WSKEY</label><input id="acsAwKey" type="password" autocomplete="off"><button class="btn primary small" type="button" id="acsAwSave" style="margin-top:9px">Salva nel Vault</button></div></div>
    <div class="acs-provider"><h3>ROSS1000 Calabria</h3><p>${configured.ross1000?'Credenziali presenti e cifrate. Inserisci username e password soltanto per sostituirle.':'Inserisci username e password di trasmissione ROSS1000.'}</p><p>Se accedi al portale con SPID/CIE, usa la password prevista per il Web Service.</p><div class="acs-actions"><button class="btn light small" type="button" id="acsRossToggle">${configured.ross1000?'Aggiorna credenziali':'Configura'}</button>${configured.ross1000?'<button class="btn light small" type="button" id="acsRossTest">Verifica connessione</button>':''}</div><div class="acs-form ${openProvider==='ross1000'?'open':''}" id="acsRossForm"><label>Username ROSS1000</label><input id="acsRossUser" autocomplete="off"><label>Nuova password di trasmissione</label><input id="acsRossPass" type="password" autocomplete="new-password"><button class="btn primary small" type="button" id="acsRossSave" style="margin-top:9px">Salva nel Vault</button></div></div>
  </div><div class="acs-result" id="acsResult"></div>`;
}
function render(){
  const card=q('#pcCredentialsCard');if(!card)return;
  card.innerHTML=markup();bind();
}
function result(message,ok=true){
  const out=q('#acsResult');if(!out)return;
  out.className=`acs-result show ${ok?'ok':'error'}`;out.innerHTML=message;
}
function ensure(){
  const section=q('#precheckinSec');if(!section)return false;
  styles();
  if(!q('#pcCredentialsCard')){
    const card=document.createElement('div');card.className='card';card.id='pcCredentialsCard';
    section.prepend(card);render();
  }
  return true;
}
function toggle(provider){openProvider=openProvider===provider?null:provider;render();if(openProvider==='alloggiati')setTimeout(()=>q('#acsAwUser')?.focus(),0);if(openProvider==='ross1000')setTimeout(()=>q('#acsRossUser')?.focus(),0)}
async function refresh(showNotice=false){
  if(refreshing||!ensure())return;refreshing=true;
  const btn=q('#acsRefresh'),old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Aggiornamento…'}
  try{const d=await post({action:'status'});configured=d.configured||configured;render();if(showNotice)result('<strong>✓ Stato aggiornato</strong>');}
  catch(e){result(`<strong>Impossibile leggere le impostazioni</strong><br>${safe(e.message)}`,false);}
  finally{refreshing=false;const current=q('#acsRefresh');if(current){current.disabled=false;current.textContent=old||'Aggiorna stato'}}
}
async function save(provider){
  if(busy)return;
  let body;
  if(provider==='alloggiati'){
    const username=q('#acsAwUser')?.value.trim(),password=q('#acsAwPass')?.value||'',wskey=q('#acsAwKey')?.value.trim();
    if(!username||!password||!wskey)return result('Inserisci utente, nuova password e WSKEY.',false);
    body={action:'save-credentials',provider,username,password,wskey};
  }else{
    const username=q('#acsRossUser')?.value.trim(),password=q('#acsRossPass')?.value||'';
    if(!username||!password)return result('Inserisci username ROSS1000 e nuova password di trasmissione.',false);
    body={action:'save-credentials',provider,username,password};
  }
  busy=true;const btn=q(provider==='alloggiati'?'#acsAwSave':'#acsRossSave'),old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Salvataggio…'}
  try{const d=await post(body);configured=d.configured||configured;openProvider=null;render();result(`<strong>✓ Credenziali ${provider==='alloggiati'?'Alloggiati Web':'ROSS1000'} aggiornate</strong><br>I nuovi dati sono stati cifrati e salvati.`);}
  catch(e){result(`<strong>Credenziali non salvate</strong><br>${safe(e.message)}`,false);}
  finally{busy=false;const current=q(provider==='alloggiati'?'#acsAwSave':'#acsRossSave');if(current){current.disabled=false;current.textContent=old||'Salva nel Vault'}}
}
async function test(provider,button){
  if(busy)return;busy=true;const old=button.textContent;button.disabled=true;button.textContent='Verifica…';
  try{const d=await post({action:'test-credentials',provider});result(provider==='alloggiati'?`<strong>✓ Alloggiati Web raggiungibile</strong><br>Autenticazione riuscita.${d.token_expires?` Token valido fino a ${safe(d.token_expires)}.`:''}`:`<strong>✓ Connessione ROSS1000 riuscita</strong><br>${safe(d.note||'Web Service raggiungibile con le credenziali salvate.')}`);}
  catch(e){result(`<strong>✕ Verifica non superata</strong><br>${safe(e.message)}`,false);}
  finally{busy=false;button.disabled=false;button.textContent=old}
}
function bind(){
  q('#acsRefresh')?.addEventListener('click',()=>refresh(true));q('#acsAwToggle')?.addEventListener('click',()=>toggle('alloggiati'));q('#acsRossToggle')?.addEventListener('click',()=>toggle('ross1000'));q('#acsAwSave')?.addEventListener('click',()=>save('alloggiati'));q('#acsRossSave')?.addEventListener('click',()=>save('ross1000'));q('#acsAwTest')?.addEventListener('click',e=>test('alloggiati',e.currentTarget));q('#acsRossTest')?.addEventListener('click',e=>test('ross1000',e.currentTarget));
}
function boot(){
  if(ensure())refresh();
  document.addEventListener('click',e=>{if(e.target.closest('.navtab[data-section="precheckinSec"]'))setTimeout(()=>refresh(),80)});
  const observer=new MutationObserver(()=>{if(!q('#pcCredentialsCard')&&ensure())refresh()});observer.observe(document.documentElement,{childList:true,subtree:true});
  try{sb.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(()=>refresh(),120)})}catch{}
}
boot();
})();
