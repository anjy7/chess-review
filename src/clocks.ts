import type { Game } from './types';

/** PGN %clk is the mover's remaining time after that move, not elapsed time. */
export function parseClock(comment:string):number|undefined {
 const match=/\[%clk\s+(\d+):([0-5]\d):([0-5]\d(?:\.\d+)?)\s*\]/i.exec(comment);
 if(!match)return;
 const seconds=Number(match[1])*3600+Number(match[2])*60+Number(match[3]);
 return Number.isFinite(seconds)?seconds:undefined;
}
export function formatClock(seconds:number|undefined):string {
 if(seconds===undefined||!Number.isFinite(seconds)||seconds<0)return '—:—';
 const total=Math.floor(seconds),hours=Math.floor(total/3600),minutes=Math.floor(total/60)%60,secs=String(total%60).padStart(2,'0');
 return hours?`${hours}:${String(minutes).padStart(2,'0')}:${secs}`:`${minutes}:${secs}`;
}
export function clockAt(game:Game|undefined,ply:number,white:boolean):number|undefined {
 if(!game)return;
 for(let i=Math.min(ply,game.moves.length)-1;i>=0;i--){
  if((game.positions[i].split(' ')[1]==='w')===white)return game.moves[i].clockSeconds;
 }
 // Only infer the initial allotment for ordinary starts and simple base+increment controls.
 const initial=game.positions[0].split(' '),control=/^(\d+)(?:\+\d+)?$/.exec(game.headers.TimeControl||'');
 if(initial[1]==='w'&&initial[5]==='1'&&!game.headers.SetUp&&control)return Number(control[1]);
}
