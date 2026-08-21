(()=>{
'use strict';
function load(src,onload){const s=document.createElement('script');s.src=src;s.defer=true;if(onload)s.onload=onload;document.head.appendChild(s)}
load('admin-stats-history-core.js?v=20260821-2315',()=>load('admin-stats-finance.js?v=20260821-2315',()=>load('admin-stats-compare.js?v=20260821-2315')));
})();
