(()=>{
'use strict';
if(window.__civicoStatsEconToggle)return;window.__civicoStatsEconToggle=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
function economicCard(){return qa('#statsSec .sv-card').find(c=>(c.querySelector('h2')?.textContent||'').trim()==='Andamento economico')||null}
function closeDetail(card,note){
  qa('#statsSec .sv-stackcol').forEach(x=>x.classList.remove('sv-econ-selected'));
  if(note.dataset.econDefaultHtml!==undefined){note.innerHTML=note.dataset.econDefaultHtml;delete note.dataset.econDefaultHtml}
}
document.addEventListener('click',e=>{
  const col=e.target.closest('#statsSec .sv-stackcol');
  if(!col)return;
  const card=economicCard();
  if(!card||col.closest('.sv-card')!==card)return;
  const note=card.querySelector('.sv-note');
  if(!note)return;
  if(col.classList.contains('sv-econ-selected')){
    e.preventDefault();
    e.stopImmediatePropagation();
    closeDetail(card,note);
    return;
  }
  if(note.dataset.econDefaultHtml===undefined)note.dataset.econDefaultHtml=note.innerHTML;
},true);
})();
