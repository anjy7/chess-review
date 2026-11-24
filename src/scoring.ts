// SPDX-License-Identifier: AGPL-3.0-or-later
// TypeScript adaptation of Lichess AccuracyPercent / Advice and scalachess WinPercent.
// Pinned sources and licensing: SCORING_SOURCES.md.
import type { Evaluation, Game, Job, Row } from './types';
export const SCORING_VERSION = 'lichess-eb024cba-v1';
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
// Advice uses uncapped winning chances; accuracy uses Cp.ceiled (+/-1000).
export const winningChances=(cp:number)=>2/(1+Math.exp(-0.00368208*cp))-1;
export const winPercent=(cp:number)=>50+50*winningChances(clamp(cp,-1000,1000));
export function moveAccuracy(before:number,after:number):number {
  if(after>=before)return 100;
  return clamp(103.1668100711649*Math.exp(-0.04354415386753951*(before-after))-3.166924740191411+1,0,100);
}
export function judgementFromDelta(delta:number):string|undefined {
  return delta>=0.3?'Blunder':delta>=0.2?'Mistake':delta>=0.1?'Inaccuracy':undefined;
}
export function judgement(before:Evaluation,after:Evaluation,white:boolean):string|undefined {
  const sign=white?1:-1,prev=sign*before.cp,next=sign*after.cp;
  if(before.mate===null&&after.mate===null)
    return judgementFromDelta((winningChances(before.cp)-winningChances(after.cp))*sign);
  // cp's sign also disambiguates terminal M0 (White or Black delivered mate).
  if(before.mate===null&&after.mate!==null&&next<0)
    return prev < -999?'Inaccuracy':prev < -700?'Mistake':'Blunder';
  if(before.mate!==null&&prev>0&&(after.mate===null||next<0))
    return next>999?'Inaccuracy':next>700?'Mistake':'Blunder';
  return undefined;
}
export function scoreMove(before:Evaluation,after:Evaluation,white:boolean,isBest:boolean) {
  const sign=white?1:-1,prev=winPercent(sign*before.cp),next=winPercent(sign*after.cp);
  return {accuracy:moveAccuracy(prev,next),winLoss:Math.max(0,prev-next),
    loss:Math.max(0,sign*(before.cp-after.cp)),
    // Best/Good are UI conveniences, not additional Lichess judgements.
    label:judgement(before,after,white)||(isBest?'Best':'Good')};
}
export function volatilityWeights(cps:number[]):number[] {
  const size=clamp(Math.floor((cps.length-1)/10),2,8),wins=cps.map(winPercent);
  if(wins.length<2)return [];
  const first=wins.slice(0,size),windows:number[][]=[];
  for(let i=0;i<Math.min(size,wins.length)-2;i++)windows.push(first);
  for(let i=0;i+size<=wins.length;i++)windows.push(wins.slice(i,i+size));
  return windows.map(window=>{const mean=window.reduce((a,b)=>a+b,0)/window.length;
    return clamp(Math.sqrt(window.reduce((a,b)=>a+(b-mean)**2,0)/window.length),0.5,12);});
}
export function gameAccuracy(cps:number[],startsWhite=true):Job['summary'] {
  if(cps.length<3)return {}; // Lichess requires observations for both players.
  const weights=volatilityWeights(cps),values={white:[] as [number,number][],black:[] as [number,number][]};
  for(let i=0;i<cps.length-1;i++){
    const white=(i%2===0)===startsWhite,sign=white?1:-1;
    values[white?'white':'black'].push([moveAccuracy(winPercent(sign*cps[i]),winPercent(sign*cps[i+1])),weights[i]]);
  }
  const summary:Job['summary']={};
  for(const key of ['white','black'] as const){const pairs=values[key];if(!pairs.length)return {};
    const weighted=pairs.reduce((a,[v,w])=>a+v*w,0)/pairs.reduce((a,[,w])=>a+w,0);
    const harmonic=pairs.length/pairs.reduce((a,[v])=>a+1/Math.max(1,v),0);
    summary[key]=(weighted+harmonic)/2;
  }
  return summary;
}
// Also used to migrate saved reviews; never present old heuristic scores as Lichess scores.
export function rescoreReview(game:Game,job:Job):Job {
  const startsWhite=game.positions[0].split(' ')[1]==='w';
  const results:Row[]=job.results.map((row,i)=>({...row,...scoreMove(row.before,row.after,(i%2===0)===startsWhite,row.before.pv[0]===game.moves[i]?.uci)}));
  return {...job,scoringVersion:SCORING_VERSION,results,summary:job.status==='done'&&results.length?
    gameAccuracy([results[0].before.cp,...results.map(r=>r.after.cp)],startsWhite):{}};
}
