document.addEventListener('DOMContentLoaded',()=>{
  const rooms=[...document.querySelectorAll('.room-accordion')];
  let userToggleRoom=null;

  rooms.forEach(room=>{
    const summary=room.querySelector(':scope > summary');
    if(summary){
      summary.addEventListener('pointerdown',()=>{userToggleRoom=room;});
      summary.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' ') userToggleRoom=room;
      });
    }

    room.addEventListener('toggle',()=>{
      if(!room.open)return;
      rooms.forEach(other=>{if(other!==room) other.open=false;});

      // Lo scroll verso la galleria deve avvenire solo dopo un'apertura
      // richiesta esplicitamente dall'utente. Gli eventi toggle automatici
      // del browser non devono interferire con i link Home / #top.
      if(userToggleRoom!==room)return;
      userToggleRoom=null;

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

  // Il tasto Home deve sempre riportare davvero all'inizio della pagina.
  document.querySelectorAll('a[href="#top"]').forEach(link=>{
    link.addEventListener('click',e=>{
      e.preventDefault();
      userToggleRoom=null;
      history.replaceState(null,'',location.pathname+location.search+'#top');
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });
});
