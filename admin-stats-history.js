(()=>{
'use strict';
if(window.__civicoStatsV2Bootstrap)return;window.__civicoStatsV2Bootstrap=true;
function load(src,onload){const s=document.createElement('script');s.src=src;s.defer=true;if(onload)s.onload=onload;document.head.appendChild(s)}
load('admin-stats-v2.js?v=20260822-0240',()=>load('admin-stats-input-fix.js?v=20260822-0240',()=>load('admin-stats-v2-polish.js?v=20260822-0240',()=>load('admin-stats-layout.js?v=20260822-0240',()=>load('admin-stats-econ-detail.js?v=20260822-0240')))));
})();
