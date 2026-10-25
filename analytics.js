/* Anonymous first-party metrics. No IPs, names, email addresses, or room links are stored. */
(function(){
  'use strict';
  var disabled=navigator.webdriver||navigator.globalPrivacyControl===true;
  if(disabled){document.cookie='coast_metrics_optout=1; Path=/; SameSite=Lax';window.coastAnalytics={track:function(){},playing:function(){}};return;}
  document.cookie='coast_metrics_optout=; Path=/; Max-Age=0; SameSite=Lax';
  var visitor,visit=crypto.randomUUID(),queue=[],sending=false,backoff=1000,timer=0;
  try{visitor=localStorage.getItem('coast-visitor-id');}catch{}
  if(!/^[0-9a-f-]{36}$/i.test(visitor||'')){visitor=crypto.randomUUID();try{localStorage.setItem('coast-visitor-id',visitor);}catch{}}
  // Staged releases remain silent until the private database credentials are configured.
  var enabled=null;
  var configuration=fetch('/api/analytics').then(r=>r.ok?r.json():{enabled:false}).then(c=>{enabled=c.enabled===true;}).catch(()=>{enabled=false;});
  var active=false,segmentAt=0,runStarted=false,mode='solo';
  function room(){var r=new URL(location.href).searchParams.get('room');return /^[a-f0-9]{32}$/.test(r||'')?r:undefined;}
  function schedule(ms){clearTimeout(timer);timer=setTimeout(flush,ms);}
  function track(type,data){
    if(enabled===false)return;
    queue.push(Object.assign({id:crypto.randomUUID(),visit_id:visit,type:type,at:Date.now()},data||{}));
    if(queue.length>300)queue.splice(0,queue.length-300);
    schedule(150);
  }
  function payload(batch){return JSON.stringify({visitor_id:visitor,events:batch});}
  async function flush(){
    if(sending||!queue.length)return;sending=true;
    await configuration;if(!enabled){queue=[];sending=false;return;}
    var batch=queue.slice(0,20);
    try{
      var response=await fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:payload(batch),keepalive:true,signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw Error('Metrics unavailable');
      var ids=new Set(batch.map(e=>e.id));queue=queue.filter(e=>!ids.has(e.id));backoff=1000;
    }catch{backoff=Math.min(60000,backoff*2);}
    finally{sending=false;if(queue.length)schedule(backoff);}
  }
  function saveTime(){
    if(!active)return;var now=performance.now(),elapsed=Math.round(now-segmentAt);segmentAt=now;
    // A suspended page must never turn hours asleep into hours played.
    if(elapsed>0&&elapsed<=45000)track('play_time',{duration_ms:elapsed,mode:mode,room:room()});
  }
  function playing(value,nextMode,inRun){
    value=!!value&&!document.hidden;nextMode=nextMode||'solo';
    if(!inRun)runStarted=false;
    if(value&&!runStarted){runStarted=true;track('play_started',{mode:nextMode,room:room()});}
    if(value===active&&mode===nextMode)return;
    saveTime();active=value;mode=nextMode;segmentAt=performance.now();
  }
  function beacon(){
    saveTime();active=false;
    if(!queue.length||enabled!==true)return;
    // Keep IDs queued: if the browser resumes, repeated delivery is harmless.
    for(var i=0;i<queue.length;i+=20)navigator.sendBeacon('/api/analytics',new Blob([payload(queue.slice(i,i+20))],{type:'application/json'}));
  }
  window.coastAnalytics={track:track,playing:playing};
  track('visit',{room:room()});if(new URL(location.href).searchParams.has('room'))track('join_attempt',{room:room()});
  setInterval(function(){saveTime();flush();},15000);
  document.addEventListener('visibilitychange',function(){if(document.hidden)beacon();else flush();});
  window.addEventListener('pagehide',beacon);window.addEventListener('online',flush);
})();
