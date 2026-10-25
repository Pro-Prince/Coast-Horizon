// Shared dimensions and speed limits for rendering, physics and multiplayer.
export const MPH_PER_MPS=2.2369362920544;
export const NORMAL_SPEED_MPH=120;
export const MAX_SPEED=NORMAL_SPEED_MPH/MPH_PER_MPS;
export const BOOST_SPEED=MAX_SPEED*2;
export const ROAD_WIDTH=12.5;
export const ROAD_HALF=ROAD_WIDTH/2;
export const COAST_LIMIT=-(ROAD_HALF+2);
export const INLAND_LIMIT=ROAD_HALF+1;

export const CIRCUIT_LENGTH=10000;
export const courseZ=z=>z*CIRCUIT_LENGTH/12000;
export const BRIDGE={start:courseZ(450),end:courseZ(450)+100,ramp:40,height:4,towerHeight:25};
export const BRIDGES=[BRIDGE,{start:courseZ(1570),end:courseZ(1710),ramp:65,height:12,towerHeight:29,color:'#e4d9b7'},{start:courseZ(2440),end:courseZ(2580),ramp:65,height:12,towerHeight:32,color:'#6f9398'}];
export const TRAFFIC_COUNT=72;
export const CRASH_SITE={z:850,radius:28};
