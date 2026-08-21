document.addEventListener('DOMContentLoaded',()=>{
  const hero=document.querySelector('.hero');
  const slides=[...document.querySelectorAll('.hero-slide')];
  const dots=[...document.querySelectorAll('.hero-dot')];
  if(!hero||slides.length<2)return;

  // La terza foto della Camera Verde è verticale (3:4) e rende molto meglio nella hero mobile.
  if(slides[1]&&slides[1].dataset.room==='verde'){
    slides[1].src='immagini/camera-verde-3.jpg';
  }

  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current=0;
  let timer=null;

  const show=index=>{
    current=(index+slides.length)%slides.length;
    const src=slides[current].getAttribute('src');
    if(src)hero.style.setProperty('--hero-mobile-backdrop',`url("${src}")`);
    slides.forEach((slide,i)=>slide.classList.toggle('is-active',i===current));
    dots.forEach((dot,i)=>{
      const active=i===current;
      dot.classList.toggle('is-active',active);
      dot.setAttribute('aria-current',active?'true':'false');
    });
  };

  const stop=()=>{if(timer){clearInterval(timer);timer=null}};
  const start=()=>{
    stop();
    if(!reduceMotion&&!document.hidden)timer=setInterval(()=>show(current+1),5200);
  };

  dots.forEach((dot,i)=>dot.addEventListener('click',()=>{show(i);start()}));

  // Swipe destra/sinistra su smartphone senza interferire con form, link e scroll verticale.
  let touchStartX=0;
  let touchStartY=0;
  let touchActive=false;
  const interactiveTarget=target=>target instanceof Element&&!!target.closest('a,button,input,select,textarea,label,.booking-strip');

  hero.addEventListener('touchstart',event=>{
    if(event.touches.length!==1||interactiveTarget(event.target)){
      touchActive=false;
      return;
    }
    const touch=event.touches[0];
    touchStartX=touch.clientX;
    touchStartY=touch.clientY;
    touchActive=true;
    stop();
  },{passive:true});

  hero.addEventListener('touchend',event=>{
    if(!touchActive)return;
    touchActive=false;
    const touch=event.changedTouches&&event.changedTouches[0];
    if(!touch){start();return;}
    const dx=touch.clientX-touchStartX;
    const dy=touch.clientY-touchStartY;
    const isHorizontal=Math.abs(dx)>=48&&Math.abs(dx)>Math.abs(dy)*1.15;
    if(isHorizontal)show(current+(dx<0?1:-1));
    start();
  },{passive:true});

  hero.addEventListener('touchcancel',()=>{
    touchActive=false;
    start();
  },{passive:true});

  hero.addEventListener('mouseenter',stop);
  hero.addEventListener('mouseleave',start);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  show(0);
  start();
});
