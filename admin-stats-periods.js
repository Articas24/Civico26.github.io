((root,factory)=>{
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.CivicoStatsPeriods=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const DAY=86400000;
const copy=r=>({start:new Date(r.start),end:new Date(r.end)});
const days=(a,b)=>Math.max(0,Math.round((b-a)/DAY));
const shiftYear=(r,delta)=>{
  const start=new Date(r.start),end=new Date(r.end);
  start.setFullYear(start.getFullYear()+delta);
  end.setFullYear(end.getFullYear()+delta);
  return{start,end};
};
const fullYear=r=>r.start.getMonth()===0&&r.start.getDate()===1&&r.end.getFullYear()===r.start.getFullYear()+1&&r.end.getMonth()===0&&r.end.getDate()===1;
const endThroughEquivalentDay=(year,now)=>{
  const month=now.getMonth(),lastDay=new Date(year,month+1,0).getDate(),day=Math.min(now.getDate(),lastDay);
  return new Date(year,month,day+1);
};

function sameRanges(range,alignCurrentYear=false,now=new Date()){
  const a=copy(range);
  if(alignCurrentYear&&fullYear(a)&&a.start.getFullYear()===now.getFullYear())a.end=endThroughEquivalentDay(a.start.getFullYear(),now);
  return[a,shiftYear(a,-1)];
}
function yearRanges(yearA,yearB,now=new Date()){
  const current=now.getFullYear(),aligned=yearA===current||yearB===current;
  const make=year=>({start:new Date(year,0,1),end:aligned?endThroughEquivalentDay(year,now):new Date(year+1,0,1)});
  return[make(yearA),make(yearB)];
}
function monthRanges(yearA,yearB,month,now=new Date()){
  const index=Math.max(0,Math.min(11,Number(month)-1)),current=now.getFullYear(),aligned=index===now.getMonth()&&(yearA===current||yearB===current);
  const make=year=>({start:new Date(year,index,1),end:aligned?endThroughEquivalentDay(year,now):new Date(year,index+1,1)});
  return[make(yearA),make(yearB)];
}
function monthBuckets(range,labels=[]){
  if(range.start.getDate()!==1||days(range.start,range.end)<=45)return[];
  const out=[];
  for(let cursor=new Date(range.start.getFullYear(),range.start.getMonth(),1);cursor<range.end;cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1)){
    const next=new Date(cursor.getFullYear(),cursor.getMonth()+1,1),end=new Date(Math.min(next.getTime(),range.end.getTime()));
    out.push({start:new Date(cursor),end,label:labels[cursor.getMonth()]||String(cursor.getMonth()+1)});
  }
  return out;
}
function partialCalendarYear(range){return range.start.getMonth()===0&&range.start.getDate()===1&&!fullYear(range)}

return{sameRanges,yearRanges,monthRanges,monthBuckets,fullYear,partialCalendarYear,endThroughEquivalentDay};
});
