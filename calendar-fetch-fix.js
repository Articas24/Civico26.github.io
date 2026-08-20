(function(){
  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      const raw=typeof input==='string'?input:input?.url;
      if(raw&&raw.includes('/rest/v1/calendar_availability?')){
        const url=new URL(raw,window.location.href);
        url.searchParams.delete('_cb');
        if(typeof input==='string') input=url.toString();
        else if(input instanceof Request) input=new Request(url.toString(),input);
      }
    }catch(err){console.warn('Calendar request cleanup skipped.',err)}
    return nativeFetch(input,init);
  };
})();
