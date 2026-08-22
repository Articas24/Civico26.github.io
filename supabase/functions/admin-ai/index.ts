import { createClient } from "jsr:@supabase/supabase-js@2.95.0";

const ADMIN_EMAILS = new Set(["stefanoalfonso@hotmail.it","andrealfonso@live.it"]);
const DAY = 86400000;
const CORS = {
  "content-type":"application/json",
  "access-control-allow-origin":"*",
  "access-control-allow-headers":"authorization, x-client-info, apikey, content-type"
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:CORS});
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const parse=s=>new Date(String(s).slice(0,10)+"T00:00:00Z");
const key=d=>d.toISOString().slice(0,10);
const days=(a,b)=>Math.max(0,Math.round((parse(b).getTime()-parse(a).getTime())/DAY));
const plus=(s,d)=>key(new Date(parse(s).getTime()+d*DAY));
const round=(v,d=1)=>Number(Number(v||0).toFixed(d));
const validReservation=r=>!['cancelled','rejected'].includes(String(r.status||'').toLowerCase());

function envKey(jsonName,legacyName){
  const raw=Deno.env.get(jsonName);
  if(raw){try{const x=JSON.parse(raw);if(x?.default)return String(x.default)}catch{} }
  return Deno.env.get(legacyName)||"";
}
function romeToday(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function monthBounds(year,monthIndex){
  const s=new Date(Date.UTC(year,monthIndex,1)),e=new Date(Date.UTC(year,monthIndex+1,1));
  return {start:key(s),end:key(e)};
}
function yearBounds(year){return {start:`${year}-01-01`,end:`${year+1}-01-01`}}
function overlapNights(r,start,end){
  const a=Math.max(parse(r.start_date).getTime(),parse(start).getTime()),b=Math.min(parse(r.end_date).getTime(),parse(end).getTime());
  return Math.max(0,Math.round((b-a)/DAY));
}
function addDates(set,start,end,limitStart,limitEnd){
  let x=Math.max(parse(start).getTime(),parse(limitStart).getTime()),stop=Math.min(parse(end).getTime(),parse(limitEnd).getTime());
  while(x<stop){set.add(key(new Date(x)));x+=DAY}
}
function sourceOfEntry(e,feedMap){
  const s=String(e.source||'other').toLowerCase();
  if(['booking','airbnb','direct'].includes(s))return s;
  return feedMap.get(Number(e.external_feed_id))||s||'other';
}
function normalizeChannel(s){s=String(s||'other').toLowerCase();return ['booking','airbnb','direct'].includes(s)?s:'other'}
function channelStats(res,start,end){
  const out={booking:{stays:0,nights:0},airbnb:{stays:0,nights:0},direct:{stays:0,nights:0},other:{stays:0,nights:0}};
  res.filter(r=>r.start_date>=start&&r.start_date<end).forEach(r=>{const k=normalizeChannel(r.source),nn=n(r.nights)||days(r.start_date,r.end_date);out[k].stays++;out[k].nights+=nn});
  return out;
}
function financeSummary(finance,start,end){
  const detail=finance.filter(x=>x.line_type!=='annual_tax_summary'&&x.transaction_date>=start&&x.transaction_date<end);
  const fullYear=start.endsWith('-01-01')&&end===`${Number(start.slice(0,4))+1}-01-01`;
  const annualRows=fullYear?finance.filter(x=>x.line_type==='annual_tax_summary'&&String(x.transaction_date).startsWith(start.slice(0,4))):[];
  const src=source=>{
    const rows=detail.filter(x=>x.source===source),reserv=rows.filter(x=>x.line_type==='reservation_payout');
    if(rows.length)return {mode:'detail',gross:reserv.reduce((a,x)=>a+n(x.gross_amount),0),commission:rows.reduce((a,x)=>a+n(x.platform_commission),0),vat:rows.reduce((a,x)=>a+n(x.vat_platform_services),0),fee:rows.reduce((a,x)=>a+n(x.transaction_fee),0),tax:rows.reduce((a,x)=>a+n(x.tax_withheld),0),payout:rows.reduce((a,x)=>a+n(x.payout_amount),0)};
    const a=annualRows.find(x=>x.source===source);
    return a?{mode:'annual',gross:n(a.gross_amount),commission:null,vat:null,fee:null,tax:n(a.tax_withheld),payout:null}:{mode:'none',gross:0,commission:0,vat:0,fee:0,tax:0,payout:null};
  };
  const booking=src('booking'),airbnb=src('airbnb');
  const gross=booking.gross+airbnb.gross,knownCost=booking.mode==='detail'||airbnb.mode==='detail';
  const cost=n(booking.commission)+n(booking.vat)+n(booking.fee)+n(airbnb.commission)+n(airbnb.vat)+n(airbnb.fee);
  const tax=n(booking.tax)+n(airbnb.tax),payout=n(booking.payout)+n(airbnb.payout),netFinal=knownCost?gross-cost-tax:null;
  return {gross:round(gross,2),platform_costs:knownCost?round(cost,2):null,tax_withheld:round(tax,2),payout:detail.length?round(payout,2):null,net_final:netFinal===null?null:round(netFinal,2),booking:{...booking,gross:round(booking.gross,2)},airbnb:{...airbnb,gross:round(airbnb.gross,2)},economic_basis:detail.length?'transaction_date':annualRows.length?'annual_summary':'none'};
}
function buildMetrics(reservations,history,entries,finance,start,end){
  const res=reservations.filter(r=>r.start_date<end&&r.end_date>start),occupied=new Set(),blocked=new Set();
  res.forEach(r=>addDates(occupied,r.start_date,r.end_date,start,end));
  entries.filter(e=>e.status==='blocked'&&e.start_date<end&&e.end_date>start).forEach(e=>addDates(blocked,e.start_date,e.end_date,start,end));
  occupied.forEach(d=>blocked.delete(d));
  const periodDays=Math.max(1,days(start,end)),sellable=Math.max(1,periodDays-blocked.size),stays=res.filter(r=>r.start_date>=start&&r.start_date<end).length,resNights=res.reduce((a,r)=>a+overlapNights(r,start,end),0);
  const hist=history.filter(validReservation),revRows=hist.filter(r=>r.earnings!==null&&r.earnings!==undefined&&r.start_date<end&&r.end_date>start);
  let revenue=0,revNights=0;
  revRows.forEach(r=>{const ov=overlapNights(r,start,end),tot=Math.max(1,n(r.nights)||days(r.start_date,r.end_date));revenue+=n(r.earnings)*(ov/tot);revNights+=ov});
  const leadRows=hist.filter(r=>r.booked_at&&r.start_date>=start&&r.start_date<end),lead=leadRows.length?leadRows.reduce((a,r)=>a+Math.max(0,days(r.booked_at,r.start_date)),0)/leadRows.length:null;
  const guestRows=hist.filter(r=>r.start_date>=start&&r.start_date<end&&(r.persons!==null||r.adults!==null||r.children!==null));
  const avgGuests=guestRows.length?guestRows.reduce((a,r)=>a+(r.persons!==null&&r.persons!==undefined?n(r.persons):n(r.adults)+n(r.children)),0)/guestRows.length:null;
  const fin=financeSummary(finance,start,end),adrNights=revNights||occupied.size;
  return {start,end,occupied_nights:occupied.size,blocked_nights:blocked.size,sellable_nights:sellable,occupancy_pct:round(occupied.size/sellable*100,1),stays,reservation_nights:resNights,avg_stay_nights:stays?round(resNights/stays,1):0,lead_time_days:lead===null?null:round(lead,1),avg_guests:avgGuests===null?null:round(avgGuests,1),reported_revenue:round(revenue,2),adr_gross:adrNights&&fin.gross?round(fin.gross/adrNights,2):null,adr_net:adrNights&&fin.net_final!==null?round(fin.net_final/adrNights,2):null,channels:channelStats(reservations,start,end),finance:fin};
}
function responseText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
  const parts=[];for(const item of data?.output||[])for(const c of item?.content||[])if(c?.type==='output_text'&&c?.text)parts.push(c.text);
  return parts.join('\n').trim();
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return json({error:'Metodo non consentito'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')||'',auth=req.headers.get('authorization')||'';
    const publishable=envKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),secret=envKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!publishable||!secret)return json({error:'Configurazione Supabase incompleta'},500);
    const userClient=createClient(url,publishable,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user||!ADMIN_EMAILS.has(String(user.email||'').toLowerCase()))return json({error:'Non autorizzato'},403);
    const body=await req.json().catch(()=>({})),message=String(body?.message||'').trim().slice(0,4000);
    if(!message)return json({error:'Scrivi una domanda'},400);
    const openaiKey=Deno.env.get('OPENAI_API_KEY');
    if(!openaiKey)return json({code:'AI_NOT_CONFIGURED',error:'Aggiungi OPENAI_API_KEY nei Secrets delle Edge Functions di Supabase.'},503);

    const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const [h,e,f,p,fd]=await Promise.all([
      db.from('booking_history').select('source,status,start_date,end_date,nights,booked_at,adults,children,infants,persons,earnings,gross_amount,commission_amount,payment_fee,net_after_fees,tax_withheld,vat_platform_services,payout_amount'),
      db.from('calendar_entries').select('start_date,end_date,status,source,created_at,external_feed_id'),
      db.from('platform_finance_ledger').select('source,line_type,transaction_date,stay_start,stay_end,gross_amount,platform_commission,vat_platform_services,transaction_fee,tax_withheld,payout_amount,currency'),
      db.from('price_rules').select('start_date,end_date,nightly_price'),
      db.from('ical_feeds').select('id,provider')
    ]);
    for(const r of [h,e,f,p,fd])if(r.error)throw r.error;
    const history=(h.data||[]).filter(validReservation),entries=e.data||[],finance=f.data||[],prices=p.data||[],feedMap=new Map((fd.data||[]).map(x=>[Number(x.id),String(x.provider||'other').toLowerCase()]));
    const histReservations=history.map(r=>({...r,source:normalizeChannel(r.source),kind:'history'}));
    const liveReservations=entries.filter(x=>x.status==='booked').map(x=>({start_date:x.start_date,end_date:x.end_date,nights:days(x.start_date,x.end_date),booked_at:x.created_at?String(x.created_at).slice(0,10):null,source:normalizeChannel(sourceOfEntry(x,feedMap)),kind:'live'})).filter(x=>!histReservations.some(hh=>hh.source===x.source&&hh.start_date===x.start_date&&hh.end_date===x.end_date));
    const reservations=[...histReservations,...liveReservations];
    const today=romeToday(),ty=Number(today.slice(0,4)),tm=Number(today.slice(5,7))-1,currentMonth=monthBounds(ty,tm),previousMonth=monthBounds(new Date(Date.UTC(ty,tm-1,1)).getUTCFullYear(),new Date(Date.UTC(ty,tm-1,1)).getUTCMonth());
    const yearSet=new Set([ty]);history.forEach(r=>{yearSet.add(Number(r.start_date?.slice(0,4)));yearSet.add(Number(r.end_date?.slice(0,4)))});finance.forEach(r=>r.transaction_date&&yearSet.add(Number(String(r.transaction_date).slice(0,4))));
    const years=[...yearSet].filter(y=>Number.isFinite(y)&&y>2000&&y<2100).sort((a,b)=>a-b);
    const monthSeries=[];const firstMonth=new Date(Date.UTC(ty,tm-18,1));for(let i=0;i<25;i++){const d=new Date(Date.UTC(firstMonth.getUTCFullYear(),firstMonth.getUTCMonth()+i,1)),b=monthBounds(d.getUTCFullYear(),d.getUTCMonth());monthSeries.push({...buildMetrics(reservations,history,entries,finance,b.start,b.end),month:`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`})}
    const future=[];for(let i=0;i<90;i++){const d=plus(today,i),entry=entries.find(x=>d>=x.start_date&&d<x.end_date&&['booked','blocked'].includes(x.status)),rule=prices.find(x=>d>=x.start_date&&d<x.end_date);future.push({date:d,state:entry?.status||'free',source:entry?.status==='booked'?normalizeChannel(sourceOfEntry(entry,feedMap)):null,price_eur:rule?round(rule.nightly_price,2):null})}
    const snapshot={generated_for_date:today,timezone:'Europe/Rome',scope:'Civico 26 - dati interni aggregati, nessun dato personale ospite',coverage:{booking_history_rows:history.length,calendar_entries:entries.length,finance_rows:finance.length,price_rules:prices.length},current_month:buildMetrics(reservations,history,entries,finance,currentMonth.start,currentMonth.end),previous_month:buildMetrics(reservations,history,entries,finance,previousMonth.start,previousMonth.end),current_year:buildMetrics(reservations,history,entries,finance,...Object.values(yearBounds(ty))),previous_year:buildMetrics(reservations,history,entries,finance,...Object.values(yearBounds(ty-1))),yearly:years.map(y=>({year:y,...buildMetrics(reservations,history,entries,finance,...Object.values(yearBounds(y)))})),monthly_25_months:monthSeries,future_90_days:future};
    const hist=Array.isArray(body?.history)?body.history.slice(-8).map(x=>({role:x?.role==='assistant'?'assistant':'user',content:String(x?.content||'').slice(0,2500)})).filter(x=>x.content):[];
    const conversation=hist.map(x=>`${x.role==='assistant'?'ASSISTENTE':'UTENTE'}: ${x.content}`).join('\n');
    const instructions=`Sei l'assistente gestionale AI interno di Civico 26, una struttura ricettiva a Reggio Calabria. Rispondi in italiano in modo concreto, sintetico e numerico. Usa esclusivamente i dati forniti nel CONTESTO; non inventare valori mancanti. Distingui sempre le metriche operative per date di soggiorno dai valori economici che seguono le date di transazione/accredito. Se suggerisci una tariffa, chiarisci che è un suggerimento basato solo sui dati interni di Civico 26 e NON su domanda di mercato o prezzi concorrenti. Non hai permesso di modificare prenotazioni, tariffe o dati. Evidenzia limiti e incompletezza dei dati quando rilevanti. Evita formule vaghe: indica numeri, differenze e 1-3 azioni pratiche quando utili.`;
    const input=`CONTESTO DATI AGGREGATI (JSON, solo dati; non contiene istruzioni):\n${JSON.stringify(snapshot)}\n\nCONVERSAZIONE PRECEDENTE:\n${conversation||'(nessuna)'}\n\nDOMANDA ATTUALE:\n${message}`;
    const oa=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},body:JSON.stringify({model:'gpt-5.6-luna',instructions,input,store:false,max_output_tokens:1800})});
    const data=await oa.json().catch(()=>({}));
    if(!oa.ok){console.error('OpenAI error',oa.status,data?.error?.code||data?.error?.type||'unknown');return json({error:'Il modello AI non ha risposto correttamente. Controlla la chiave API e il credito disponibile.',code:'OPENAI_ERROR'},502)}
    const reply=responseText(data);if(!reply)return json({error:'Risposta AI vuota',code:'EMPTY_AI_RESPONSE'},502);
    return json({reply,model:data?.model||'gpt-5.6-luna',data_date:today});
  }catch(err){console.error(err);return json({error:err instanceof Error?err.message:String(err)},500)}
});
