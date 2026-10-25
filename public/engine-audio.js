// A warm combustion pulse plus a low exhaust body; no per-frame audio allocations.
export function createEngineVoice(ctx,master){
 const exhaust=ctx.createOscillator(),body=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),bodyGain=ctx.createGain();
 const real=new Float32Array(13),imag=Float32Array.from([0,1,.58,.32,.24,.13,.11,.065,.05,.03,.025,.015,.01]);
 exhaust.setPeriodicWave(ctx.createPeriodicWave(real,imag));body.type='sine';filter.type='lowpass';filter.Q.value=.65;filter.frequency.value=600;
 gain.gain.value=bodyGain.gain.value=.0001;exhaust.frequency.value=32;body.frequency.value=16;
 exhaust.connect(filter);filter.connect(gain);gain.connect(master);body.connect(bodyGain);bodyGain.connect(master);exhaust.start();body.start();
 return {engineOsc:exhaust,engineOsc2:body,engineFilter:filter,engineGain:gain,engineGain2:bodyGain};
}
const SHIFTS=[0,10,20,32,46,65,90];
export function engineFrame(state,speed,throttle,boost,now){
 let gear=state.engineGear??0;
 if(gear<SHIFTS.length-1&&speed>SHIFTS[gear+1]+.7)gear++;
 else if(gear>0&&speed<SHIFTS[gear]-1.5)gear--;
 if(gear!==state.engineGear&&state.engineGear!==undefined)state.shiftUntil=now+.15;
 state.engineGear=gear;
 const top=SHIFTS[gear+1]??120,t=Math.max(0,Math.min(1,(speed-SHIFTS[gear])/(top-SHIFTS[gear]))),shifting=now<(state.shiftUntil||0);
 const rpm=speed<1?850+(throttle?550:0):1900+t*4000+(throttle?350:0);
 return {gear,rpm,frequency:rpm/30,volume:(throttle?.24:.085)+(speed>1?.035:0),bodyVolume:throttle?.16:.055,filter:throttle?850+t*1250:430+t*480,intake:throttle?.025+t*.018:.006,shift:shifting?.48:1,boost:boost?.035:0};
}
