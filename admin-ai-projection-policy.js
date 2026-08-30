(()=>{
'use strict';
if(window.__civicoAIProjectionPolicy)return;window.__civicoAIProjectionPolicy=true;
if(!document.querySelector('script[data-civico-report-import]')){const s=document.createElement('script');s.src='admin-import.js?v=20260830-1845';s.defer=true;s.dataset.civicoReportImport='1';document.head.appendChild(s)}
const nativeFetch=window.fetch.bind(window);
let autoFollowQuick=false,chatObserver=null;
const POLICY=`POLITICA DI PROIEZIONE ECONOMICA PER LE NOTTI PRENOTATE SENZA IMPORTO:
1) Lavora mese per mese, mai usando automaticamente l'ADR dell'ultimo mese disponibile per tutti i mesi futuri.
2) Se il mese target ha già notti contabilizzate, usa SEMPRE l'ADR lordo e netto consuntivo di QUEL MESE: futuro lordo stimato = adr_gross_consuntivo del mese × notti del mese non ancora contabilizzate; futuro netto stimato = adr_net_consuntivo del mese × notti del mese non ancora contabilizzate.
3) Se il mese target non ha ancora alcuna notte contabilizzata o manca il suo ADR, usa come fallback l'ADR MEDIO STORICO PONDERATO: somma dei lordi reali dei mesi con notti valorizzate / somma delle relative notti valorizzate; per il netto fai la stessa cosa con finance.net_final. Non fare la media semplice degli ADR mensili.
4) Per periodi che attraversano più mesi, calcola la proiezione separatamente per ciascun mese e poi somma i risultati.
5) Presenta sempre consuntivo reale, futuro stimato e totale proiettato. Sono proiezioni, non incassi certi. La tariffa calendario è soltanto un confronto secondario.
6) Se la copertura economica del mese è parziale, non giudicare il ricavo/netto del mese come completo.`;
const SMART=`POLITICA DI ANALISI E RISPOSTA:
- Prima di scrivere, individua esattamente cosa sta chiedendo l'utente, seleziona SOLO i dati pertinenti, esegui i calcoli necessari e controlla che numeratore, denominatore e periodo siano coerenti.
- Non fare una panoramica generica se la domanda è specifica. Rispondi alla domanda nel primo blocco.
- La risposta DEVE iniziare con una riga che contiene soltanto: Risposta
- Subito sotto, in 1-3 frasi brevi, dai la conclusione diretta e numerica quando possibile. Non iniziare con premesse, definizioni o avvertenze.
- Dopo, usa la sezione Perché: per spiegare in modo semplice i 2-4 elementi decisivi. Aggiungi Dettagli utili: solo se porta informazioni realmente utili.
- Se c'è un limite dei dati che cambia la conclusione, dillo DOPO la risposta diretta in una sola frase e specifica se il valore è reale, parziale o stimato.
- Nei confronti annuali usa, quando sensato, anno in corso fino alla data disponibile contro lo stesso periodo dell'anno precedente, non un anno parziale contro un anno intero.
- Nei confronti del mese corrente con lo stesso mese dell'anno scorso, separa occupazione già nota da dati economici ancora parziali; non confrontare netti parziali come se fossero definitivi.
- Per capire se la gestione migliora o peggiora, usa più segnali coerenti: occupazione, ADR lordo/netto, netto finale, margine, durata soggiorno, lead time e andamento dei mesi comparabili. Non basarti su un singolo numero.
- Per il guadagno medio netto mensile usa finance.net_final e includi nella media solo mesi con copertura economica completa o sufficientemente consolidata; escludi i mesi ancora parziali e indica chiaramente quanti mesi e quale periodo hai usato.
- Per i consigli tariffari usa solo dati interni: stagionalità storica, ADR realmente ottenuto, occupazione, ritmo delle prenotazioni, lead time, date future libere/prenotate e prezzi impostati. Dai esattamente 3 consigli concreti e motivati; non inventare prezzi di mercato o concorrenti.
- Distingui FATTI, STIME e IPOTESI. Se non puoi sostenere una causa con i dati, non presentarla come certezza.
- Se i dati contraddicono una premessa dell'utente, correggila con tatto e numeri.
- Evita ripetizioni, frasi riempitive e conclusioni duplicate. Linguaggio semplice, concreto, da gestore di struttura ricettiva.`;
window.fetch=function(input,init){
 try{
  const url=typeof input==='string'?input:String(input?.url||'');
  if(url.includes('/functions/v1/admin-ai')&&init&&typeof init.body==='string'){
   const body=JSON.parse(init.body);
   if(typeof body?.message==='string'&&!body.message.includes('POLITICA DI ANALISI E RISPOSTA')){
    body.message=`${body.message}\n\n${POLICY}\n\n${SMART}`;
    init={...init,body:JSON.stringify(body)};
   }
  }
 }catch(_e){}
 return nativeFetch(input,init);
};
const QUICK=[
 ['Come sta andando l’anno in corso?','Come sta andando l’anno in corso? Dammi prima una risposta netta. Valuta l’anno fino a oggi e, quando possibile, confrontalo con lo stesso periodo dell’anno scorso. Considera occupazione, ADR lordo/netto, netto finale e andamento mensile; tratta separatamente i mesi con dati economici ancora parziali.'],
 ['Quali sono i punti forti e deboli attuali?','Quali sono i punti forti e deboli attuali? Dammi prima la conclusione sintetica, poi individua i 3 punti forti e i 3 punti deboli più importanti supportati dai dati recenti e futuri. Non chiamare debolezza un dato solo perché il mese corrente è ancora parziale.'],
 ['Confronta questo mese con lo stesso mese dell’anno scorso','Confronta questo mese con lo stesso mese dell’anno scorso. Rispondi prima con chi sta andando meglio e perché. Confronta occupazione e prenotazioni note; per ADR, lordo e netto tieni conto della copertura economica e, se il mese corrente è parziale, usa il consuntivo solo come parziale e la proiezione separatamente.'],
 ['Sto migliorando o peggiorando? Dimmi perché','Sto migliorando o peggiorando? Dimmi perché. Dammi subito il verdetto e poi dimostralo usando più indicatori comparabili, privilegiando anno in corso fino a oggi contro lo stesso periodo dell’anno scorso e trend degli ultimi mesi completi. Non decidere sulla base di un solo KPI.'],
 ['Qual è il mio guadagno medio netto mensile?','Qual è il mio guadagno medio netto mensile? Dammi subito il valore. Calcolalo con finance.net_final sui mesi economicamente completi o consolidati disponibili, escludendo mesi parziali/non ancora contabilizzati. Specifica periodo, numero di mesi usati e formula della media. Se utile, aggiungi separatamente una media dell’anno in corso senza confonderla con quella storica.'],
 ['Dammi 3 consigli tariffari basati sui dati interni','Dammi 3 consigli tariffari basati sui dati interni. Dammi subito i tre consigli, poi spiegali. Usa soltanto stagionalità, ADR reale, occupazione, lead time, andamento delle prenotazioni, date future libere/prenotate e tariffe interne. Ogni consiglio deve essere concreto, riferito a periodi/date quando i dati lo permettono e motivato con numeri.']
];
function scrollToChat(){
 const chat=document.querySelector('#aiChat');if(!chat)return;
 const top=Math.max(0,chat.getBoundingClientRect().top+window.scrollY-78);
 window.scrollTo({top,behavior:'smooth'});
}
function installAutoFollow(){
 const chat=document.querySelector('#aiChat');if(!chat||chatObserver)return;
 chatObserver=new MutationObserver(()=>{
  if(!autoFollowQuick)return;
  const msgs=[...chat.querySelectorAll('.ai-msg.assistant')];
  const last=msgs[msgs.length-1];
  if(!last||last.classList.contains('loading')||last.classList.contains('ai-error-card'))return;
  autoFollowQuick=false;
  requestAnimationFrame(()=>{
   const top=Math.max(0,last.getBoundingClientRect().top+window.scrollY-78);
   window.scrollTo({top,behavior:'smooth'});
  });
 });
 chatObserver.observe(chat,{childList:true,subtree:true});
}
function installQuick(){
 const side=document.querySelector('#aiSec .ai-side'),input=document.querySelector('#aiInput'),form=document.querySelector('#aiForm');if(!side||!input||!form)return false;
 installAutoFollow();
 const h=side.querySelector('h2');if(h)h.textContent='Domande utili';const p=side.querySelector(':scope > p');if(p)p.textContent='Sei domande essenziali per leggere subito andamento, redditività e prezzi.';
 side.querySelectorAll('.ai-qgroup,.ai-smart-prompts').forEach(x=>x.remove());
 const wrap=document.createElement('div');wrap.className='ai-smart-prompts';
 QUICK.forEach(([label,prompt],i)=>{const b=document.createElement('button');b.type='button';b.className='ai-prompt ai-smart-prompt';b.textContent=`${i+1}) ${label}`;b.onclick=()=>{autoFollowQuick=true;input.value=prompt;form.requestSubmit();requestAnimationFrame(scrollToChat)};wrap.appendChild(b)});
 const scope=side.querySelector('.ai-scope');if(scope)side.insertBefore(wrap,scope);else side.appendChild(wrap);
 if(!document.querySelector('#aiSmartStyles'))document.head.insertAdjacentHTML('beforeend',`<style id="aiSmartStyles">
.ai-smart-prompts{display:grid;grid-template-columns:1fr;gap:8px;margin:10px 0 15px}.ai-smart-prompt{font-size:11px!important;line-height:1.35!important;padding:11px 12px!important}.ai-answer h3:first-child{font-family:Heebo,system-ui,sans-serif!important;font-size:10px!important;font-weight:900!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:var(--ai-green)!important;margin:0 0 6px!important}.ai-answer h3:first-child+p{background:#edf8f3;border:1px solid #cfe2db;border-radius:12px;padding:11px 12px;font-size:14px!important;font-weight:800;line-height:1.5!important;margin-bottom:14px!important}.ai-answer h4{margin-top:14px!important}@media(max-width:560px){.ai-smart-prompt{font-size:10.8px!important}}
</style>`);
 return true;
}
let tries=0;const t=setInterval(()=>{if(installQuick()||++tries>40)clearInterval(t)},200);
})();
