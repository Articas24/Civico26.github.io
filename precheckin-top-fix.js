(()=>{
'use strict';
if(window.__civicoPrecheckinTopFix)return;window.__civicoPrecheckinTopFix=true;
if('scrollRestoration' in history)history.scrollRestoration='manual';
let settled=false;
function top(){
 document.documentElement.scrollTop=0;document.body.scrollTop=0;window.scrollTo(0,0);
}
function ready(){
 const loading=document.getElementById('loading'),app=document.getElementById('app'),done=document.getElementById('done'),fatal=document.getElementById('fatal');
 if(!loading)return false;
 return loading.hidden&&((app&&!app.hidden)||(done&&!done.hidden)||(fatal&&!fatal.hidden));
}
function settle(){
 if(settled||!ready())return;
 settled=true;
 requestAnimationFrame(()=>{top();setTimeout(top,50);setTimeout(top,180)});
}
top();
const mo=new MutationObserver(()=>{settle();if(settled)setTimeout(()=>mo.disconnect(),250)});
mo.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden','class'],childList:true});
window.addEventListener('pageshow',()=>requestAnimationFrame(top));
window.addEventListener('load',()=>{settle();if(!settled)top()});
setTimeout(settle,0);setTimeout(settle,500);setTimeout(settle,1500);setTimeout(()=>{if(!settled)top();mo.disconnect()},5000);
})();