(()=>{
'use strict';
const SUPABASE_URL='https://wfhdtwzpjcaicxdrphcu.supabase.co';
const SUPABASE_KEY='sb_publishable_3SGl7pKrqv_uT8GIW2N8RA_Xook19Uh';
const API=`${SUPABASE_URL}/functions/v1/precheckin`;
const token=new URLSearchParams(location.search).get('t')||'';
const q=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lang=localStorage.getItem('civico26-lang')==='en'?'en':'it';
let booking=null, guests=[], hasPhoto=false, photoFile=null, groupType='group', submitted=false;

const tr={
 it:{eyebrow:'Registrazione ospiti',title:'Pre-check-in',subtitle:'Inserisci solo i dati necessari per la registrazione del soggiorno. Richiede pochi minuti.',loading:'Caricamento prenotazione…',travelType:'Gli ospiti viaggiano come:',family:'Famiglia',group:'Gruppo / amici',addGuest:'+ Aggiungi ospite',submit:'Invia dati',privacyText:'Confermo che i dati inseriti sono corretti e autorizzo il loro trattamento per gli adempimenti di legge relativi al soggiorno.',privacyLink:'Privacy',photoSecurityTitle:'Foto documento:',photoSecurity:'viene conservata in area privata solo per il tempo necessario alla verifica. Dopo la verifica viene eliminata; è inoltre prevista una scadenza tecnica massima di 24 ore.',doneTitle:'Pre-check-in completato',doneText:'Grazie. I dati sono stati ricevuti correttamente. Non devi fare altro.',errorTitle:'Link non disponibile',lead:'Ospite principale',guest:'Ospite',remove:'Rimuovi',first:'Nome',last:'Cognome',sex:'Sesso',male:'Maschio',female:'Femmina',birthDate:'Data di nascita',birthCountry:'Stato di nascita',birthCity:'Comune di nascita',birthProvince:'Provincia di nascita',citizenship:'Cittadinanza',resCountry:'Stato di residenza',resCity:'Comune / località di residenza',docTitle:'Documento dell’ospite principale',docHelp:'Gli estremi del documento sono richiesti solo per l’ospite principale/capogruppo. Agli altri ospiti non li chiediamo.',docType:'Tipo documento',docNumber:'Numero documento',docIssuer:'Luogo di rilascio',docIssuerNote:'Comune italiano oppure Stato estero',photo:'Foto del documento',photoHelp:'Scatta o carica una foto leggibile. Non sarà pubblica.',photoReady:'Foto selezionata',photoStored:'Foto già ricevuta. Puoi sostituirla scegliendone un’altra.',select:'Seleziona…',idcard:'Carta d’identità',passport:'Passaporto',driving:'Patente',other:'Altro documento',required:'Completa i campi obbligatori.',photoRequired:'Carica la foto del documento dell’ospite principale.',privacyRequired:'Devi confermare il trattamento dei dati per gli adempimenti del soggiorno.',sending:'Invio in corso…',sent:'Dati inviati correttamente.',genericError:'Si è verificato un errore. Riprova.',linkError:'Il link non è valido, è scaduto oppure la prenotazione non è più disponibile.',alreadySubmitted:'I dati erano già stati inviati. Puoi correggerli e inviarli di nuovo finché non vengono verificati.',booking:'Soggiorno'},
 en:{eyebrow:'Guest registration',title:'Pre-check-in',subtitle:'Enter only the information required to register your stay. It takes just a few minutes.',loading:'Loading booking…',travelType:'The guests are travelling as a:',family:'Family',group:'Group / friends',addGuest:'+ Add guest',submit:'Send details',privacyText:'I confirm that the information entered is correct and I authorise its processing for the legal requirements related to the stay.',privacyLink:'Privacy',photoSecurityTitle:'Document photo:',photoSecurity:'it is kept in a private area only for the time needed for verification. It is deleted after verification, with a technical maximum retention period of 24 hours.',doneTitle:'Pre-check-in completed',doneText:'Thank you. Your details have been received successfully. Nothing else is required.',errorTitle:'Link unavailable',lead:'Lead guest',guest:'Guest',remove:'Remove',first:'First name',last:'Last name',sex:'Sex',male:'Male',female:'Female',birthDate:'Date of birth',birthCountry:'Country of birth',birthCity:'City/town of birth',birthProvince:'Province of birth',citizenship:'Citizenship',resCountry:'Country of residence',resCity:'City / place of residence',docTitle:'Lead guest document',docHelp:'Document details are required only for the lead guest/group leader. We do not ask them for the other guests.',docType:'Document type',docNumber:'Document number',docIssuer:'Place of issue',docIssuerNote:'Italian municipality or foreign country',photo:'Document photo',photoHelp:'Take or upload a clear, readable photo. It will not be public.',photoReady:'Photo selected',photoStored:'Photo already received. You can replace it by selecting another one.',select:'Select…',idcard:'Identity card',passport:'Passport',driving:'Driving licence',other:'Other document',required:'Please complete all required fields.',photoRequired:'Please upload the lead guest’s document photo.',privacyRequired:'Please confirm data processing for the legal requirements of the stay.',sending:'Sending…',sent:'Details sent successfully.',genericError:'Something went wrong. Please try again.',linkError:'This link is invalid, expired, or the booking is no longer available.',alreadySubmitted:'These details were already submitted. You can correct and resend them until they are verified.',booking:'Stay'}
};
const T=k=>tr[lang][k]||k;
const isItaly=v=>/^(italia|italy|it)$/i.test(String(v||'').trim());
const blankLead=()=>({guest_role:'lead',first_name:'',last_name:'',sex:'',birth_date:'',birth_country:'Italia',birth_city:'',birth_province:'',citizenship:'Italia',residence_country:'Italia',residence_city:'',document_type:'',document_number:'',document_issuer:''});
const blankMember=()=>{const lead=guests[0]||blankLead();return {guest_role:groupType==='family'?'family':'group_member',first_name:'',last_name:'',sex:'',birth_date:'',birth_country:lead.birth_country||'Italia',birth_city:'',birth_province:'',citizenship:lead.citizenship||'Italia',residence_country:lead.residence_country||'Italia',residence_city:lead.residence_city||'',document_type:'',document_number:'',document_issuer:''}};

async function api(body){
 const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||T('genericError'));return data;
}
function fmtDate(s){if(!s)return'';const [y,m,d]=s.split('-').map(Number);return new Intl.DateTimeFormat(lang==='en'?'en-GB':'it-IT',{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d))}
function setText(){document.documentElement.lang=lang;q('#lang').value=lang;document.querySelectorAll('[data-i]').forEach(el=>{const k=el.dataset.i;if(tr[lang][k])el.textContent=tr[lang][k]});if(booking)showBooking();render();}
function showBooking(){q('#bookingSummary').hidden=false;q('#bookingName').textContent=booking.guest_name||'Civico 26';q('#bookingDates').textContent=`${T('booking')}: ${fmtDate(booking.start_date)} → ${fmtDate(booking.end_date)}`}
function field(label,field,value,type='text',extra='') {return `<div><label>${label}</label><input data-field="${field}" type="${type}" value="${esc(value)}" ${extra}></div>`}
function sexField(g){return `<div><label>${T('sex')}</label><select data-field="sex" required><option value="">${T('select')}</option><option value="M" ${g.sex==='M'?'selected':''}>${T('male')}</option><option value="F" ${g.sex==='F'?'selected':''}>${T('female')}</option></select></div>`}
function docTypeField(g){return `<div><label>${T('docType')}</label><select data-field="document_type" required><option value="">${T('select')}</option><option value="identity_card" ${g.document_type==='identity_card'?'selected':''}>${T('idcard')}</option><option value="passport" ${g.document_type==='passport'?'selected':''}>${T('passport')}</option><option value="driving_licence" ${g.document_type==='driving_licence'?'selected':''}>${T('driving')}</option><option value="other" ${g.document_type==='other'?'selected':''}>${T('other')}</option></select></div>`}
function renderGuest(g,i){
 const italy=isItaly(g.birth_country);const lead=i===0;
 return `<section class="card guest-card" data-guest="${i}"><div class="card-head"><div><h2>${lead?T('lead'):`${T('guest')} ${i+1}`}</h2></div>${lead?'<span class="badge">Lead</span>':`<button type="button" class="guest-remove" data-remove="${i}">${T('remove')}</button>`}</div><div class="grid">
 ${field(T('first'),'first_name',g.first_name,'text','autocomplete="given-name" required')}${field(T('last'),'last_name',g.last_name,'text','autocomplete="family-name" required')}${sexField(g)}${field(T('birthDate'),'birth_date',g.birth_date,'date','required')}${field(T('birthCountry'),'birth_country',g.birth_country,'text','list="countries" required')}${italy?field(T('birthCity'),'birth_city',g.birth_city,'text','required')+field(T('birthProvince'),'birth_province',g.birth_province,'text','maxlength="2" placeholder="RC" required'):''}${field(T('citizenship'),'citizenship',g.citizenship,'text','list="countries" required')}${field(T('resCountry'),'residence_country',g.residence_country,'text','list="countries" required')}${field(T('resCity'),'residence_city',g.residence_city,'text','required')}
 </div>${lead?`<div class="doc-box"><h3>${T('docTitle')}</h3><p>${T('docHelp')}</p><div class="grid">${docTypeField(g)}${field(T('docNumber'),'document_number',g.document_number,'text','required')}${field(T('docIssuer'),'document_issuer',g.document_issuer,'text','required')}<div><div class="field-note">${T('docIssuerNote')}</div></div></div><div class="photo-drop"><label>${T('photo')}</label><input id="photoInput" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment"><div class="field-note">${T('photoHelp')}</div><div class="photo-status">${photoFile?`${T('photoReady')}: ${esc(photoFile.name)}`:(hasPhoto?T('photoStored'):'')}</div></div></div>`:''}</section>`
}
function render(){
 if(!q('#guests')||q('#app').hidden)return;
 q('#groupType').classList.toggle('show',guests.length>1);q('#groupType').querySelectorAll('[data-group]').forEach(b=>b.classList.toggle('active',b.dataset.group===groupType));
 guests.forEach((g,i)=>g.guest_role=i===0?'lead':(groupType==='family'?'family':'group_member'));
 q('#guests').innerHTML=guests.map(renderGuest).join('')+`<datalist id="countries"><option value="Italia"><option value="Francia"><option value="Germania"><option value="Spagna"><option value="Regno Unito"><option value="Stati Uniti"><option value="Canada"><option value="Svizzera"><option value="Belgio"><option value="Paesi Bassi"><option value="Romania"><option value="Polonia"><option value="Albania"><option value="Grecia"><option value="Portogallo"><option value="Argentina"><option value="Brasile"><option value="Australia"></datalist>`;
}
function notice(msg,type='error'){const n=q('#notice');n.textContent=msg;n.className=`notice show ${type}`;n.scrollIntoView({behavior:'smooth',block:'nearest'})}
function clearNotice(){q('#notice').className='notice';q('#notice').textContent=''}
function validate(){
 for(let i=0;i<guests.length;i++){const g=guests[i];for(const k of ['first_name','last_name','sex','birth_date','birth_country','citizenship','residence_country','residence_city'])if(!String(g[k]||'').trim())return false;if(isItaly(g.birth_country)&&(!g.birth_city||!g.birth_province))return false;if(i===0&&(!g.document_type||!g.document_number||!g.document_issuer))return false}return true
}
async function submit(){
 clearNotice();if(!validate())return notice(T('required'));if(!hasPhoto&&!photoFile)return notice(T('photoRequired'));if(!q('#privacyOk').checked)return notice(T('privacyRequired'));
 const btn=q('#submitBtn'),old=btn.textContent;btn.disabled=true;btn.textContent=T('sending');
 try{
  const fd=new FormData();fd.append('action','submit');fd.append('token',token);fd.append('guests',JSON.stringify(guests));if(photoFile)fd.append('photo',photoFile,photoFile.name);
  const r=await fetch(API,{method:'POST',headers:{'apikey':SUPABASE_KEY},body:fd});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||T('genericError'));
  submitted=true;q('#app').hidden=true;q('#done').hidden=false;q('#done').scrollIntoView({behavior:'smooth',block:'center'});
 }catch(e){notice(e.message||T('genericError'));btn.disabled=false;btn.textContent=old}
}
function bind(){
 q('#lang').addEventListener('change',e=>{lang=e.target.value==='en'?'en':'it';localStorage.setItem('civico26-lang',lang);setText()});
 q('#guests').addEventListener('input',e=>{const card=e.target.closest('[data-guest]');if(!card||!e.target.dataset.field)return;const i=Number(card.dataset.guest),field=e.target.dataset.field;guests[i][field]=e.target.value;if(field==='birth_country')render()});
 q('#guests').addEventListener('change',e=>{if(e.target.id==='photoInput'){photoFile=e.target.files?.[0]||null;render();return}const card=e.target.closest('[data-guest]');if(card&&e.target.dataset.field)guests[Number(card.dataset.guest)][e.target.dataset.field]=e.target.value});
 q('#guests').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;guests.splice(Number(b.dataset.remove),1);render()});
 q('#addGuest').addEventListener('click',()=>{guests.push(blankMember());render();setTimeout(()=>q(`[data-guest="${guests.length-1}"]`)?.scrollIntoView({behavior:'smooth',block:'start'}),50)});
 q('#groupType').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(!b)return;groupType=b.dataset.group;render()});
 q('#submitBtn').addEventListener('click',submit);
}
async function init(){
 q('#lang').value=lang;if(token.length<32){q('#loading').hidden=true;q('#fatal').hidden=false;q('#fatalText').textContent=T('linkError');setText();return}
 try{
  const data=await api({action:'get',token});booking=data.booking;hasPhoto=!!data.session?.has_photo;guests=(data.guests||[]).map(g=>({...g}));if(!guests.length)guests=[blankLead()];if(guests.length>1)groupType=guests[1].guest_role==='family'?'family':'group';submitted=data.session?.status==='submitted';q('#loading').hidden=true;
  if(data.session?.status==='verified'){q('#done').hidden=false}else{q('#app').hidden=false;showBooking();render();bind();if(submitted)notice(T('alreadySubmitted'),'ok')}
  setText();
 }catch(e){q('#loading').hidden=true;q('#fatal').hidden=false;q('#fatalText').textContent=e.message||T('linkError');setText()}
}
init();
})();
