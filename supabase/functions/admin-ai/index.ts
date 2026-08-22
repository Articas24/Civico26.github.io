import { createClient } from "jsr:@supabase/supabase-js@2.95.0";

const ADMIN_EMAILS=new Set(["stefanoalfonso@hotmail.it","andrealfonso@live.it"]);
const DAY=86400000;
const CORS={"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"authorization, x-client-info, apikey, content-type"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:CORS});
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
const date=(s:unknown)=>new Date(String(s||"").slice(0,10)+"T00:00:00Z");
const key=(d:Date)=>d.toISOString().slice(0,10);
const days=(a:unknown,b:unknown)=>Math.max(0,Math.round((date(b).getTime()-date(a).getTime())/DAY));
const plus=(s:string,n:number)=>key(new Date(date(s).getTime()+n*DAY));
const round=(v:number,d=1)=>Number(v.toFixed(d));
const valid=(r:any)=>!!r.start_date&&!!r.end_date&&!['cancelled','rejected'].includes(String(r.status||'').toLowerCase());
const channel=(s:unknown)=>['booking','airbnb','direct'].includes(String(s||'').toLowerCase())?String(s).toLowerCase():'other';

function todayRome(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=(t:string)=>p.find(x=>x.type===t)?.value||'';return `${g('year')}-${g('month')}-${g('day')}`}
function boundsMonth(y:number,m:number){return{start:key(new Date(Date.UTC(y,m,1))),end:key(new Date(Date.UTC(y,m+1,1)))}}
function boundsYear(y:number){return{start:`${y}-01-01`,end:`${y+1}-01-01`}}
function overlap(r:any,start:string,end:string){return Math.max(0,Math.round((Math.min(date(r.end_date).getTime(),date(end).getTime())-Math.max(date(r.start_date).getTime(),date(start).getTime()))/DAY))}
function addDates(set:Set<string>,a:string,b:string,start:string,end:string){let x=Math.max(date(a).getTime(),date(start).getTime()),stop=Math.min(date(b).getTime(),date(end).getTime());while(x<stop){set.add(key(new Date(x)));x+=DAY}}
function sourceEntry(e:any,feeds:Map<number,string>){const s=String(e.source||'').toLowerCase();return channel(['booking','airbnb','direct'].includes(s)?s:(feeds.get(Number(e.external_feed_id))||s))}

function finSummary(fin:any[],start:string,end:string){
 const detail=fin.filter(x=>x.line_type!=='annual_tax_summary'&&x.transaction_date&&x.transaction_date>=start&&x.transaction_date<end);
 const full=start.endsWith('-01-01')&&end===`${Number(start.slice(0,4))+1}-01-01`;
 const annual=full?fin.filter(x=>x.line_type==='annual_tax_summary'&&String(x.transaction_date||'').startsWith(start.slice(0,4))):[];
 const one=(src:string)=>{const rows=detail.filter(x=>x.source===src),reserv=rows.filter(x=>x.line_type==='reservation_payout');if(rows.length)return{mode:'detail',gross:reserv.reduce((a,x)=>a+num(x.gross_amount),0),commission:rows.reduce((a,x)=>a+num(x.platform_commission),0),vat:rows.reduce((a,x)=>a+num(x.vat_platform_services),0),fee:rows.reduce((a,x)=>a+num(x.transaction_fee),0),tax:rows.reduce((a,x)=>a+num(x.tax_withheld),0),payout:rows.reduce((a,x)=>a+num(x.payout_amount),0)};const a=annual.find(x=>x.source===src);return a?{mode:'annual',gross:num(a.gross_amount),commission:null,vat:null,fee:null,tax:num(a.tax_withheld),payout:null}:{mode:'none',gross:0,commission:0,vat:0,fee:0,tax:0,payout:null}};
 const booking=one('booking'),airbnb=one('airbnb'),gross=booking.gross+airbnb.gross,known=booking.mode==='detail'||airbnb.mode==='detail',cost=num(booking.commission)+num(booking.vat)+num(booking.fee)+num(airbnb.commission)+num(airbnb.vat)+num(airbnb.fee),tax=num(booking.tax)+num(airbnb.tax);
 return{gross:round(gross,2),platform_costs:known?round(cost,2):null,tax_withheld:round(tax,2),net_final:known?round(gross-cost-tax,2):null,booking:{...booking,gross:round(booking.gross,2)},airbnb:{...airbnb,gross:round(airbnb.gross,2)},economic_basis:detail.length?'transaction_date':annual.length?'annual_summary':'none'};
}

function metrics(res:any[],hist:any[],entries:any[],fin:any[],start:string,end:string){
 const active=res.filter(r=>valid(r)&&r.start_date<end&&r.end_date>start),occupied=new Set<string>(),blocked=new Set<string>();active.forEach(r=>addDates(occupied,r.start_date,r.end_date,start,end));entries.filter(e=>e.status==='blocked'&&e.start_date&&e.end_date&&e.start_date<end&&e.end_date>start).forEach(e=>addDates(blocked,e.start_date,e.end_date,start,end));occupied.forEach(x=>blocked.delete(x));
 const total=Math.max(1,days(start,end)),sellable=Math.max(1,total-blocked.size),starts=active.filter(r=>r.start_date>=start&&r.start_date<end),resNights=active.reduce((a,r)=>a+overlap(r,start,end),0),leadRows=hist.filter(r=>valid(r)&&r.booked_at&&r.start_date>=start&&r.start_date<end),lead=leadRows.length?leadRows.reduce((a,r)=>a+Math.max(0,days(r.booked_at,r.start_date)),0)/leadRows.length:null;
 const guests=hist.filter(r=>valid(r)&&r.start_date>=start&&r.start_date<end&&(r.persons!=null||r.adults!=null||r.children!=null)),avgGuests=guests.length?guests.reduce((a,r)=>a+(r.persons!=null?num(r.persons):num(r.adults)+num(r.children)),0)/guests.length:null;
 const channels:any={booking:{stays:0,nights:0},airbnb:{stays:0,nights:0},direct:{stays:0,nights:0},other:{stays:0,nights:0}};starts.forEach(r=>{const c=channel(r.source);channels[c].stays++;channels[c].nights+=num(r.nights)||days(r.start_date,r.end_date)});
 const f=finSummary(fin,start,end),adrNights=occupied.size;
 return{start,end,occupied_nights:occupied.size,blocked_nights:blocked.size,sellable_nights:sellable,occupancy_pct:round(occupied.size/sellable*100,1),stays:starts.length,reservation_nights:resNights,avg_stay_nights:starts.length?round(resNights/starts.length,1):0,lead_time_days:lead==null?null:round(lead,1),avg_guests:avgGuests==null?null:round(avgGuests,1),channels,finance:f,adr_gross:adrNights&&f.gross?round(f.gross/adrNights,2):null,adr_net:adrNights&&f.net_final!=null?round(f.net_final/adrNights,2):null};
}
function textOf(data:any){if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();const out:string[]=[];for(const i of data?.output||[])for(const c of i?.content||[])if(c?.type==='output_text'&&c?.text)out.push(c.text);return out.join('\n').trim()}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});if(req.method!=='POST')return json({error:'Metodo non consentito'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',auth=req.headers.get('authorization')||'';
  if(!url||!anon||!service)return json({error:'Configurazione Supabase interna incompleta'},500);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error:ue}=await userClient.auth.getUser();if(ue||!user||!ADMIN_EMAILS.has(String(user.email||'').toLowerCase()))return json({error:'Non autorizzato'},403);
  const body=await req.json().catch(()=>({})),message=String(body?.message||'').trim().slice(0,4000);if(!message)return json({error:'Scrivi una domanda'},400);
  const openai=Deno.env.get('OPENAI_API_KEY')||'';if(!openai)return json({error:'OPENAI_API_KEY non configurata',code:'AI_NOT_CONFIGURED'},503);
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const [h,e,f,p,fd]=await Promise.all([
   db.from('booking_history').select('source,status,start_date,end_date,nights,booked_at,adults,children,persons,earnings'),
   db.from('calendar_entries').select('start_date,end_date,status,source,created_at,external_feed_id'),
   db.from('platform_finance_ledger').select('source,line_type,transaction_date,gross_amount,platform_commission,vat_platform_services,transaction_fee,tax_withheld,payout_amount'),
   db.from('price_rules').select('start_date,end_date,nightly_price'),
   db.from('ical_feeds').select('id,provider')
  ]);for(const x of [h,e,f,p,fd])if(x.error)throw new Error(x.error.message||'Errore database');
  const history=(h.data||[]).filter(valid),entries=e.data||[],finance=f.data||[],prices=p.data||[],feedMap=new Map<number,string>((fd.data||[]).map((x:any)=>[Number(x.id),String(x.provider||'other').toLowerCase()]));
  const histRes=history.map((r:any)=>({...r,source:channel(r.source)}));const live=entries.filter((x:any)=>x.status==='booked'&&x.start_date&&x.end_date).map((x:any)=>({start_date:x.start_date,end_date:x.end_date,nights:days(x.start_date,x.end_date),booked_at:x.created_at?String(x.created_at).slice(0,10):null,source:sourceEntry(x,feedMap)})).filter((x:any)=>!histRes.some((r:any)=>r.source===x.source&&r.start_date===x.start_date&&r.end_date===x.end_date));const res=[...histRes,...live];
  const today=todayRome(),y=Number(today.slice(0,4)),m=Number(today.slice(5,7))-1,cur=boundsMonth(y,m),prevDate=new Date(Date.UTC(y,m-1,1)),prev=boundsMonth(prevDate.getUTCFullYear(),prevDate.getUTCMonth());
  const ys=new Set<number>([y]);history.forEach((r:any)=>ys.add(Number(String(r.start_date).slice(0,4))));finance.forEach((r:any)=>r.transaction_date&&ys.add(Number(String(r.transaction_date).slice(0,4))));const years=[...ys].filter(v=>v>2000&&v<2100).sort((a,b)=>a-b);
  const monthly:any[]=[];const first=new Date(Date.UTC(y,m-18,1));for(let i=0;i<25;i++){const d=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+i,1)),b=boundsMonth(d.getUTCFullYear(),d.getUTCMonth());monthly.push({month:`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`,...metrics(res,history,entries,finance,b.start,b.end)})}
  const future:any[]=[];for(let i=0;i<90;i++){const d=plus(today,i),en=entries.find((x:any)=>x.start_date&&x.end_date&&d>=x.start_date&&d<x.end_date&&['booked','blocked'].includes(x.status)),pr=prices.find((x:any)=>x.start_date&&x.end_date&&d>=x.start_date&&d<x.end_date);future.push({date:d,state:en?.status||'free',source:en?.status==='booked'?sourceEntry(en,feedMap):null,price_eur:pr?round(num(pr.nightly_price),2):null})}
  const snapshot={generated_for_date:today,timezone:'Europe/Rome',scope:'Dati interni aggregati di Civico 26; nessun nome, email, telefono o nota ospite',coverage:{booking_history_rows:history.length,calendar_entries:entries.length,finance_rows:finance.length,price_rules:prices.length},current_month:metrics(res,history,entries,finance,cur.start,cur.end),previous_month:metrics(res,history,entries,finance,prev.start,prev.end),current_year:metrics(res,history,entries,finance,boundsYear(y).start,boundsYear(y).end),previous_year:metrics(res,history,entries,finance,boundsYear(y-1).start,boundsYear(y-1).end),yearly:years.map(yy=>({year:yy,...metrics(res,history,entries,finance,boundsYear(yy).start,boundsYear(yy).end)})),monthly_25_months:monthly,future_90_days:future};
  const hist=Array.isArray(body?.history)?body.history.slice(-8).map((x:any)=>({role:x?.role==='assistant'?'assistant':'user',content:String(x?.content||'').slice(0,2500)})).filter((x:any)=>x.content):[];const convo=hist.map((x:any)=>`${x.role==='assistant'?'ASSISTENTE':'UTENTE'}: ${x.content}`).join('\n');
  const instructions='Sei l\'assistente gestionale interno di Civico 26. Rispondi in italiano, chiaro e numerico. Usa esclusivamente il contesto dati fornito e non inventare valori. Per confronti tra mesi o anni usa le serie disponibili. Distingui metriche operative per date di soggiorno da dati economici basati su data di transazione. Evidenzia eventuali dati mancanti o non confrontabili. Se dai consigli tariffari, specifica che derivano solo dai dati interni e non da prezzi o domanda dei concorrenti. Non puoi modificare dati. Quando utile chiudi con 1-3 azioni pratiche.';
  const input=`CONTESTO DATI AGGREGATI:\n${JSON.stringify(snapshot)}\n\nCONVERSAZIONE PRECEDENTE:\n${convo||'(nessuna)'}\n\nDOMANDA:\n${message}`;
  const oa=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${openai}`},body:JSON.stringify({model:'gpt-5.6-luna',instructions,input,store:false,max_output_tokens:1800})});const data=await oa.json().catch(()=>({}));if(!oa.ok){console.error('OpenAI',oa.status,data?.error?.code||data?.error?.type||'unknown');return json({error:'Chiamata OpenAI non riuscita',detail:data?.error?.message||null,code:'OPENAI_ERROR'},502)}const reply=textOf(data);if(!reply)return json({error:'Risposta AI vuota',code:'EMPTY_AI_RESPONSE'},502);return json({reply,model:data?.model||'gpt-5.6-luna',data_date:today});
 }catch(err){console.error(err);return json({error:err instanceof Error?err.message:String(err)},500)}
});