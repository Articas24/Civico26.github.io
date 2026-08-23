(()=>{
'use strict';
if(window.__civicoAIProjectionPolicy)return;window.__civicoAIProjectionPolicy=true;
const nativeFetch=window.fetch.bind(window);
const POLICY=`POLITICA DI PROIEZIONE ECONOMICA PER LE NOTTI PRENOTATE SENZA IMPORTO:\n1) Lavora mese per mese, mai usando automaticamente l'ADR dell'ultimo mese disponibile per tutti i mesi futuri.\n2) Se il mese target ha già notti contabilizzate, usa SEMPRE l'ADR lordo e netto consuntivo di QUEL MESE: futuro lordo stimato = adr_gross_consuntivo del mese × notti del mese non ancora contabilizzate; futuro netto stimato = adr_net_consuntivo del mese × notti del mese non ancora contabilizzate.\n3) Se il mese target non ha ancora alcuna notte contabilizzata o manca il suo ADR, usa come fallback l'ADR MEDIO STORICO PONDERATO: somma dei lordi reali dei mesi con notti valorizzate / somma delle relative notti valorizzate; per il netto fai la stessa cosa con finance.net_final. Non fare la media semplice delle percentuali o degli ADR mensili.\n4) Per agosto 2026, finché esistono notti di agosto già contabilizzate, le altre notti prenotate di agosto devono quindi essere stimate con l'ADR di agosto, non con l'ADR medio generale.\n5) Per periodi che attraversano più mesi, calcola la proiezione separatamente per ciascun mese e poi somma i risultati.\n6) Presenta sempre consuntivo reale, futuro stimato e totale proiettato. Sono proiezioni, non incassi certi. La tariffa calendario è soltanto un confronto secondario.\n7) Se la copertura economica del mese è parziale, non giudicare il ricavo/netto del mese come completo.`;
window.fetch=function(input,init){
 try{
  const url=typeof input==='string'?input:String(input?.url||'');
  if(url.includes('/functions/v1/admin-ai')&&init&&typeof init.body==='string'){
   const body=JSON.parse(init.body);
   if(typeof body?.message==='string'&&!body.message.includes('POLITICA DI PROIEZIONE ECONOMICA PER LE NOTTI PRENOTATE')){
    body.message=`${body.message}\n\n${POLICY}`;
    init={...init,body:JSON.stringify(body)};
   }
  }
 }catch(_e){}
 return nativeFetch(input,init);
};
function addQuick(){
 const input=document.querySelector('#aiInput'),form=document.querySelector('#aiForm');if(!input||!form)return false;
 const groups=[...document.querySelectorAll('.ai-qgroup')],g=groups.find(x=>(x.querySelector('.ai-qgroup-title')?.textContent||'').trim()==='Prezzi e futuro');if(!g||g.querySelector('[data-adr-projection]'))return true;
 const grid=g.querySelector('.ai-prompts');if(!grid)return false;
 const b=document.createElement('button');b.type='button';b.className='ai-prompt';b.dataset.adrProjection='1';b.textContent='Proiezione ADR';b.onclick=()=>{input.value='Fai una proiezione economica delle prenotazioni non ancora contabilizzate. Per ogni mese usa prima l’ADR lordo e netto consuntivo di quello stesso mese; se il mese non ha ancora dati economici, usa l’ADR medio storico ponderato. Mostra consuntivo reale, futuro stimato e totale proiettato mese per mese.';form.requestSubmit()};grid.appendChild(b);return true;
}
let tries=0;const t=setInterval(()=>{if(addQuick()||++tries>30)clearInterval(t)},250);
})();