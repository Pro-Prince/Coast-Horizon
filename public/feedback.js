(function(){
 const modal=document.getElementById('feedbackDialog'),form=document.getElementById('feedbackForm'),send=document.getElementById('feedbackSend'),cancel=document.getElementById('feedbackCancel'),status=document.getElementById('feedbackStatus');
 let requestID=crypto.randomUUID(),busy=false;
 function close(){if(!busy)modal.close();}
 document.getElementById('feedbackButton').addEventListener('click',()=>{status.textContent='';modal.showModal();});
 cancel.addEventListener('click',close);modal.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 form.addEventListener('input',()=>{requestID=crypto.randomUUID();status.textContent='';});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!form.reportValidity())return;
  busy=true;send.disabled=cancel.disabled=true;send.textContent='Sending…';status.textContent='';
  const data=Object.fromEntries(new FormData(form));data.id=requestID;
  try{
   const r=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(12000)});
   const result=await r.json();if(!r.ok||!result.ok)throw Error(result.error||'Could not send. Please try again.');
   form.reset();requestID=crypto.randomUUID();status.textContent='Thank you! Your feedback has been sent.';
  }catch(error){status.textContent=error.name==='TimeoutError'?'Sending took too long. Please try again.':error.message;}
  finally{busy=false;send.disabled=cancel.disabled=false;send.textContent='Send';}
 });
})();
