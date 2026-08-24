document.addEventListener('DOMContentLoaded',()=>{
  const rooms=[...document.querySelectorAll('.room-accordion')];
  rooms.forEach(room=>{
    room.addEventListener('toggle',()=>{
      if(!room.open)return;
      rooms.forEach(other=>{if(other!==room) other.open=false;});
      const gallery=room.querySelector('.room-gallery');
      if(!gallery)return;
      requestAnimationFrame(()=>{
        setTimeout(()=>{
          const header=document.querySelector('header');
          const offset=(header?.offsetHeight||70)+14;
          const top=Math.max(0,gallery.getBoundingClientRect().top+window.scrollY-offset);
          window.scrollTo({top,behavior:'smooth'});
        },80);
      });
    });
  });
});
