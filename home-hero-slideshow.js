document.addEventListener('DOMContentLoaded',()=>{
  const hero=document.querySelector('.hero');
  const slides=[...document.querySelectorAll('.hero-slide')];
  const dots=[...document.querySelectorAll('.hero-dot')];
  if(!hero||slides.length<2)return;
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
  hero.addEventListener('mouseenter',stop);
  hero.addEventListener('mouseleave',start);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  show(0);
  start();
});
