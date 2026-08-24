(()=>{
'use strict';
/* Disattiva la vecchia patch che rinominava AI Insight distruggendo #ibadge. */
window.__civicoAdminFinalFixesV2=true;
if(document.querySelector('script[data-civico-admin-fixes-v3]'))return;
const s=document.createElement('script');
s.src='admin-final-fixes-v3.js?v=20260824-1358';
s.defer=true;
s.dataset.civicoAdminFixesV3='1';
document.head.appendChild(s);
})();