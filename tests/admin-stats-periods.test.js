const test=require('node:test');
const assert=require('node:assert/strict');
const periods=require('../admin-stats-periods.js');

const iso=date=>{
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return`${y}-${m}-${d}`;
};

test('allinea anno corrente e anno concluso allo stesso giorno',()=>{
  const [a,b]=periods.yearRanges(2026,2025,new Date(2026,7,30,12));
  assert.deepEqual([iso(a.start),iso(a.end)],['2026-01-01','2026-08-31']);
  assert.deepEqual([iso(b.start),iso(b.end)],['2025-01-01','2025-08-31']);
});

test('mantiene interi due anni entrambi conclusi',()=>{
  const [a,b]=periods.yearRanges(2025,2024,new Date(2026,7,30,12));
  assert.equal(iso(a.end),'2026-01-01');
  assert.equal(iso(b.end),'2025-01-01');
});

test('stesso periodo annuale diventa year-to-date per l anno corrente',()=>{
  const current={start:new Date(2026,0,1),end:new Date(2027,0,1)};
  const [a,b]=periods.sameRanges(current,true,new Date(2026,7,30,12));
  assert.equal(iso(a.end),'2026-08-31');
  assert.equal(iso(b.end),'2025-08-31');
});

test('allinea anche il mese corrente senza modificare mesi già conclusi',()=>{
  const now=new Date(2026,7,30,12),[current,previous]=periods.monthRanges(2026,2025,8,now),[julyA,julyB]=periods.monthRanges(2026,2025,7,now);
  assert.equal(iso(current.end),'2026-08-31');
  assert.equal(iso(previous.end),'2025-08-31');
  assert.equal(iso(julyA.end),'2026-08-01');
  assert.equal(iso(julyB.end),'2025-08-01');
});

test('gestisce il 29 febbraio negli anni non bisestili',()=>{
  const [,previous]=periods.yearRanges(2028,2027,new Date(2028,1,29,12));
  assert.equal(iso(previous.end),'2027-03-01');
});

test('crea solo i mesi trascorsi per il grafico year-to-date',()=>{
  const [range]=periods.yearRanges(2026,2025,new Date(2026,7,30,12));
  const buckets=periods.monthBuckets(range,['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']);
  assert.deepEqual(buckets.map(x=>x.label),['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago']);
  assert.equal(iso(buckets.at(-1).end),'2026-08-31');
});
