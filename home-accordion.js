
document.addEventListener('DOMContentLoaded',()=>{
  const rooms=[...document.querySelectorAll('.room-accordion')];
  rooms.forEach(room=>{
    room.addEventListener('toggle',()=>{
      if(!room.open)return;
      rooms.forEach(other=>{if(other!==room) other.open=false;});
    });
  });
});
