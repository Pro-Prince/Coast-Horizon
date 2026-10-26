import {playerName} from './players.js';
/* Two-player rooms. Credentials stay in an HttpOnly same-site cookie. */
window.createCoastParty=function(game){
  'use strict';
  // A fresh browser tab plays as a separate person; reload keeps its seat.
  // This label is deliberately omitted from the copied invite URL.
  var map=location.pathname.startsWith('/santa-monica')?'santa-monica':'coast';
  var localTest=['localhost','127.0.0.1','[::1]'].indexOf(location.hostname)!==-1;
  var tabLabel=crypto.randomUUID().replaceAll('-','');
  var $=function(id){return document.getElementById(id);};
  var dialog=$('inviteDialog'), link=$('inviteLink'), copy=$('copyInvite'), note=$('inviteNote');
  var badge=$('partyStatus'), retry=$('partyRetry'), solo=$('partySolo'), invite=$('inviteFriend');
  var room=new URL(location.href).searchParams.get('room'), role=null, socket=null, ready=false, stopped=false;
  var inviteURL='', generation=0, attempts=0, reconnectTimer=0, connectTimer=0, pingTimer=0, seq=0, lastSend=0, healthRevision=0;
  var initialName='';
  try{initialName=localStorage.getItem('coast-preferred-name')||'';}catch{}
  var myName=playerName(initialName,'Driver');
  var nameDialog=$('joinNameDialog'),peerName='',departedName='',nameTimer=0,noticeTimer=0;
  if($('hostName'))$('hostName').value=myName;
  if($('menuDriverName'))$('menuDriverName').value=myName;
  function savedDriver(){try{return JSON.parse(sessionStorage.getItem('coast-driver:'+room)||'null');}catch{return null;}}
  function saveDriver(){if(room)try{sessionStorage.setItem('coast-driver:'+room,JSON.stringify({name:myName,role:role}));}catch{}}
  function updateNames(){game.setNames(myName,peer?peerName:'');}
  updateNames();
  function updateMenuButtons(isInvite){
    var ms=$('menuStart'),iv=$('inviteFriend');
    if(!ms||!iv)return;
    var mk=ms.querySelector('.menu-start-key'),mh=ms.querySelector('.menu-start-hint');
    var ik=iv.querySelector('.menu-start-key'),ih=iv.querySelector('.menu-start-hint');
    if(isInvite){
      if(mk)mk.textContent='Join friend';
      if(mh)mh.textContent='Invite detected · click to join';
      if(ik)ik.textContent='Drive solo';
      if(ih)ih.textContent='Single player';
    }else{
      if(mk)mk.textContent='Start game';
      if(mh)mh.textContent='or press space';
      if(ik)ik.textContent='Invite friend';
      if(ih)ih.textContent='Together is fun';
    }
  }
  function setDriverName(val){
    myName=playerName(val,'Driver');
    if($('hostName') && $('hostName').value!==myName)$('hostName').value=myName;
    if($('menuDriverName') && $('menuDriverName').value!==myName)$('menuDriverName').value=myName;
    try{localStorage.setItem('coast-preferred-name',myName);}catch{}
    saveDriver();
    updateNames();
    if(p2pChannel){
      if(role==='host'){
        if(broadcastP2PRoster)broadcastP2PRoster();
      }else{
        p2pChannel.send({type:'profile',name:myName});
      }
    }
    send({type:'profile',name:myName});
  }
  function shareName(){setDriverName($('hostName').value);}
  $('hostName').addEventListener('input',()=>{clearTimeout(nameTimer);nameTimer=setTimeout(shareName,150);});
  $('hostName').addEventListener('change',shareName);
  if($('menuDriverName')){
    $('menuDriverName').addEventListener('input',()=>{clearTimeout(nameTimer);nameTimer=setTimeout(()=>setDriverName($('menuDriverName').value),150);});
    $('menuDriverName').addEventListener('change',()=>setDriverName($('menuDriverName').value));
  }
  $('joinNameForm').onsubmit=function(e){e.preventDefault();var val=$('guestName').value.trim();if(!val){$('guestName').setCustomValidity('Please enter your name.');$('guestName').reportValidity();return;}myName=playerName(val,'Driver');try{localStorage.setItem('coast-preferred-name',myName);}catch{}if($('menuDriverName'))$('menuDriverName').value=myName;if($('hostName'))$('hostName').value=myName;saveDriver();nameDialog.close();updateNames();connect();};
  $('guestName').oninput=()=>$('guestName').setCustomValidity('');
  $('cancelJoin').onclick=()=>{nameDialog.close();leave();};
  nameDialog.addEventListener('cancel',e=>{e.preventDefault();nameDialog.close();leave();});
  var startAt=0,begunAt=null,mineReady=false,readyDialog=$('readyDialog'),p2pChannel=null;
  var hostReady=false,guestReady=false,broadcastP2PRoster=null,activePeer=null;
  var readyDismissed=false,peerWasConnected=false;
  function send(m){
    if(!ready)return;
    if(m && !m._tab) m._tab=tabLabel;
    if(socket && socket.readyState===1)socket.send(JSON.stringify(m));
    else if(p2pChannel)p2pChannel.send(m);
  }
  function readiness(force=false){
    game.unlock();if(!ready||!peer)return;
    if(startAt&&game.now()>=startAt)return;
    if(dialog.open)dialog.close();
    if(!force && readyDismissed && !mineReady)return;
    if(!readyDialog.open)readyDialog.showModal();
  }
  function setReady(val){
    game.unlock();
    if(!val){
      readyDismissed=true;
      mineReady=false;
      if(readyDialog.open)readyDialog.close();
      $('readyYes').disabled=false;$('readyYes').textContent='Yes, ready!';
      $('readyNo').textContent='No, not yet';
      if(p2pChannel){
        if(role==='host'){
          hostReady=false;
          if(broadcastP2PRoster)broadcastP2PRoster();
          return;
        }else{
          p2pChannel.send({type:'ready',value:false});
          return;
        }
      }
      send({type:'ready',value:false});
      return;
    }
    readyDismissed=false;
    mineReady=true;
    $('readyYes').disabled=true;$('readyYes').textContent='You are ready ✓';
    $('readyNo').textContent='Not ready yet';
    if(p2pChannel){
      if(role==='host'){
        hostReady=true;
        if(broadcastP2PRoster)broadcastP2PRoster();
        return;
      }else{
        p2pChannel.send({type:'ready',value:true});
        return;
      }
    }
    send({type:'ready',value:true});
  }
  $('readyYes').onclick=function(){setReady(true);};
  $('readyNo').onclick=function(){setReady(false);};
  readyDialog.addEventListener('cancel',function(){setReady(false);});
  var lastPong=0, peer=false, lastPeer=0, samples=[], busy=false, inviteCreation=0, lastStatus='';
  function status(text){if(lastStatus===text)return;lastStatus=text;badge.textContent=text;}
  function stopMotion(){game.stop();}
  function state(){return {room:room,role:role,connected:ready,peer:peer,startAt:startAt,mineReady:mineReady,status:lastStatus,name:myName,peerName:peerName};}
  var reportedFailures=new Set();
  function showError(code){
    var failureKey=room+':'+code;if(!reportedFailures.has(failureKey)){reportedFailures.add(failureKey);window.coastAnalytics.track('join_failed',{reason:['full','expired','invalid','replaced','network'].includes(code)?code:'unavailable',room:/^[a-f0-9]{32}$/.test(room||'')?room:undefined});}
    ready=false;peer=false;samples=[];game.hidePeer();stopMotion();if(readyDialog.open)readyDialog.close();
    var message={full:'This room already has two players.',expired:'This invite has expired. Ask your friend for a new link.',invalid:'This invite is not valid.',replaced:'Your drive is open in another tab.',network:'Connection lost. Try again or drive solo.'}[code]||'Unable to connect. Try again or drive solo.';
    status(message);note.textContent=message;retry.hidden=code!=='network';solo.hidden=false;
  }
  function closeSocket(graceful=false){
    generation++;clearTimeout(reconnectTimer);clearTimeout(connectTimer);clearInterval(pingTimer);
    hostReady=false;guestReady=false;broadcastP2PRoster=null;
    if(activePeer){try{activePeer.destroy();}catch{}activePeer=null;}
    if(p2pChannel){try{p2pChannel.close();}catch{}p2pChannel=null;}
    if(socket){socket.onclose=socket.onmessage=socket.onerror=null;if(graceful&&socket.readyState===1){var outgoing=socket;outgoing.send(JSON.stringify({type:'exit'}));outgoing.onmessage=e=>{try{if(JSON.parse(e.data).type==='exited')outgoing.close();}catch{}};setTimeout(()=>outgoing.close(),1500);}else socket.close();socket=null;}
    ready=false;
  }
  async function api(path){
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},10000);
    try{
      var response=await fetch(path,{method:'POST',credentials:'same-origin',signal:controller.signal,headers:{'X-Coast-Tab':tabLabel,'X-Coast-Map':map}});
      if(!response.ok)throw new Error('Connection failed');
      return await response.json();
    }finally{clearTimeout(timer);}
  }
  function updateRoster(players,nextStart){
    var other=players.find(function(p){return p.role!==role;}),mine=players.find(p=>p.role===role);
    var newlyConnected=!peerWasConnected&&!!other;
    peerWasConnected=!!other;
    peer=!!other;if(mine){myName=mine.name||myName;saveDriver();}if(other){peerName=other.name||'Friend';departedName='';}updateNames();mineReady=!!mine?.ready;
    if(nextStart){
      var startDelay=3200;
      if(nextStart>1000000000){
        startDelay=Math.max(500,Math.min(5000,nextStart-Date.now()));
      }else if(nextStart>0&&nextStart<15000){
        startDelay=nextStart;
      }
      startAt=game.now()+startDelay;
    }else{
      startAt=0;
    }
    if(other){lastPeer=performance.now();samples=[{t:lastPeer,pose:other.pose}];game.showPeer(other.pose);}
    else{samples=[];game.hidePeer();}
    if(!startAt&&mine&&!begunAt)game.place(mine.pose);
    if(startAt){
      document.querySelectorAll('dialog').forEach(d=>{try{if(d.open)d.close();}catch(e){}d.removeAttribute('open');});
      status(!peer&&departedName?departedName+' left':'');
      if(begunAt!==startAt){begunAt=startAt;game.begin(startAt);}
    }else{
      if(mine)game.restoreRun(mine.health,mine.distance,mine.race,mine.fuel);
      begunAt=null;game.cancelStart?.();stopMotion();
      status(peer?'':departedName?departedName+' left':'Waiting for your friend…');if(!peer&&readyDialog.open)readyDialog.close();
      $('readyTitle').textContent=peer?peerName+' joined — are you ready?':'Waiting for your friend';
      $('readyMessage').textContent=mineReady?peerName+' is not yet ready. Waiting for their Yes.':peer?'Both drivers choose Yes to start.':'Share your invite. Both drivers must be here to begin.';
      $('readyYes').disabled=mineReady;$('readyYes').textContent=mineReady?'You are ready ✓':'Yes, ready!';
      $('readyNo').textContent=mineReady?'Not ready yet':'No, not yet';
      if(newlyConnected){
        readyDismissed=false;
        readiness(true);
      }else if(readyDialog.open){
        readiness(true);
      }
    }
    note.textContent=peer?'Your friend is here. Choose when to begin.':'Send this link to one friend. It stays available for 24 hours.';
  }
  function handleMessage(m){
    if(m.type==='error'){stopped=true;closeSocket();showError(m.code);return;}
    if(m.type==='welcome'){
      if(m.map&&m.map!==map){location.replace((m.map==='santa-monica'?'/santa-monica/':'/')+'?room='+room);return;}
      clearTimeout(connectTimer);role=m.role;ready=true;attempts=0;seq=0;healthRevision=m.healthRevision||0;myName=myName||m.name;saveDriver();updateNames();if(nameDialog.open)nameDialog.close();send({type:'profile',name:myName});
      retry.hidden=solo.hidden=true;document.body.classList.add('in-party');
      if(game.syncWorld && Number.isFinite(m.worldTime))game.syncWorld(m.worldTime);
      game.restoreRun(m.health,m.distance,m.race,m.fuel);game.restore(m.impacts,m.cooldowns);game.restoreRaceWorld?.(m.raceWorld);game.boost(m.boostUntil||0);game.setRole(role);game.place(m.pose);begunAt=null;startAt=m.startAt||0;
      if(role==='guest'){invite.hidden=true;}
      status(role==='host'?'Waiting for your friend · you are red':'Connected · you are blue');
      lastPong=Date.now();
      pingTimer=setInterval(function(){
        if(localTest && document.hidden)return;
        if(socket && Date.now()-lastPong>20000){socket.close();return;}
        if(socket && socket.readyState===1)socket.send('__ping');
      },5000);
    }
    if(m.type==='playerLeft'){departedName=m.name||peerName||'Friend';$('departureNotice').textContent=departedName+' left';$('departureNotice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('departureNotice').hidden=true,9000);}
    if(m.type==='profile'){peerName=m.name||'Friend';departedName='';updateNames();}
    if(m.type==='roster')updateRoster(m.players,m.startAt);
    if(m.type==='raceWorld')game.restoreRaceWorld?.(m.world);
    if(m.type==='pickup'||m.type==='fuel'||m.type==='boost'||m.type==='repair'){
      var avail=m.available||(game.now()+20000);
      var pid=m.pickup||m.id;
      if(pid)game.pickup(pid,avail);
      if(m.role===role){
        if(m.type==='fuel'&&typeof m.fuel==='number')game.refuel(m.fuel);
        if(m.type==='boost'&&typeof m.until==='number')game.boost(m.until);
        if(m.type==='repair'&&typeof m.health==='number'){healthRevision=m.healthRevision||healthRevision;game.repair(m.health,m.amount||25);}
      }
    }
    if(m.type==='pose'&&m.role===role)game.fuelSync(m.pose.fuel);
    if(m.type==='race'&&m.role===role)game.restoreRace(m.race);
    if(m.type==='boostRejected'||m.type==='repairRejected'||m.type==='fuelRejected'){game.pickup(m.pickup,game.now()+1000);}
    if(m.type==='condition'&&m.role===role)game.condition(m.health);
    if(m.type==='impact'&&(m.target!=='peer'||m.role===role))game.impact(m);
    if(m.type==='pose' && m.role!==role){
      peer=true;lastPeer=performance.now();
      var poseData=m.pose || m;
      if(poseData && typeof poseData.x === 'number' && typeof poseData.z === 'number'){
        samples.push({t:lastPeer,pose:poseData});if(samples.length>12)samples.shift();
      }
    }
    if(m.type==='restarted')game.restart(m.pose);
    if(m.type==='reset'||m.type==='correction'){game.place(m.pose);game.restoreRace(m.race);}
  }

  function initP2P(current){
    if(current!==generation || stopped)return;
    var bc=null;
    try{if(typeof BroadcastChannel!=='undefined')bc=new BroadcastChannel('coast_room_'+room);}catch{}
    var peers=[];
    var isHost=role==='host';

    p2pChannel={
      send:function(msg){
        var data=JSON.stringify(msg);
        if(bc){try{bc.postMessage(data);}catch{}}
        for(var i=0;i<peers.length;i++){try{if(peers[i].open)peers[i].send(data);}catch{}}
      },
      close:function(){
        if(bc){try{bc.close();}catch{}bc=null;}
        for(var i=0;i<peers.length;i++){try{peers[i].close();}catch{}}
        peers=[];p2pChannel=null;
      }
    };

    broadcastP2PRoster=function(){
      var bothReady=hostReady&&guestReady;
      var hostPose={x:2.4,y:0,z:0,h:0,v:0};
      var guestPose={x:-2.4,y:0,z:-3.5,h:0,v:0};
      var rosterMsg={
        type:'roster',
        players:[
          {role:'host',name:myName,ready:hostReady,pose:hostPose},
          {role:'guest',name:peerName,ready:guestReady,pose:guestPose}
        ],
        startAt:bothReady?3200:0
      };
      p2pChannel.send(rosterMsg);
      handleMessage(rosterMsg);
    };

    var joinPulse=null;
    function onIncomingData(raw){
      if(current!==generation || stopped)return;
      var m;try{m=typeof raw==='string'?JSON.parse(raw):raw;}catch{return;}
      if(m._tab===tabLabel)return;
      if(m.type==='join'&&isHost){
        peer=true;peerName=m.name||'Friend';updateNames();
        if(begunAt || (startAt && game.now() < startAt + 10000)){
          if(broadcastP2PRoster)broadcastP2PRoster();
          return;
        }
        var guestPose={x:-2.4,y:0,z:-3.5,h:0,v:0};
        var hostPose={x:2.4,y:0,z:0,h:0,v:0};
        game.place(hostPose);
        var welcomeMsg={type:'welcome',role:'guest',name:m.name,pose:guestPose,health:100,distance:0,race:1,fuel:100,startAt:0,_forTab:m._tab};
        p2pChannel.send(welcomeMsg);
        broadcastP2PRoster();
        return;
      }
      if(m.type==='welcome'&&!isHost){
        if(m._forTab&&m._forTab!==tabLabel)return;
        if(joinPulse){clearInterval(joinPulse);joinPulse=null;}
        role='guest';ready=true;attempts=0;clearTimeout(connectTimer);
        handleMessage(m);
        return;
      }
      if(m.type==='ready'&&isHost){
        guestReady=!!m.value;
        broadcastP2PRoster();
        return;
      }
      if(m.type==='restart'){
        var restartPose={x:role==='guest'?-2.4:2.4,y:0,z:role==='guest'?-3.5:0,h:0,v:0};
        p2pChannel.send({type:'restarted',pose:restartPose});
        handleMessage({type:'restarted',pose:restartPose});
        return;
      }
      if(m.type==='profile'){
        peerName=playerName(m.name,'Friend');
        departedName='';
        updateNames();
        if(isHost && broadcastP2PRoster)broadcastP2PRoster();
        return;
      }
      handleMessage(m);
    }

    if(bc)bc.onmessage=function(ev){onIncomingData(ev.data);};

    try{
      if(typeof Peer!=='undefined'){
        var peerId=isHost?('coast-'+room):undefined;
        var pInst=peerId?new Peer(peerId):new Peer();
        activePeer=pInst;
        pInst.on('open',function(){
          if(!isHost){
            var conn=pInst.connect('coast-'+room,{reliable:true});
            conn.on('open',function(){peers.push(conn);p2pChannel.send({type:'join',name:myName,_tab:tabLabel});});
            conn.on('data',onIncomingData);
            conn.on('close',function(){var idx=peers.indexOf(conn);if(idx!==-1)peers.splice(idx,1);});
          }
        });
        pInst.on('connection',function(conn){
          peers.push(conn);
          conn.on('open',function(){if(isHost&&peer&&broadcastP2PRoster)broadcastP2PRoster();});
          conn.on('data',onIncomingData);
          conn.on('close',function(){var idx=peers.indexOf(conn);if(idx!==-1)peers.splice(idx,1);peer=false;handleMessage({type:'playerLeft',name:peerName});});
        });
        pInst.on('error',function(err){
          console.warn('PeerJS info:',err.type||err);
        });
      }
    }catch(e){console.warn('PeerJS init:',e);}

    ready=true;retry.hidden=solo.hidden=true;
    document.body.classList.add('in-party');
    if(isHost){
      status('Waiting for your friend · you are red');
      game.setRole('host');updateNames();
    }else{
      status('Joining your shared drive…');
      game.setRole('guest');updateNames();
      p2pChannel.send({type:'join',name:myName,_tab:tabLabel});
      joinPulse=setInterval(function(){
        if(peer||(ready&&role==='guest'&&begunAt)||stopped||current!==generation){if(joinPulse){clearInterval(joinPulse);joinPulse=null;}return;}
        p2pChannel.send({type:'join',name:myName,_tab:tabLabel});
      },1000);
    }
  }

  async function connect(){
    if(!room || stopped||nameDialog.open)return;
    closeSocket();var current=generation;
    status(attempts?'Reconnecting…':'Joining your shared drive…');retry.hidden=true;
    var hasServer=false;
    try{var session=await api('/api/session');if(session)hasServer=true;}catch{}
    if(current!==generation || stopped)return;
    if(!hasServer){
      initP2P(current);
      return;
    }
    socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/'+room+('?tab='+tabLabel));
    var ws=socket;
    connectTimer=setTimeout(function(){if(!ready)ws.close();},6000);
    ws.onmessage=function(event){
      if(current!==generation)return;
      if(event.data==='__pong'){lastPong=Date.now();return;}
      var m;try{m=JSON.parse(event.data);}catch{return;}
      handleMessage(m);
    };
    ws.onerror=function(){try{ws.close();}catch{}};
    ws.onclose=function(event){
      if(current!==generation || stopped)return;
      if(event.code===4001){stopped=true;closeSocket();showError('replaced');return;}
      if(event.code===4003 || event.code===4004){stopped=true;closeSocket();showError(event.code===4003?'full':'expired');return;}
      reconnect();
    };
  }
  function reconnect(){
    closeSocket();stopMotion();game.hidePeer();peer=false;samples=[];
    if(stopped)return;
    if(++attempts>2){initP2P(generation);return;}
    status('Connection lost · reconnecting…');solo.hidden=false;
    reconnectTimer=setTimeout(connect,Math.min(3000,500*Math.pow(2,attempts-1)));
  }
  function fillLink(){link.value=inviteURL;copy.disabled=!inviteURL;copy.textContent='Copy link';}
  async function openInvite(){
    if(role==='guest')return;
    if($('exitDialog').open)$('exitDialog').close();
    try{
      var prefHostName='';
      try{prefHostName=localStorage.getItem('coast-preferred-name')||'';}catch{}
      if(prefHostName && $('hostName') && $('hostName').value==='user1') $('hostName').value=prefHostName;
    }catch{}
    if(!dialog.open)dialog.showModal();stopMotion();fillLink();
    if(inviteURL){note.textContent=peer?'Your friend is here. Enjoy the coast together.':'Share this link with one friend. Keep this page open.';return;}
    if(busy)return;var creation=++inviteCreation;busy=true;$('inviteTryAgain').hidden=true;
    note.textContent='Creating your invite…';copy.disabled=true;
    try{
      var data=null;
      if(/^https?:$/.test(location.protocol)){
        try{data=await api('/api/rooms');}catch{}
      }
      if(!data || !data.room){
        var randHex='';
        if(typeof crypto!=='undefined'&&crypto.randomUUID)randHex=crypto.randomUUID().replace(/-/g,'');
        else for(var i=0;i<32;i++)randHex+=Math.floor(Math.random()*16).toString(16);
        var targetPath=(map==='santa-monica'?'/santa-monica/':'/');
        data={room:randHex,invite:location.origin+targetPath+'?room='+randHex};
      }
      if(creation!==inviteCreation)return;
      room=data.room;role='host';myName=playerName($('hostName').value,'Driver');if($('menuDriverName'))$('menuDriverName').value=myName;try{localStorage.setItem('coast-preferred-name',myName);}catch{}saveDriver();game.setRole('host');updateNames();inviteURL=data.invite;stopped=false;attempts=0;
      game.place({x:2.4,y:0,z:0,h:0,v:0});
      history.replaceState(null,'',(map==='santa-monica'?'/santa-monica/':'/')+'?room='+room);fillLink();
      note.textContent='Share this link with one friend. Keep this page open.';
      retry.hidden=solo.hidden=$('inviteTryAgain').hidden=true;
      document.body.classList.add('in-party');
      await connect();
    }catch(err){
      if(creation!==inviteCreation)return;
      if(!inviteURL){
        var fallbackHex='';
        if(typeof crypto!=='undefined'&&crypto.randomUUID)fallbackHex=crypto.randomUUID().replace(/-/g,'');
        else for(var i=0;i<32;i++)fallbackHex+=Math.floor(Math.random()*16).toString(16);
        var p=(map==='santa-monica'?'/santa-monica/':'/');
        room=fallbackHex;role='host';inviteURL=location.origin+p+'?room='+room;
        history.replaceState(null,'',p+'?room='+room);fillLink();
        note.textContent='Share this link with one friend. Keep this page open.';
        retry.hidden=solo.hidden=$('inviteTryAgain').hidden=true;
        document.body.classList.add('in-party');
      }
    }finally{if(creation===inviteCreation)busy=false;}
  }
  $('inviteTryAgain').addEventListener('click',openInvite);
  function inviteClick(){
    if(role==='guest'&&room){
      leave();
      return;
    }
    window.coastAnalytics.track('invite_click');
    openInvite();
  }
  invite.addEventListener('click',inviteClick);
  $('closeInvite').addEventListener('click',function(){dialog.close();});
  dialog.addEventListener('click',function(e){if(e.target===dialog && (e.offsetX<0||e.offsetY<0||e.offsetX>dialog.clientWidth||e.offsetY>dialog.clientHeight))dialog.close();});
  dialog.addEventListener('close',function(){
    // A cancelled creation must not switch a later solo game into a room.
    if(busy&&!room){inviteCreation++;busy=false;}
  });
  copy.addEventListener('click',async function(){
    if(!inviteURL)return;shareName();
    try{await navigator.clipboard.writeText(inviteURL);copy.textContent='Copied!';note.textContent='Link copied. Send it to your friend.';}
    catch{link.focus();link.select();note.textContent='Select and copy the link above to share it.';}
  });
  retry.addEventListener('click',function(){stopped=false;attempts=0;if(room)connect();else openInvite();});
  function leave(){
    inviteCreation++;busy=false;clearTimeout(nameTimer);stopped=true;closeSocket(true);room=null;role=null;peer=false;samples=[];inviteURL='';startAt=0;begunAt=null;mineReady=false;hostReady=false;guestReady=false;readyDismissed=false;peerWasConnected=false;
    history.replaceState(null,'',location.pathname);game.hidePeer();game.setRole('host');game.restoreRun(100,0);game.boost(0);game.restore([],{});
    retry.hidden=solo.hidden=true;invite.hidden=false;
    var savedName='';try{savedName=localStorage.getItem('coast-preferred-name')||'';}catch{}
    myName=playerName(savedName||myName,'Driver');peerName='';departedName='';game.setNames(myName,'');if($('hostName'))$('hostName').value=myName;if($('menuDriverName'))$('menuDriverName').value=myName;status('');$('departureNotice').hidden=true;
    var l1=$('localDriverName'),l2=$('peerDriverName');if(l1)l1.hidden=true;if(l2)l2.hidden=true;
    document.body.classList.remove('in-party');
    updateMenuButtons(false);
    if(dialog.open)dialog.close();if(readyDialog.open)readyDialog.close();if(nameDialog.open)nameDialog.close();
  }
  function requestStart(){
    // An invite alone is not a multiplayer race. Start solo until a guest joins.
    if(role==='host'&&!peer){leave();return false;}
    if(role==='guest'&&!peer&&!ready){
      if(!nameDialog.open){
        var prefName='';
        try{prefName=localStorage.getItem('coast-preferred-name')||'';}catch{}
        if(prefName)$('guestName').value=prefName;
        nameDialog.showModal();
        $('guestName').focus();
        if(prefName)$('guestName').select();
      }
      return true;
    }
    readyDismissed=false;
    readiness(true);return true;
  }
  solo.addEventListener('click',function(){leave();game.place({x:0,z:0,h:0,v:0});game.begin(game.now()+3000);});
  window.addEventListener('offline',function(){
    if(room&&!stopped){closeSocket();stopMotion();game.hidePeer();peer=false;samples=[];
      status('Offline · reconnecting when you return');solo.hidden=false;}
  });
  window.addEventListener('online',function(){if(room&&!ready&&!stopped){attempts=0;connect();}});
  document.addEventListener('visibilitychange',function(){
    stopMotion();
    if(document.hidden && ready && (socket || p2pChannel)){var p=game.pose();p.type='pose';p.seq=++seq;p.healthRevision=healthRevision;send(p);}
    if(!document.hidden && room&&!stopped&&(!socket||socket.readyState>1)&&!p2pChannel){attempts=0;connect();}
  });
  window.addEventListener('pagehide',function(){closeSocket();});
  window.addEventListener('pageshow',function(e){if(e.persisted&&room&&!stopped)connect();});
  if(room){
    if(!/^[a-f0-9]{32}$/.test(room)){
      stopped=true;
      room=null;
      history.replaceState(null,'',location.pathname);
      status('');
    }else{
      inviteURL=location.origin+location.pathname+'?room='+room;
      document.body.classList.add('in-party');
      var saved=savedDriver();
      if(saved){
        myName=playerName(saved.name,saved.role==='host'?'Driver':'Guest');
        if(saved.role==='host'){if($('hostName'))$('hostName').value=myName;if($('menuDriverName'))$('menuDriverName').value=myName;}
        else $('guestName').value=myName;
        role=saved.role||'guest';
        game.setRole(role);
        updateNames();
        connect();
      }else{
        role='guest';
        game.setRole('guest');
        var prefName='';
        try{prefName=localStorage.getItem('coast-preferred-name')||'';}catch{}
        if(prefName)$('guestName').value=prefName;
        myName=playerName(prefName,'Guest');
        updateNames();
        updateMenuButtons(true);
        nameDialog.showModal();
        $('guestName').focus();
        if(prefName)$('guestName').select();
      }
    }
  }else status('');
  window.__COAST_DEBUG=state;
  return {
    raceStart:function(){return startAt;},active:function(){return !!room;},leave:leave,launch:function(){send({type:'launch'});},
    restart:function(){
      if(p2pChannel){
        var restartPose={x:role==='guest'?-2.4:2.4,y:0,z:role==='guest'?-3.5:0,h:0,v:0};
        p2pChannel.send({type:'restarted',pose:restartPose});
        handleMessage({type:'restarted',pose:restartPose});
      }else{
        send({type:'restart'});
      }
    },
    requestStart:requestStart,
    collect:function(id,kind,lap){
      var p=game.pose();
      var cd=game.now()+20000;
      game.pickup(id,cd);
      send({type:'pickup',pickup:id,kind:kind,role:role,lap:lap,available:cd,until:game.now()+5000});
      send({type:kind==='fuel'?'fuel':kind==='repair'?'repair':'boost',pickup:id,role:role,available:cd,until:game.now()+5000});
      send({type:'pose',role:role,pose:p,seq:++seq,healthRevision:healthRevision});
    },
    sendImpact:function(hit){send({type:'impact',...hit});},
    blocked:function(){return (nameDialog&&nameDialog.open) || (dialog&&dialog.open) || (readyDialog&&readyDialog.open) || (!!room&&(!ready||!startAt||game.now()<startAt));},
    canStart:function(){return !nameDialog.open && !dialog.open && (!room||ready);},
    spawnX:function(){return room?(role==='guest'?-2.4:2.4):0;},
    reset:function(){if(room){if(ready)send({type:'reset'});return true;}return false;},
    frame:function(t){
      if(ready && startAt && game.now()>=startAt && ((socket && socket.readyState===1)||p2pChannel) && t-lastSend>=50 && !document.hidden){
        lastSend=t;var p=game.pose();send({type:'pose',role:role,pose:p,seq:++seq,healthRevision:healthRevision});
      }
      if(peer&&samples.length){
        var target=t-100;
        while(samples.length>2 && samples[1].t<=target)samples.shift();
        var a=samples[0],b=samples[1]||a;
        if(a && a.pose && b && b.pose){
          var f=(a===b || !b.t || b.t===a.t) ? 1 : Math.max(0,Math.min(1,(target-a.t)/(b.t-a.t)));
          var ah=a.pose.h||0, bh=b.pose.h||0;
          var angle=Math.atan2(Math.sin(bh-ah),Math.cos(bh-ah));
          var aRoll=a.pose.roll||0, bRoll=b.pose.roll||0;
          var rollAngle=Math.atan2(Math.sin(bRoll-aRoll),Math.cos(bRoll-aRoll));
          game.showPeer({roll:aRoll+rollAngle*f,yaw:(a.pose.yaw||0)+((b.pose.yaw||0)-(a.pose.yaw||0))*f,y:(a.pose.y||0)+((b.pose.y||0)-(a.pose.y||0))*f,pitch:(a.pose.pitch||0)+((b.pose.pitch||0)-(a.pose.pitch||0))*f,jumpId:b.pose.jumpId||null,x:a.pose.x+(b.pose.x-a.pose.x)*f,z:a.pose.z+(b.pose.z-a.pose.z)*f,h:ah+angle*f,v:b.pose.v||0,boostUntil:b.pose.boostUntil||0,health:b.pose.health??100,launched:b.pose.launched!==false,drowned:!!b.pose.drowned});
          if(t-lastPeer>3500 && !localTest){game.hidePeer();status(role==='host'?'Friend is away · waiting for updates':'Host is away · waiting for updates');}
          else if(lastStatus.indexOf('away')>=0)status(role==='host'?'Friend joined · you are red':'Connected · you are blue');
        }
      }
    }
  };
};
