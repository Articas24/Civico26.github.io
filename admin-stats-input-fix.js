(()=>{
'use strict';
if(window.__civicoStatsDateInputFix)return;window.__civicoStatsDateInputFix=true;
const DATE_SELECTOR='#statsSec input[type="date"]';
const allowFlag='__civicoAllowStatsDateChange';

// Some desktop browsers emit `change` while the year segment of a date input
// is still being edited. The stats renderer replaces the whole panel on change,
// so the field used to disappear after the first digit. Suppress those native
// intermediate changes and commit once editing is actually finished.
document.addEventListener('change',event=>{
  const el=event.target;
  if(!(el instanceof HTMLInputElement)||!el.matches(DATE_SELECTOR))return;
  if(event[allowFlag])return;
  event.stopImmediatePropagation();
},true);

function commit(el){
  if(!(el instanceof HTMLInputElement)||!el.matches(DATE_SELECTOR)||!el.isConnected)return;
  const ev=new Event('change',{bubbles:true});
  Object.defineProperty(ev,allowFlag,{value:true});
  el.dispatchEvent(ev);
}

document.addEventListener('focusout',event=>{
  const el=event.target;
  if(!(el instanceof HTMLInputElement)||!el.matches(DATE_SELECTOR))return;
  setTimeout(()=>commit(el),0);
},true);

document.addEventListener('keydown',event=>{
  const el=event.target;
  if(event.key!=='Enter'||!(el instanceof HTMLInputElement)||!el.matches(DATE_SELECTOR))return;
  event.preventDefault();
  commit(el);
  el.blur();
},true);
})();
