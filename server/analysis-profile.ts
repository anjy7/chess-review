// SPDX-License-Identifier: AGPL-3.0-or-later
// Scheduling adapted from fishnet (GPL-3.0-or-later); see ANALYSIS_PROFILE.md.
import { Chess } from 'chess.js';
import {DEFAULT_WORKERS,MAX_WORKERS,isWorkerCount} from '../src/analysis-settings.js';
export const FISHNET_PROFILE={id:'fishnet-17d4d063-manual-v1',nominalNodes:1_000_000,nodes:Math.floor(1_000_000*6/7),threads:1,hashMb:16,multiPv:1,skill:20,chess960:true,
  fishnetRevision:'17d4d06359af8f6c25e432deca7f6cfe26d90177',lilaRevision:'eb024cbad43714392ecce64e8d716c63cd273d00',
  expectedEngineRevision:'edb0d9db6731067ec50ce619ff372b463bc4dd5d'} as const;
export type SearchLimit={milliseconds:number}|{nodes:number};
export function analysisOptions(body:{mode?:unknown;seconds?:unknown;workers?:unknown}) {
  if(body.mode!==undefined&&body.mode!=='timed'&&body.mode!=='lichess')throw Error('Unknown analysis mode.');
  if(body.mode==='lichess'){
    const workers=body.workers===undefined?DEFAULT_WORKERS:body.workers;
    if(!isWorkerCount(workers))throw Error(`Choose 1–${MAX_WORKERS} analysis workers.`);
    return {mode:'lichess' as const,limit:{nodes:FISHNET_PROFILE.nodes},workers};
  }
  const seconds=Number(body.seconds??0.3);
  if(!Number.isFinite(seconds)||seconds<0.1||seconds>3)throw Error('Choose 0.1–3 seconds per position.');
  return {mode:'timed' as const,limit:{milliseconds:seconds*1000}};
}
// No server-cache skips. Each group holds five real positions plus a warm-up.
export function fishnetChunks(plies:number):{index:number;warmup:boolean}[][] {
  const indices=Array.from({length:plies+1},(_,i)=>plies-i),chunks:{index:number;warmup:boolean}[][]=[];
  for(let offset=0;offset<indices.length;offset+=5){const real=indices.slice(offset,offset+5);
    chunks.push([{index:indices[Math.max(0,offset-1)],warmup:true},...real.map(index=>({index,warmup:false}))]);}
  return chunks;
}
export function engineMove(board:Chess,uci:string):string {
  const move=board.move(uci);board.undo();
  if(move.flags.includes('k'))return move.from+'h'+move.from[1];
  if(move.flags.includes('q'))return move.from+'a'+move.from[1];
  return uci;
}
export function standardMove(board:Chess,uci:string):string {
  if(uci.length===4&&board.get(uci.slice(0,2) as any)?.type==='k'){
    const to=board.get(uci.slice(2,4) as any);
    if(to?.type==='r'&&to.color===board.turn())return uci.slice(0,2)+(uci[2]==='h'?'g':'c')+uci[3];
  }
  return uci;
}
