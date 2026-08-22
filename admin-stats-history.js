(()=>{
'use strict';
if(window.__civicoStatsV2Bootstrap)return;window.__civicoStatsV2Bootstrap=true;
if(!document.querySelector('link[data-admin-ui-polish]')){const l=document.createElement('link');l.rel='stylesheet';l.href='admin-ui-polish.css?v=20260822-1145';l.dataset.adminUiPolish='1';document.head.appendChild(l)}
if(!document.querySelector('link[data-admin-top-summary]')){const l=document.createElement('link');l.rel='stylesheet';l.href='admin-top-summary.css?v=20260822-1248';l.dataset.adminTopSummary='1';document.head.appendChild(l)}
function load(src,onload){const s=document.createElement('script');s.src=src;s.defer=true;if(onload)s.onload=onload;document.head.appendChild(s)}
load('admin-stats-v2.js?v=20260822-0308',()=>
  load('admin-stats-input-fix.js?v=20260822-0308',()=>
    load('admin-stats-v2-polish.js?v=20260822-0308',()=>
      load('admin-stats-layout.js?v=20260822-0308',()=>
        load('admin-stats-econ-detail.js?v=20260822-0308',()=>
          load('admin-stats-ui-fixes.js?v=20260822-0308',()=>
            load('admin-stats-stay-finance.js?v=20260822-0308',()=>
              load('admin-admin-next.js?v=20260822-1305')
            )
          )
        )
      )
    )
  )
);
})();
