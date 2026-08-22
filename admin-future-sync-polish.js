(()=>{
'use strict';
if(window.__civicoFutureSyncPolish)return;window.__civicoFutureSyncPolish=true;
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
let scheduled=false;

function styles(){
  if(q('#futureSyncPolishStyles'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="futureSyncPolishStyles">
#futureBookingsList .future-nights-highlight{display:inline-flex;align-items:baseline;gap:6px;margin:7px 0 5px;padding:7px 11px;border:1px solid #cde2db;border-radius:11px;background:#edf7f4;color:#215e52;font-weight:800;line-height:1}
#futureBookingsList .future-nights-highlight b{font-size:23px;letter-spacing:-.4px}
#futureBookingsList .future-nights-highlight span{font-size:11px;text-transform:uppercase;letter-spacing:.35px}
#futureBookingsList .item .meta{margin-top:4px}
#feedsList .item .badge.sync.feed-provider-duplicate{display:none!important}
@media(max-width:580px){#futureBookingsList .future-nights-highlight{padding:8px 11px;margin-top:8px}#futureBookingsList .future-nights-highlight b{font-size:24px}}
</style>`);
}

function polishFutureBookings(){
  qa('#futureBookingsList .item').forEach(card=>{
    if(card.dataset.nightsPolished==='1')return;
    const meta=card.querySelector('.meta');
    if(!meta)return;
    const html=meta.innerHTML||'';
    const parts=html.split(/<br\s*\/?\s*>/i);
    const match=(parts[0]||'').match(/(\d+)\s+(notte|notti)/i);
    if(!match)return;
    const nights=Number(match[1]);
    parts[0]=(parts[0]||'')
      .replace(/\s*·\s*\d+\s+(?:notte|notti)\s*/i,' · ')
      .replace(/^\s*·\s*|\s*·\s*$/g,'')
      .replace(/\s*·\s*·\s*/g,' · ')
      .trim();
    meta.innerHTML=parts.join('<br>');
    const pill=document.createElement('div');
    pill.className='future-nights-highlight';
    pill.innerHTML=`<b>${nights}</b><span>${nights===1?'notte':'notti'}</span>`;
    meta.insertAdjacentElement('beforebegin',pill);
    card.dataset.nightsPolished='1';
  });
}

function polishFeeds(){
  qa('#feedsList .item').forEach(card=>{
    const badge=card.querySelector('.badge.sync');
    if(!badge)return;
    const t=(badge.textContent||'').trim().toLowerCase();
    if(t==='booking.com'||t==='booking'||t==='airbnb')badge.classList.add('feed-provider-duplicate');
  });
}

function patch(){styles();polishFutureBookings();polishFeeds()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patch()})}
function boot(){styles();patch();const mo=new MutationObserver(schedule);mo.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('[data-section="futureSec"],[data-section="syncSec"],#dashFutureCard,#dashSyncCard'))setTimeout(schedule,50)})}
boot();
})();
