(()=>{
'use strict';
if(window.__civicoCurrentHeroI18nFix)return;window.__civicoCurrentHeroI18nFix=true;
const map=new Map([
 ['Civico 26 · Casa vacanze a Reggio Calabria','Civico 26 · Holiday apartment in Reggio Calabria'],
 ['Civico 26 è un intero appartamento nel centro di Reggio Calabria, fino a 8 ospiti. Stazione Centrale e Corso Garibaldi sono a circa 1 minuto a piedi; il Lungomare Falcomatà a circa 5 minuti.','Civico 26 is an entire apartment in central Reggio Calabria for up to 8 guests. Central Station and Corso Garibaldi are about a 1-minute walk away; the Falcomatà seafront is about 5 minutes away.']
]);
function patch(){
 if(document.documentElement.lang!=='en')return;
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
 while(w.nextNode())nodes.push(w.currentNode);
 for(const n of nodes){
  if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;
  const raw=n.nodeValue||'',core=raw.trim(),tr=map.get(core);if(!tr)continue;
  const lead=(raw.match(/^\s*/)||[''])[0],tail=(raw.match(/\s*$/)||[''])[0];n.nodeValue=lead+tr+tail;
 }
}
function boot(){
 const select=document.getElementById('languageSelect');patch();
 select?.addEventListener('change',()=>setTimeout(patch,0));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();