
(function(){
  const DAY=86400000;
  const START_DATE=new Date(2026,7,10);
  const MAX_DATE=new Date(2028,0,7);
  const TODAY=new Date(); TODAY.setHours(0,0,0,0);
  const SUPABASE_URL='https://wfhdtwzpjcaicxdrphcu.supabase.co';
  const SUPABASE_KEY='sb_publishable_3SGl7pKrqv_uT8GIW2N8RA_Xook19Uh';
  let UNAVAILABLE_RANGES=[
    {start_date:"2026-08-11",end_date:"2026-08-26",status:"booked"},
    {start_date:"2026-08-29",end_date:"2026-08-30",status:"booked"},
    {start_date:"2026-08-30",end_date:"2026-09-03",status:"booked"},
    {start_date:"2026-09-04",end_date:"2026-09-06",status:"booked"},
    {start_date:"2026-09-07",end_date:"2026-09-10",status:"booked"},
    {start_date:"2026-09-10",end_date:"2026-09-12",status:"booked"},
    {start_date:"2026-09-13",end_date:"2026-09-26",status:"booked"},
    {start_date:"2026-10-11",end_date:"2026-10-18",status:"booked"},
    {start_date:"2027-03-08",end_date:"2027-03-09",status:"booked"},
    {start_date:"2027-08-15",end_date:"2027-08-16",status:"booked"}
  ];
  async function loadCalendarAvailability(){
    const url=SUPABASE_URL+"/rest/v1/calendar_availability?select=start_date,end_date,status&order=start_date.asc&_cb="+Date.now();
    const attempts=[
      {method:"GET",cache:"no-store",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY}},
      {method:"GET",cache:"no-store",headers:{apikey:SUPABASE_KEY}}
    ];
    let lastError=null;
    for(const options of attempts){
      try{
        const res=await fetch(url,options);
        if(!res.ok)throw new Error("calendar fetch failed: "+res.status);
        const rows=await res.json();
        if(Array.isArray(rows)&&rows.length){UNAVAILABLE_RANGES=rows;renderCalendar();evaluate();return}
        if(Array.isArray(rows)&&rows.length===0)throw new Error("calendar fetch returned no rows");
      }catch(err){lastError=err}
    }
    console.warn("Calendario online non raggiungibile: mantengo l'ultima disponibilità nota.",lastError);
    renderCalendar();evaluate();
  }
  const pad=n=>String(n).padStart(2,"0");
  const key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parse=s=>{if(!s)return null;const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
  const fmt=d=>new Intl.DateTimeFormat(document.documentElement.lang==="en"?"en-GB":"it-IT",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d);
  const monthName=d=>new Intl.DateTimeFormat(document.documentElement.lang==="en"?"en-GB":"it-IT",{month:"long",year:"numeric"}).format(d);
  function fallbackRateForNight(d){
    const y=d.getFullYear(),m=d.getMonth()+1,day=d.getDate(),k=key(d);
    if(k<"2026-08-10"||k>="2028-01-07")return null;
    if((y===2026||y===2027)&&m===8)return 140;
    if((y===2026||y===2027)&&m===9)return 125;
    if((y===2026||y===2027)&&(m===10||m===11||(m===12&&day<=14)))return 95;
    if((y===2026||y===2027)&&m===12&&day>=15&&day<=27)return 110;
    if((y===2026||y===2027)&&m===12&&day>=28&&day<=29)return 120;
    if(((y===2026||y===2027)&&m===12&&day>=30)||((y===2027||y===2028)&&m===1&&day===1))return 130;
    if((y===2027||y===2028)&&m===1&&day>=2&&day<=6)return 110;
    if(y===2027&&((m===1&&day>=7)||m===2||m===3||m===4||m===5))return 95;
    if(y===2027&&m===6)return 110;
    if(y===2027&&m===7)return 125;
    return null;
  }
  let PRICE_RULES=[];
  function rateForNight(d){const k=key(d),rule=PRICE_RULES.find(r=>k>=r.start_date&&k<r.end_date);return rule?Number(rule.nightly_price):fallbackRateForNight(d)}
  async function loadPriceRules(){
    try{
      const res=await fetch(SUPABASE_URL+"/rest/v1/price_rules?select=start_date,end_date,nightly_price&order=start_date.asc",{headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY}});
      if(!res.ok)throw new Error("price fetch failed");
      const rows=await res.json();if(Array.isArray(rows))PRICE_RULES=rows;renderCalendar();evaluate();
    }catch(err){console.warn("Tariffe online non raggiungibili: uso il listino di riserva.",err)}
  }
  const isBookedNight=d=>{const k=key(d);return UNAVAILABLE_RANGES.some(r=>k>=r.start_date&&k<r.end_date)};
  const nightsBetween=(a,b)=>{const out=[];if(!a||!b||b<=a)return out;for(let d=new Date(a);d<b;d=new Date(d.getTime()+DAY))out.push(new Date(d));return out};

  const checkin=document.getElementById("bookCheckin"),checkout=document.getElementById("bookCheckout"),guests=document.getElementById("bookGuests");
  const guestName=document.getElementById("bookName"),guestEmail=document.getElementById("bookEmail"),guestPhone=document.getElementById("bookPhone");
  const quote=document.getElementById("quoteBox"),status=document.getElementById("quoteStatus"),total=document.getElementById("quoteTotal"),detail=document.getElementById("quoteDetail"),wa=document.getElementById("whatsappBooking"),requestSaveStatus=document.getElementById("requestSaveStatus");
  let currentRequestInfo=null;
  const selectableStart=TODAY>START_DATE?TODAY:START_DATE,minStr=key(selectableStart),maxStr=key(MAX_DATE);
  [checkin,checkout,document.getElementById("heroCheckin"),document.getElementById("heroCheckout")].forEach(el=>{if(el){el.min=minStr;el.max=maxStr}});

  function updateLinks(info){
    let msg="Ciao, vorrei verificare la disponibilità di Civico 26.";
    if(info){msg+=`\nCheck-in: ${fmt(info.a)}\nCheck-out: ${fmt(info.b)}\nOspiti: ${guests.value}\nPrezzo indicativo visualizzato: € ${info.sum}\nPotete confermarmi disponibilità e prezzo?`}
    else msg+=" Potete aiutarmi con disponibilità e prezzi?";
    if(wa)wa.href="https://wa.me/393890565680?text="+encodeURIComponent(msg);
  }
  function evaluate(){
    currentRequestInfo=null;const a=parse(checkin.value),b=parse(checkout.value);quote.className="quote";
    if(!a||!b){status.textContent=document.documentElement.lang==="en"?"Select dates":"Seleziona le date";total.textContent="—";detail.textContent=document.documentElement.lang==="en"?"Select check-in and check-out to calculate the total.":"Seleziona check-in e check-out per calcolare il totale.";updateLinks(null);renderCalendar();return}
    if(b<=a){quote.classList.add("error");status.textContent="Date non valide";total.textContent="—";detail.textContent="Il check-out deve essere successivo al check-in.";updateLinks(null);renderCalendar();return}
    const nights=nightsBetween(a,b),blocked=nights.filter(isBookedNight);
    if(blocked.length){quote.classList.add("error");status.textContent=document.documentElement.lang==="en"?"🔴 One or more nights are unavailable":"🔴 Una o più notti non sono disponibili";total.textContent=document.documentElement.lang==="en"?"Unavailable":"Non disponibile";detail.textContent=document.documentElement.lang==="en"?"One or more selected nights are unavailable. Choose different dates.":"Una o più notti selezionate non sono disponibili. Scegli altre date.";updateLinks(null);renderCalendar();return}
    const rates=nights.map(rateForNight);if(rates.some(v=>v===null)){quote.classList.add("error");status.textContent="Tariffa non disponibile";total.textContent="—";detail.textContent="Una delle date selezionate è fuori dal periodo tariffato.";updateLinks(null);renderCalendar();return}
    const sum=rates.reduce((s,v)=>s+v,0);status.textContent=document.documentElement.lang==="en"?"🟢 Dates appear available":"🟢 Le date risultano disponibili";total.textContent=`€ ${sum}`;
    detail.textContent=`${nights.length} ${document.documentElement.lang==="en"?(nights.length===1?"night":"nights"):(nights.length===1?"notte":"notti")} · ${guests.value} ${document.documentElement.lang==="en"?(guests.value==="1"?"guest":"guests"):(guests.value==="1"?"ospite":"ospiti")} · ${document.documentElement.lang==="en"?"estimated total":"totale indicativo"}`;
    currentRequestInfo={a,b,sum,guests:Number(guests.value)};updateLinks({a,b,sum});renderCalendar();
  }
  if(wa)wa.addEventListener("click",async ev=>{
    ev.preventDefault();
    if(!currentRequestInfo){if(requestSaveStatus)requestSaveStatus.textContent="Seleziona prima date disponibili e numero di ospiti.";return}
    const name=(guestName?.value||"").trim(),email=(guestEmail?.value||"").trim(),phone=(guestPhone?.value||"").trim();
    if(name.length<2){guestName?.focus();if(requestSaveStatus)requestSaveStatus.textContent="Inserisci nome e cognome.";return}
    if(!guestEmail?.checkValidity()){guestEmail?.focus();if(requestSaveStatus)requestSaveStatus.textContent="Inserisci un indirizzo email valido.";return}
    const info=currentRequestInfo,popup=window.open("about:blank","_blank");if(requestSaveStatus)requestSaveStatus.textContent="Salvataggio richiesta in corso…";
    try{
      const res=await fetch(SUPABASE_URL+"/rest/v1/rpc/submit_booking_request",{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({p_check_in:key(info.a),p_check_out:key(info.b),p_guests:info.guests,p_guest_name:name,p_guest_email:email,p_guest_phone:phone||null})});
      const data=await res.json().catch(()=>null);if(!res.ok)throw new Error(data?.message||"Non è stato possibile salvare la richiesta.");
      const row=Array.isArray(data)?data[0]:data;if(!row?.request_code)throw new Error("Codice richiesta non ricevuto.");
      const serverTotal=Number(row.estimated_total);let msgText="Ciao, vorrei verificare la disponibilità di Civico 26.";
      msgText+=`\nCodice richiesta: ${row.request_code}\nNome: ${name}\nEmail: ${email}`;if(phone)msgText+=`\nTelefono/WhatsApp: ${phone}`;
      msgText+=`\nCheck-in: ${fmt(info.a)}\nCheck-out: ${fmt(info.b)}\nOspiti: ${info.guests}\nPrezzo indicativo: € ${Number.isFinite(serverTotal)?serverTotal:info.sum}\nPotete confermarmi disponibilità e prezzo?`;
      const url="https://wa.me/393890565680?text="+encodeURIComponent(msgText);if(requestSaveStatus)requestSaveStatus.textContent=`Richiesta ${row.request_code} salvata. Apertura WhatsApp…`;if(popup)popup.location.href=url;else window.location.href=url;
    }catch(err){if(popup)popup.close();if(requestSaveStatus)requestSaveStatus.textContent="Richiesta non salvata: "+(err?.message||String(err))}
  });
  [checkin,checkout,guests].forEach(el=>{if(el)el.addEventListener("change",evaluate)});
  const hIn=document.getElementById("heroCheckin"),hOut=document.getElementById("heroCheckout"),hGuests=document.getElementById("heroGuests"),hGo=document.getElementById("heroBookingGo");
  if(hGo)hGo.addEventListener("click",()=>{if(hIn.value)checkin.value=hIn.value;if(hOut.value)checkout.value=hOut.value;if(hGuests.value)guests.value=hGuests.value;evaluate();document.getElementById("prenota").scrollIntoView({behavior:"smooth"})});
  let view=new Date(selectableStart.getFullYear(),selectableStart.getMonth(),1);const grid=document.getElementById("calendarGrid"),title=document.getElementById("calendarTitle");
  function renderCalendar(){
    if(!grid)return;title.textContent=monthName(view);grid.innerHTML="";
    const first=new Date(view.getFullYear(),view.getMonth(),1),offset=(first.getDay()+6)%7,start=new Date(first.getTime()-offset*DAY),a=parse(checkin.value),b=parse(checkout.value);
    for(let i=0;i<42;i++){
      const d=new Date(start.getTime()+i*DAY),btn=document.createElement("button");btn.type="button";btn.className="cal-day";
      if(d.getMonth()!==view.getMonth())btn.classList.add("other");if(d<selectableStart||d>MAX_DATE)btn.classList.add("past");if(isBookedNight(d))btn.classList.add("booked");if(a&&key(d)===key(a))btn.classList.add("selected");if(b&&key(d)===key(b))btn.classList.add("selected");if(a&&b&&d>a&&d<b)btn.classList.add("in-range");
      const rate=rateForNight(d);let priceLabel="";if(isBookedNight(d))priceLabel=`<span class="cal-price">${document.documentElement.lang==="en"?"Booked":"Occupato"}</span>`;else if(rate!==null)priceLabel=`<span class="cal-price">€${rate}</span>`;
      btn.innerHTML=`<span class="cal-num">${d.getDate()}</span>${priceLabel}`;
      if(!(d<selectableStart||d>MAX_DATE||isBookedNight(d)))btn.addEventListener("click",()=>{if(!checkin.value||(checkin.value&&checkout.value)){checkin.value=key(d);checkout.value=""}else{const aa=parse(checkin.value);if(d<=aa){checkin.value=key(d);checkout.value=""}else checkout.value=key(d)}evaluate()});else btn.disabled=true;
      grid.appendChild(btn);
    }
  }
  document.getElementById("calPrev")?.addEventListener("click",()=>{const nv=new Date(view.getFullYear(),view.getMonth()-1,1),minMonth=new Date(selectableStart.getFullYear(),selectableStart.getMonth(),1);if(nv>=minMonth){view=nv;renderCalendar()}});
  document.getElementById("calNext")?.addEventListener("click",()=>{const nv=new Date(view.getFullYear(),view.getMonth()+1,1),maxMonth=new Date(MAX_DATE.getFullYear(),MAX_DATE.getMonth(),1);if(nv<=maxMonth){view=nv;renderCalendar()}});
  updateLinks(null);renderCalendar();loadCalendarAvailability();loadPriceRules();
  window.addEventListener("focus",()=>loadCalendarAvailability());document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")loadCalendarAvailability()});
})();
