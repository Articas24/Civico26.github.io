(()=>{
'use strict';
if(window.__civicoAIInsightsBridge)return;window.__civicoAIInsightsBridge=true;
const prev=window.fetch.bind(window);
window.fetch=function(input,init){
 try{
  const url=typeof input==='string'?input:String(input?.url||'');
  if(url.includes('/functions/v1/admin-ai')&&init&&typeof init.body==='string'){
   const body=JSON.parse(init.body),txt=document.querySelector('#aiInsightsSec')?.innerText?.trim();
   if(typeof body?.message==='string'&&txt&&!body.message.includes('INSIGHTS DETERMINISTICI DEL SISTEMA')){
    body.message+=`\n\nINSIGHTS DETERMINISTICI DEL SISTEMA (usa questi valori come supporto già calcolato, non reinventarli):\n${txt.slice(0,5500)}`;
    init={...init,body:JSON.stringify(body)};
   }
  }
 }catch(_e){}
 return prev(input,init);
};
})();