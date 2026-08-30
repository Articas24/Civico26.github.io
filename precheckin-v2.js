(()=>{
'use strict';

const SUPABASE_URL='https://wfhdtwzpjcaicxdrphcu.supabase.co';
const SUPABASE_KEY='sb_publishable_3SGl7pKrqv_uT8GIW2N8RA_Xook19Uh';
const API=`${SUPABASE_URL}/functions/v1/precheckin`;
const MAX_GUESTS=8;
const token=new URLSearchParams(location.search).get('t')||'';
const q=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let lang=localStorage.getItem('civico26-lang')==='en'?'en':'it';
let booking=null;
let guests=[];
let hasPhoto=false;
let photoFile=null;
let groupType='group';
let activeGuest=0;
let reviewOpen=false;
let formBound=false;

const tr={
 it:{
  eyebrow:'Registrazione ospiti',title:'Pre-check-in',subtitle:'Inserisci solo i dati necessari per la registrazione del soggiorno. Richiede pochi minuti.',loading:'Caricamento prenotazione…',
  instructionsTitle:'Come compilare il pre check-in',instructionsText:'Inserisci i dati richiesti per il primo ospite. Se soggiorneranno con te altre persone, ricordati di premere <strong>“Aggiungi ospite”</strong> e compilare una scheda per ciascuna di loro, compresi i minori.<br><br>Ti chiediamo gentilmente di verificare che i dati siano completi e corretti prima dell’invio. Grazie per la collaborazione!',
  guestCountLabel:'Quante persone soggiorneranno?',guestCountHelp:'Prepareremo automaticamente una scheda per ogni ospite, compresi i minori.',travelType:'Gli ospiti viaggiano come:',family:'Famiglia',group:'Gruppo / amici',
  guestNavLabel:'Schede degli ospiti',guestProgress:'Ospite {current} di {total}',completedCount:'{done} di {total} completati',complete:'Completa',incomplete:'Da completare',requiredNote:'Tutti i campi sono obbligatori',
  previous:'← Indietro',next:'Avanti →',goToReview:'Vai al riepilogo →',addGuest:'＋ Aggiungi ospite',maxGuests:'Hai raggiunto il massimo di 8 ospiti.',
  finalCheck:'Controllo finale',reviewTitle:'Riepilogo degli ospiti',reviewHelp:'Verifica i dati prima dell’invio. Puoi tornare a ogni scheda per modificarla.',edit:'Modifica',editGuests:'Modifica le schede',oneGuest:'1 ospite',manyGuests:'{count} ospiti',
  confirmReduce:'Riducendo il numero di ospiti verranno eliminate le ultime schede già compilate. Vuoi continuare?',confirmRemove:'Vuoi eliminare questa scheda ospite?',completeBeforeReview:'Prima del riepilogo, completa i dati indicati.',
  addGuestButton:'Aggiungi ospite',submit:'Invia dati',privacyText:'Confermo che i dati inseriti sono corretti e autorizzo il loro trattamento per gli adempimenti di legge relativi al soggiorno.',privacyLink:'Privacy',
  photoSecurityTitle:'Foto documento:',photoSecurity:'viene conservata in area privata solo per il tempo necessario alla verifica. Dopo la verifica viene eliminata; la scadenza automatica della foto è impostata a 24 ore.',
  doneTitle:'Pre-check-in completato',doneText:'Grazie. I dati sono stati ricevuti correttamente. Non devi fare altro.',errorTitle:'Link non disponibile',
  lead:'Ospite principale',leadBadge:'Principale',guest:'Ospite',remove:'Elimina',first:'Nome',last:'Cognome',sex:'Sesso',male:'Maschio',female:'Femmina',birthDate:'Data di nascita',birthCountry:'Stato di nascita',birthCity:'Comune di nascita',birthProvince:'Provincia di nascita',citizenship:'Cittadinanza',resCountry:'Stato di residenza',resCity:'Comune / località di residenza',
  docTitle:'Documento dell’ospite principale',docHelp:'Gli estremi del documento sono richiesti solo per l’ospite principale/capogruppo. Agli altri ospiti non li chiediamo.',docType:'Tipo documento',docNumber:'Numero documento',docIssuer:'Luogo di rilascio',docIssuerNote:'Comune italiano oppure Stato estero',photo:'Foto del documento',photoHelp:'Scatta o carica una foto leggibile. Non sarà pubblica.',photoReady:'Foto selezionata',photoStored:'Foto già ricevuta. Puoi sostituirla scegliendone un’altra.',
  select:'Seleziona…',countrySearch:'Cerca uno Stato…',countryNoResults:'Nessuno Stato trovato',historicalCountry:'storico',idcard:'Carta d’identità',passport:'Passaporto',driving:'Patente',required:'Completa il campo',photoRequired:'Carica la foto del documento dell’ospite principale.',privacyRequired:'Devi confermare il trattamento dei dati per gli adempimenti del soggiorno.',sending:'Invio in corso…',genericError:'Si è verificato un errore. Riprova.',linkError:'Il link non è valido, è scaduto oppure la prenotazione non è più disponibile.',alreadySubmitted:'I dati erano già stati inviati. Puoi correggerli e inviarli di nuovo finché non vengono verificati.',booking:'Soggiorno'
 },
 en:{
  eyebrow:'Guest registration',title:'Pre-check-in',subtitle:'Enter only the information required to register your stay. It takes just a few minutes.',loading:'Loading booking…',
  instructionsTitle:'How to complete pre-check-in',instructionsText:'Enter the details requested for the lead guest. If other people are staying with you, remember to select <strong>“Add guest”</strong> and complete one card for each person, including children.<br><br>Please check that all details are complete and correct before sending them. Thank you for your help!',
  guestCountLabel:'How many people will be staying?',guestCountHelp:'We will automatically prepare one card for every guest, including children.',travelType:'The guests are travelling as a:',family:'Family',group:'Group / friends',
  guestNavLabel:'Guest cards',guestProgress:'Guest {current} of {total}',completedCount:'{done} of {total} completed',complete:'Complete',incomplete:'To complete',requiredNote:'All fields are required',
  previous:'← Back',next:'Next →',goToReview:'Go to summary →',addGuest:'＋ Add guest',maxGuests:'You have reached the maximum of 8 guests.',
  finalCheck:'Final check',reviewTitle:'Guest summary',reviewHelp:'Check the details before sending. You can return to any card to edit it.',edit:'Edit',editGuests:'Edit guest cards',oneGuest:'1 guest',manyGuests:'{count} guests',
  confirmReduce:'Reducing the number of guests will delete the last completed cards. Do you want to continue?',confirmRemove:'Do you want to delete this guest card?',completeBeforeReview:'Before viewing the summary, complete the highlighted details.',
  addGuestButton:'Add guest',submit:'Send details',privacyText:'I confirm that the information entered is correct and I authorise its processing for the legal requirements related to the stay.',privacyLink:'Privacy',
  photoSecurityTitle:'Document photo:',photoSecurity:'it is kept in a private area only for the time needed for verification. It is deleted after verification, and the photo is set to expire automatically after 24 hours.',
  doneTitle:'Pre-check-in completed',doneText:'Thank you. Your details have been received successfully. Nothing else is required.',errorTitle:'Link unavailable',
  lead:'Lead guest',leadBadge:'Lead',guest:'Guest',remove:'Delete',first:'First name',last:'Last name',sex:'Sex',male:'Male',female:'Female',birthDate:'Date of birth',birthCountry:'Country of birth',birthCity:'City/town of birth',birthProvince:'Province of birth',citizenship:'Citizenship',resCountry:'Country of residence',resCity:'City / place of residence',
  docTitle:'Lead guest document',docHelp:'Document details are required only for the lead guest/group leader. We do not ask them for the other guests.',docType:'Document type',docNumber:'Document number',docIssuer:'Place of issue',docIssuerNote:'Italian municipality or foreign country',photo:'Document photo',photoHelp:'Take or upload a clear, readable photo. It will not be public.',photoReady:'Photo selected',photoStored:'Photo already received. You can replace it by selecting another one.',
  select:'Select…',countrySearch:'Search for a country…',countryNoResults:'No country found',historicalCountry:'historical',idcard:'Identity card',passport:'Passport',driving:'Driving licence',required:'Complete the field',photoRequired:'Please upload the lead guest’s document photo.',privacyRequired:'Please confirm data processing for the legal requirements of the stay.',sending:'Sending…',genericError:'Something went wrong. Please try again.',linkError:'This link is invalid, expired, or the booking is no longer available.',alreadySubmitted:'These details were already submitted. You can correct and resend them until they are verified.',booking:'Stay'
 }
};

const T=k=>tr[lang][k]||k;
const F=(k,values={})=>Object.entries(values).reduce((text,[name,value])=>text.replaceAll(`{${name}}`,value),T(k));
const labels={first_name:'first',last_name:'last',sex:'sex',birth_date:'birthDate',birth_country:'birthCountry',birth_city:'birthCity',birth_province:'birthProvince',citizenship:'citizenship',residence_country:'resCountry',residence_city:'resCity',document_type:'docType',document_number:'docNumber',document_issuer:'docIssuer'};
const countries=Array.isArray(window.CIVICO_COUNTRIES)?window.CIVICO_COUNTRIES:[];
const normalizeCountry=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^a-z0-9]/g,'');
const countryByValue=value=>countries.find(country=>normalizeCountry(country.value)===normalizeCountry(value)||normalizeCountry(country.it)===normalizeCountry(value)||normalizeCountry(country.en)===normalizeCountry(value));
const countryLabel=country=>country?.[lang]||country?.it||'';
const isItaly=v=>/^(italia|italy|it)$/i.test(String(v||'').trim());
const blankLead=()=>({guest_role:'lead',first_name:'',last_name:'',sex:'',birth_date:'',birth_country:'Italia',birth_city:'',birth_province:'',citizenship:'Italia',residence_country:'Italia',residence_city:'',document_type:'',document_number:'',document_issuer:''});
const blankMember=()=>{const lead=guests[0]||blankLead();return {guest_role:groupType==='family'?'family':'group_member',first_name:'',last_name:'',sex:'',birth_date:'',birth_country:lead.birth_country||'Italia',birth_city:'',birth_province:'',citizenship:lead.citizenship||'Italia',residence_country:lead.residence_country||'Italia',residence_city:lead.residence_city||'',document_type:'',document_number:'',document_issuer:''}};

async function api(body){
 const response=await fetch(API,{method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||T('genericError'));
 return data;
}

function fmtDate(value){
 if(!value)return'';
 const [year,month,day]=value.split('-').map(Number);
 return new Intl.DateTimeFormat(lang==='en'?'en-GB':'it-IT',{day:'numeric',month:'short',year:'numeric'}).format(new Date(year,month-1,day));
}

function field(label,name,value,index,type='text',extra=''){
 const id=`guest-${index}-${name}`;
 return `<div><label for="${id}">${label}</label><input id="${id}" data-field="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
}

function countryOptions(query=''){
 const needle=normalizeCountry(query);
 return countries.filter(country=>!needle||[country.it,country.en,country.value,country.iso].some(value=>normalizeCountry(value).includes(needle))).sort((a,b)=>{
  if(a.active!==b.active)return a.active?-1:1;
  return countryLabel(a).localeCompare(countryLabel(b),lang,{sensitivity:'base'});
 });
}

function countryOptionsHtml(query=''){
 const matches=countryOptions(query);
 if(!matches.length)return `<div class="country-empty">${T('countryNoResults')}</div>`;
 return matches.map(country=>`<button type="button" role="option" data-country-option="${esc(country.value)}"><span>${esc(countryLabel(country))}</span>${country.active?'':`<small>${T('historicalCountry')}</small>`}</button>`).join('');
}

function countryField(label,name,value,index){
 const id=`guest-${index}-${name}`;
 const country=countryByValue(value);
 const canonical=country?.value||'';
 return `<div class="country-picker"><label for="${id}-search">${label}</label><input id="${id}-search" class="country-search" data-country-search="${name}" type="text" value="${esc(countryLabel(country))}" placeholder="${T('countrySearch')}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list" required><input id="${id}" data-field="${name}" type="hidden" value="${esc(canonical)}"><div id="${id}-list" class="country-list" role="listbox" hidden>${countryOptionsHtml()}</div></div>`;
}

function sexField(guest,index){
 const id=`guest-${index}-sex`;
 return `<div><label for="${id}">${T('sex')}</label><select id="${id}" data-field="sex" required><option value="">${T('select')}</option><option value="M" ${guest.sex==='M'?'selected':''}>${T('male')}</option><option value="F" ${guest.sex==='F'?'selected':''}>${T('female')}</option></select></div>`;
}

function documentTypeField(guest,index){
 const id=`guest-${index}-document_type`;
 return `<div><label for="${id}">${T('docType')}</label><select id="${id}" data-field="document_type" required><option value="">${T('select')}</option><option value="identity_card" ${guest.document_type==='identity_card'?'selected':''}>${T('idcard')}</option><option value="passport" ${guest.document_type==='passport'?'selected':''}>${T('passport')}</option><option value="driving_licence" ${guest.document_type==='driving_licence'?'selected':''}>${T('driving')}</option></select></div>`;
}

function missingField(guest,index){
 for(const key of ['first_name','last_name','sex','birth_date','birth_country','citizenship','residence_country','residence_city']){
  if(!String(guest[key]||'').trim())return key;
 }
 if(isItaly(guest.birth_country)&&!String(guest.birth_city||'').trim())return'birth_city';
 if(isItaly(guest.birth_country)&&!String(guest.birth_province||'').trim())return'birth_province';
 if(index===0){
  for(const key of ['document_type','document_number','document_issuer']){
   if(!String(guest[key]||'').trim())return key;
  }
 }
 return null;
}

function guestComplete(guest,index){
 if(missingField(guest,index))return false;
 return index!==0||hasPhoto||!!photoFile;
}

function hasPersonalData(guest){
 return ['first_name','last_name','sex','birth_date','birth_city','birth_province','document_number','document_issuer'].some(key=>String(guest[key]||'').trim());
}

function sync(){
 document.querySelectorAll('[data-guest]').forEach(card=>{
  const index=Number(card.dataset.guest);
  if(!guests[index])return;
  card.querySelectorAll('[data-field]').forEach(element=>guests[index][element.dataset.field]=element.value);
 });
}

function setRoles(){
 guests.forEach((guest,index)=>guest.guest_role=index===0?'lead':(groupType==='family'?'family':'group_member'));
}

function guestHtml(guest,index){
 const lead=index===0;
 const italy=isItaly(guest.birth_country);
 return `<section class="card guest-card" data-guest="${index}" aria-labelledby="guest-title-${index}">
  <div class="card-head"><div><h2 id="guest-title-${index}">${lead?T('lead'):`${T('guest')} ${index+1}`}</h2><span class="required-note">${T('requiredNote')}</span></div>${lead?`<span class="badge">${T('leadBadge')}</span>`:`<button type="button" class="guest-remove" data-remove="${index}">${T('remove')}</button>`}</div>
  <div class="grid">
   ${field(T('first'),'first_name',guest.first_name,index,'text','autocomplete="given-name" required')}
   ${field(T('last'),'last_name',guest.last_name,index,'text','autocomplete="family-name" required')}
   ${sexField(guest,index)}
   ${field(T('birthDate'),'birth_date',guest.birth_date,index,'date','required')}
   ${countryField(T('birthCountry'),'birth_country',guest.birth_country,index)}
   ${italy?field(T('birthCity'),'birth_city',guest.birth_city,index,'text','required')+field(T('birthProvince'),'birth_province',guest.birth_province,index,'text','maxlength="2" placeholder="RC" required'):''}
   ${countryField(T('citizenship'),'citizenship',guest.citizenship,index)}
   ${countryField(T('resCountry'),'residence_country',guest.residence_country,index)}
   ${field(T('resCity'),'residence_city',guest.residence_city,index,'text','required')}
  </div>
  ${lead?`<div class="doc-box"><h3>${T('docTitle')}</h3><p>${T('docHelp')}</p><div class="grid">${documentTypeField(guest,index)}${field(T('docNumber'),'document_number',guest.document_number,index,'text','required')}${field(T('docIssuer'),'document_issuer',guest.document_issuer,index,'text','required')}<div><div class="field-note">${T('docIssuerNote')}</div></div></div><div class="photo-drop"><label for="photoInput">${T('photo')}</label><input id="photoInput" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment"><div class="field-note">${T('photoHelp')}</div><div class="photo-status">${photoFile?`${T('photoReady')}: ${esc(photoFile.name)}`:(hasPhoto?T('photoStored'):'')}</div></div></div>`:''}
 </section>`;
}

function updateCountControl(){
 const select=q('#guestCount');
 const upper=Math.max(MAX_GUESTS,guests.length);
 select.innerHTML=Array.from({length:upper},(_,index)=>`<option value="${index+1}">${index+1}</option>`).join('');
 select.value=String(guests.length);
}

function updateCompletionUI(){
 const completed=guests.filter((guest,index)=>guestComplete(guest,index)).length;
 q('#guestProgressStatus').textContent=F('completedCount',{done:completed,total:guests.length});
 q('#guestNav').querySelectorAll('[data-open-guest]').forEach(button=>{
  const index=Number(button.dataset.openGuest);
  button.classList.toggle('complete',guestComplete(guests[index],index));
 });
}

function renderReview(){
 q('#reviewCount').textContent=guests.length===1?T('oneGuest'):F('manyGuests',{count:guests.length});
 q('#reviewList').innerHTML=guests.map((guest,index)=>{
  const name=`${guest.first_name||''} ${guest.last_name||''}`.trim()||(index===0?T('lead'):`${T('guest')} ${index+1}`);
  const role=index===0?T('lead'):`${T('guest')} ${index+1}`;
  const remove=index===0?'':`<button type="button" class="review-remove" data-review-remove="${index}">${T('remove')}</button>`;
  return `<article class="review-row"><div><span class="review-name">${esc(name)}</span><span class="review-meta">${role} · ${T('complete')}</span></div><div class="review-row-actions"><button type="button" class="review-edit" data-edit-guest="${index}">${T('edit')}</button>${remove}</div></article>`;
 }).join('');
 q('#reviewAddGuest').disabled=guests.length>=MAX_GUESTS;
 q('#reviewAddGuest').title=guests.length>=MAX_GUESTS?T('maxGuests'):'';
}

function render(){
 if(!q('#app')||q('#app').hidden)return;
 if(!guests.length)guests=[blankLead()];
 setRoles();
 activeGuest=Math.max(0,Math.min(activeGuest,guests.length-1));
 updateCountControl();
 q('#guestEditor').hidden=reviewOpen;
 q('#reviewPanel').hidden=!reviewOpen;
 q('#reviewActions').hidden=!reviewOpen;

 if(reviewOpen){
  renderReview();
  return;
 }

 q('#groupType').classList.toggle('show',guests.length>1);
 q('#groupType').querySelectorAll('[data-group]').forEach(button=>button.classList.toggle('active',button.dataset.group===groupType));
 q('#guestProgress').textContent=F('guestProgress',{current:activeGuest+1,total:guests.length});
 q('#guestProgressBar').style.width=`${((activeGuest+1)/guests.length)*100}%`;
 q('#guestNav').setAttribute('aria-label',T('guestNavLabel'));
 q('#guestNav').innerHTML=guests.map((guest,index)=>{
  const active=index===activeGuest;
  const label=index===0?T('lead'):`${T('guest')} ${index+1}`;
  return `<button type="button" role="tab" class="guest-tab${active?' active':''}${guestComplete(guest,index)?' complete':''}" data-open-guest="${index}" aria-selected="${active}" aria-label="${esc(label)}"><span class="guest-tab-status" aria-hidden="true"></span>${esc(label)}</button>`;
 }).join('');
 q('#guests').innerHTML=guestHtml(guests[activeGuest],activeGuest);
 q('#prevGuest').hidden=activeGuest===0;
 q('#nextGuest').textContent=activeGuest===guests.length-1?T('goToReview'):T('next');
 q('#addGuest').disabled=guests.length>=MAX_GUESTS;
 q('#addGuest').title=guests.length>=MAX_GUESTS?T('maxGuests'):'';
 updateCompletionUI();
 requestAnimationFrame(()=>q(`[data-open-guest="${activeGuest}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
}

function showBooking(){
 if(!booking)return;
 q('#bookingSummary').hidden=false;
 q('#bookingName').textContent=booking.guest_name||'Civico 26';
 q('#bookingDates').textContent=`${T('booking')}: ${fmtDate(booking.start_date)} → ${fmtDate(booking.end_date)}`;
}

function applyLanguage(){
 document.documentElement.lang=lang;
 q('#lang').value=lang;
 document.querySelectorAll('[data-i]').forEach(element=>{if(tr[lang][element.dataset.i])element.textContent=tr[lang][element.dataset.i]});
 document.querySelectorAll('[data-i-html]').forEach(element=>{if(tr[lang][element.dataset.iHtml])element.innerHTML=tr[lang][element.dataset.iHtml]});
 showBooking();
 render();
}

function notice(message,type='error',shouldScroll=true){
 const element=q('#notice');
 element.textContent=message;
 element.className=`notice show ${type}`;
 element.setAttribute('role',type==='error'?'alert':'status');
 if(shouldScroll)element.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function clearNotice(){
 q('#notice').className='notice';
 q('#notice').textContent='';
 q('#notice').removeAttribute('role');
}

function validate(){
 sync();
 for(let index=0;index<guests.length;index++){
  const key=missingField(guests[index],index);
  if(key)return {index,key};
 }
 return null;
}

function focusInvalid({index,key}){
 reviewOpen=false;
 activeGuest=index;
 render();
 const who=index?`${T('guest')} ${index+1} · `:'';
 notice(`${who}${T('required')}: ${T(labels[key]||key)}. ${T('completeBeforeReview')}`,'error',false);
 setTimeout(()=>{
  const element=q(`[data-guest="${index}"] [data-country-search="${key}"]`)||q(`[data-guest="${index}"] [data-field="${key}"]`);
  if(!element)return;
  element.classList.add('invalid-field');
  element.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>element.focus({preventScroll:true}),300);
 },30);
}

function focusPhoto(){
 reviewOpen=false;
 activeGuest=0;
 render();
 notice(`${T('photoRequired')} ${T('completeBeforeReview')}`,'error',false);
 setTimeout(()=>{
  const element=q('#photoInput');
  element?.classList.add('invalid-field');
  element?.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>element?.focus({preventScroll:true}),300);
 },30);
}

function openReview(){
 clearNotice();
 const invalid=validate();
 if(invalid)return focusInvalid(invalid);
 if(!hasPhoto&&!photoFile)return focusPhoto();
 reviewOpen=true;
 render();
 setTimeout(()=>q('#reviewPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
}

function openGuest(index,scroll=true){
 sync();
 reviewOpen=false;
 activeGuest=Math.max(0,Math.min(index,guests.length-1));
 clearNotice();
 render();
 if(scroll)setTimeout(()=>q('#guestProgress')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
}

function addGuest(){
 sync();
 if(guests.length>=MAX_GUESTS)return notice(T('maxGuests'));
 guests.push(blankMember());
 openGuest(guests.length-1);
}

function removeGuest(index){
 if(index<=0||!guests[index])return;
 if(hasPersonalData(guests[index])&&!confirm(T('confirmRemove')))return;
 guests.splice(index,1);
 activeGuest=Math.min(index,guests.length-1);
 render();
}

function resizeGuests(count){
 sync();
 const target=Math.max(1,Math.min(Number(count)||1,MAX_GUESTS));
 if(target<guests.length){
  const removingFilled=guests.slice(target).some(hasPersonalData);
  if(removingFilled&&!confirm(T('confirmReduce'))){
   q('#guestCount').value=String(guests.length);
   return;
  }
  guests=guests.slice(0,target);
  activeGuest=Math.min(activeGuest,target-1);
 }else{
  while(guests.length<target)guests.push(blankMember());
  activeGuest=Math.min(activeGuest,target-1);
 }
 reviewOpen=false;
 clearNotice();
 render();
}

async function submit(){
 clearNotice();
 const invalid=validate();
 if(invalid)return focusInvalid(invalid);
 if(!hasPhoto&&!photoFile)return focusPhoto();
 if(!q('#privacyOk').checked)return notice(T('privacyRequired'));
 const button=q('#submitBtn');
 const oldText=button.textContent;
 button.disabled=true;
 button.textContent=T('sending');
 try{
  const form=new FormData();
  form.append('action','submit');
  form.append('token',token);
  form.append('guests',JSON.stringify(guests));
  if(photoFile)form.append('photo',photoFile,photoFile.name);
  const response=await fetch(API,{method:'POST',headers:{'apikey':SUPABASE_KEY},body:form});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||T('genericError'));
  q('#app').hidden=true;
  q('#done').hidden=false;
  q('#done').scrollIntoView({behavior:'smooth',block:'center'});
 }catch(error){
  notice(error.message||T('genericError'));
  button.disabled=false;
  button.textContent=oldText;
 }
}

function bindLanguage(){
 q('#lang').addEventListener('change',event=>{
  sync();
  lang=event.target.value==='en'?'en':'it';
  localStorage.setItem('civico26-lang',lang);
  applyLanguage();
 });
}

function bindForm(){
 if(formBound)return;
 formBound=true;
 q('#guestCount').addEventListener('change',event=>resizeGuests(event.target.value));
 q('#guestNav').addEventListener('click',event=>{const button=event.target.closest('[data-open-guest]');if(button)openGuest(Number(button.dataset.openGuest))});
 q('#guests').addEventListener('input',event=>{
  if(event.target.dataset.countrySearch){
   const picker=event.target.closest('.country-picker');
   const hidden=picker.querySelector('[data-field]');
   const card=picker.closest('[data-guest]');
   hidden.value='';
   guests[Number(card.dataset.guest)][hidden.dataset.field]='';
   const list=picker.querySelector('.country-list');
   list.innerHTML=countryOptionsHtml(event.target.value);
   list.hidden=false;
   event.target.setAttribute('aria-expanded','true');
   event.target.classList.remove('invalid-field');
   updateCompletionUI();
   return;
  }
  const card=event.target.closest('[data-guest]');
  if(!card||!event.target.dataset.field)return;
  guests[Number(card.dataset.guest)][event.target.dataset.field]=event.target.value;
  event.target.classList.remove('invalid-field');
  updateCompletionUI();
 });
 q('#guests').addEventListener('focusin',event=>{
  if(!event.target.dataset.countrySearch)return;
  const picker=event.target.closest('.country-picker');
  const list=picker.querySelector('.country-list');
  list.innerHTML=countryOptionsHtml(event.target.value);
  list.hidden=false;
  event.target.setAttribute('aria-expanded','true');
 });
 q('#guests').addEventListener('keydown',event=>{
  if(!event.target.dataset.countrySearch)return;
  const picker=event.target.closest('.country-picker');
  const options=[...picker.querySelectorAll('[data-country-option]')];
  if(event.key==='Escape'){
   picker.querySelector('.country-list').hidden=true;
   event.target.setAttribute('aria-expanded','false');
   return;
  }
  if(!['ArrowDown','ArrowUp','Enter'].includes(event.key)||!options.length)return;
  event.preventDefault();
  let current=options.findIndex(option=>option.classList.contains('active'));
  if(event.key==='Enter'){
   (options[current<0?0:current]).click();
   return;
  }
  current=event.key==='ArrowDown'?Math.min(current+1,options.length-1):Math.max(current<0?options.length:current-1,0);
  options.forEach((option,index)=>option.classList.toggle('active',index===current));
  options[current].scrollIntoView({block:'nearest'});
 });
 q('#guests').addEventListener('click',event=>{
  const option=event.target.closest('[data-country-option]');
  if(!option)return;
  const picker=option.closest('.country-picker');
  const search=picker.querySelector('[data-country-search]');
  const hidden=picker.querySelector('[data-field]');
  const country=countryByValue(option.dataset.countryOption);
  const card=picker.closest('[data-guest]');
  search.value=countryLabel(country);
  search.setAttribute('aria-expanded','false');
  hidden.value=country.value;
  guests[Number(card.dataset.guest)][hidden.dataset.field]=country.value;
  picker.querySelector('.country-list').hidden=true;
  clearNotice();
  if(hidden.dataset.field==='birth_country')render();else updateCompletionUI();
 });
 document.addEventListener('click',event=>{
  document.querySelectorAll('.country-picker').forEach(picker=>{
   if(picker.contains(event.target))return;
   picker.querySelector('.country-list').hidden=true;
   picker.querySelector('[data-country-search]').setAttribute('aria-expanded','false');
  });
 });
 q('#guests').addEventListener('change',event=>{
  if(event.target.id==='photoInput'){
   sync();
   photoFile=event.target.files?.[0]||null;
   render();
   return;
  }
  const card=event.target.closest('[data-guest]');
  if(!card||!event.target.dataset.field)return;
  guests[Number(card.dataset.guest)][event.target.dataset.field]=event.target.value;
  event.target.classList.remove('invalid-field');
  if(event.target.dataset.field==='birth_country'){sync();render()}else updateCompletionUI();
 });
 q('#guests').addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(button)removeGuest(Number(button.dataset.remove))});
 q('#prevGuest').addEventListener('click',()=>openGuest(activeGuest-1));
 q('#nextGuest').addEventListener('click',()=>{sync();if(activeGuest<guests.length-1)openGuest(activeGuest+1);else openReview()});
 q('#addGuest').addEventListener('click',addGuest);
 q('#reviewAddGuest').addEventListener('click',addGuest);
 q('#groupType').addEventListener('click',event=>{const button=event.target.closest('[data-group]');if(!button)return;sync();groupType=button.dataset.group;render()});
 q('#reviewPanel').addEventListener('click',event=>{
  const edit=event.target.closest('[data-edit-guest]');
  if(edit)return openGuest(Number(edit.dataset.editGuest));
  const remove=event.target.closest('[data-review-remove]');
  if(remove)removeGuest(Number(remove.dataset.reviewRemove));
 });
 q('#editGuests').addEventListener('click',()=>openGuest(0));
 q('#submitBtn').addEventListener('click',submit);
}

async function init(){
 q('#lang').value=lang;
 bindLanguage();
 applyLanguage();
 if(token.length<32){
  q('#loading').hidden=true;
  q('#fatal').hidden=false;
  q('#fatalText').textContent=T('linkError');
  return;
 }
 try{
  const data=await api({action:'get',token});
  booking=data.booking;
  hasPhoto=!!data.session?.has_photo;
  guests=(data.guests||[]).map(guest=>({...guest}));
  if(!guests.length)guests=[blankLead()];
  if(guests.length>1)groupType=guests[1].guest_role==='family'?'family':'group';
  q('#loading').hidden=true;
  if(data.session?.status==='verified'){
   q('#done').hidden=false;
  }else{
   q('#app').hidden=false;
   bindForm();
  }
  applyLanguage();
  if(data.session?.status==='submitted'&&!q('#app').hidden)notice(T('alreadySubmitted'),'ok');
 }catch(error){
  q('#loading').hidden=true;
  q('#fatal').hidden=false;
  q('#fatalText').textContent=error.message||T('linkError');
  applyLanguage();
 }
}

init();
})();
