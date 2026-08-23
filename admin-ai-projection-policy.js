(()=>{
'use strict';
if(window.__civicoAIProjectionPolicy)return;window.__civicoAIProjectionPolicy=true;
const nativeFetch=window.fetch.bind(window);
const POLICY=`POLITICA DI PROIEZIONE ECONOMICA: quando il periodo analizzato ha economic_coverage.status partial o not_yet_accounted e ci sono notti prenotate senza importo economico, usa come stima principale il rendimento reale delle notti già contabilizzate. Calcola: futuro lordo stimato = adr_gross_consuntivo × booked_nights_without_financial_value; futuro netto stimato = adr_net_consuntivo × booked_nights_without_financial_value; lordo totale proiettato = finance.gross + futuro lordo stimato; netto totale proiettato = finance.net_final + futuro netto stimato. Presenta sempre questi valori come proiezioni, non come incassi certi. Usa estimated_unvalued_gross_at_calendar_rate e projected_gross_at_calendar_rate soltanto come confronto secondario. Se non ci sono abbastanza notti valorizzate o manca uno degli ADR, segnala che la stima ADR non è disponibile invece di inventarla.`;
window.fetch=function(input,init){
 try{
  const url=typeof input==='string'?input:String(input?.url||'');
  if(url.includes('/functions/v1/admin-ai')&&init&&typeof init.body==='string'){
   const body=JSON.parse(init.body);
   if(typeof body?.message==='string'&&!body.message.includes('POLITICA DI PROIEZIONE ECONOMICA')){
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
 const b=document.createElement('button');b.type='button';b.className='ai-prompt';b.dataset.adrProjection='1';b.textContent='Proiezione ADR';b.onclick=()=>{input.value='Fai una proiezione economica del periodo corrente usando l’ADR lordo e netto consuntivo delle notti già contabilizzate per stimare le notti prenotate ma non ancora contabilizzate. Mostra consuntivo reale, futuro stimato e totale proiettato, e confronta solo in secondo piano con la tariffa calendario.';form.requestSubmit()};grid.appendChild(b);return true;
}
let tries=0;const t=setInterval(()=>{if(addQuick()||++tries>30)clearInterval(t)},250);
})();