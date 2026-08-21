document.addEventListener('DOMContentLoaded',()=>{
 const allItems=[...document.querySelectorAll('.gallery-item')],box=document.getElementById('houseLightbox'),img=document.getElementById('lightboxImage'),cap=document.getElementById('lightboxCaption'),close=document.getElementById('lightboxClose'),prev=document.getElementById('lightboxPrev'),next=document.getElementById('lightboxNext');
 let items=allItems,current=0,touchStartX=0,touchStartY=0;
 const groupFor=el=>{
  const room=el.closest('.room-block');
  if(room)return [...room.querySelectorAll('.gallery-item')];
  return [el];
 };
 const render=()=>{
  if(!items.length)return;
  current=(current+items.length)%items.length;
  const el=items[current],c=el.dataset.caption||'Foto Civico 26';
  img.src=el.dataset.full;
  img.alt=(document.documentElement.lang==='en'&&translations[c])?translations[c]:c;
  cap.textContent=(document.documentElement.lang==='en'&&translations[c])?translations[c]:c;
  const multiple=items.length>1;
  if(prev)prev.hidden=!multiple;
  if(next)next.hidden=!multiple;
 };
 const openItem=el=>{
  items=groupFor(el);
  current=Math.max(0,items.indexOf(el));
  render();
  box.classList.add('open');
  box.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
 };
 const step=delta=>{if(items.length>1){current+=delta;render()}};
 const shut=()=>{box.classList.remove('open');box.setAttribute('aria-hidden','true');document.body.style.overflow=''};
 allItems.forEach(el=>el.addEventListener('click',()=>openItem(el)));
 close?.addEventListener('click',shut);
 prev?.addEventListener('click',()=>step(-1));
 next?.addEventListener('click',()=>step(1));
 box?.addEventListener('click',e=>{if(e.target===box)shut()});
 box?.addEventListener('touchstart',e=>{
  if(e.touches.length!==1)return;
  touchStartX=e.touches[0].clientX;
  touchStartY=e.touches[0].clientY;
 },{passive:true});
 box?.addEventListener('touchend',e=>{
  if(!touchStartX||!e.changedTouches.length)return;
  const dx=e.changedTouches[0].clientX-touchStartX;
  const dy=e.changedTouches[0].clientY-touchStartY;
  touchStartX=0;touchStartY=0;
  if(items.length<2||Math.abs(dx)<45||Math.abs(dx)<=Math.abs(dy)*1.15)return;
  step(dx<0?1:-1);
 },{passive:true});
 document.addEventListener('keydown',e=>{
  if(!box.classList.contains('open'))return;
  if(e.key==='Escape')shut();
  if(e.key==='ArrowLeft')step(-1);
  if(e.key==='ArrowRight')step(1);
 });
});
