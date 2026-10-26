export function playerName(value,fallback='Driver'){
 const clean=typeof value==='string'?value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').replace(/\s+/g,' ').trim():'';
 return Array.from(clean||fallback).slice(0,20).join('');
}
export const gridPose=role=>({x:role==='guest'?-2.4:2.4,z:role==='guest'?-3.5:0,h:0,v:0});
