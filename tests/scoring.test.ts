// SPDX-License-Identifier: AGPL-3.0-or-later
// Includes regression scenarios adapted from Lichess; see SCORING_SOURCES.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { winPercent, moveAccuracy, judgement, judgementFromDelta, gameAccuracy, volatilityWeights, scoreMove, rescoreReview, SCORING_VERSION } from '../src/scoring.js';
import { parseGame } from '../server/game.js';
import type { Evaluation, Job } from '../src/types.js';
const ev=(cp:number,mate:number|null=null):Evaluation=>({cp,mate,pv:[],depth:10});
const close=(actual:number|undefined,expected:number,tolerance=1e-9)=>assert.ok(actual!==undefined&&Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test('win percent is symmetric and capped at +/-1000 cp',()=>{
 close(winPercent(0),50);close(winPercent(1000),97.544743634143223,1e-10);
 close(winPercent(100000),winPercent(1000));close(winPercent(-100000),winPercent(-1000));close(winPercent(-123),100-winPercent(123));
});
test('move accuracy includes current upstream +1 bonus and bounds',()=>{
 close(moveAccuracy(50,50),100);close(moveAccuracy(40,60),100);
 close(moveAccuracy(60,50),64.579828453720675,1e-8);
 close(moveAccuracy(100,0),0);
});
test('advice boundaries are 5/10/15 percentage points (delta uses -1..1)',()=>{
 assert.equal(judgementFromDelta(.1-1e-12),undefined);assert.equal(judgementFromDelta(.1),'Inaccuracy');
 assert.equal(judgementFromDelta(.2-1e-12),'Inaccuracy');assert.equal(judgementFromDelta(.2),'Mistake');
 assert.equal(judgementFromDelta(.3-1e-12),'Mistake');assert.equal(judgementFromDelta(.3),'Blunder');
});
test('equal cp loss has different severity in equal and winning positions',()=>{
 assert.equal(judgement(ev(100),ev(-200),true),'Blunder');assert.equal(judgement(ev(1000),ev(700),true),undefined);
 assert.equal(judgement(ev(-100),ev(200),false),'Blunder');
 // Advice uses uncapped chances, unlike accuracy.
 assert.equal(judgement(ev(3000),ev(700),true),'Inaccuracy');
});
test('mate created / missed mate use upstream exceptions, both colors, and terminal M0',()=>{
 for(const sign of [1,-1]){const white=sign===1;
 for(const [cp,label] of [[-1000,'Inaccuracy'],[-999,'Mistake'],[-701,'Mistake'],[-700,'Blunder']] as const)
 assert.equal(judgement(ev(sign*cp),ev(-sign*100000,-sign*3),white),label);
 for(const [cp,label] of [[1000,'Inaccuracy'],[999,'Mistake'],[701,'Mistake'],[700,'Blunder']] as const)
 assert.equal(judgement(ev(sign*100000,sign*3),ev(sign*cp),white),label);
 assert.equal(judgement(ev(0),ev(-sign*100000,0),white),'Blunder');
 assert.equal(judgement(ev(0),ev(sign*100000,0),white),undefined);
 assert.equal(judgement(ev(sign*100000,sign*3),ev(sign*100000,sign*8),white),undefined);
 assert.equal(judgement(ev(sign*100000,sign*3),ev(-sign*100000,-sign*3),white),'Blunder');
 }
});
test('engine best move does not override bad evaluation scoring',()=>{
 const row=scoreMove(ev(100),ev(-200),true,true);assert.equal(row.label,'Blunder');assert.ok(row.accuracy<50);
 assert.equal(scoreMove(ev(0),ev(0),true,true).label,'Best');assert.equal(scoreMove(ev(0),ev(0),true,false).label,'Good');
});
test('upstream game accuracy fixtures (starting cp 15)',()=>{
 const fixtures:[number[],number,number,number][]=[
 [[15,15],100,100,1],[[-900,-900],10,100,5],[[15,900],100,10,5],[[-900,0],10,10,5],
 [Array(20).fill(15),100,100,1],[[...Array(20).fill(15),-900],50,100,5],[[...Array(21).fill(15),900],100,50,5],
 [Array(5).fill([-50,15]).flat(),76,76,8],[Array(50).fill([-50,15]).flat(),76,76,8],
 [Array(50).fill([-135,15]).flat(),54,54,8],[Array(50).fill([-435,15]).flat(),20,20,8]];
 for(const [cps,w,b,tolerance] of fixtures){const score=gameAccuracy([15,...cps]);close(score.white,w,tolerance);close(score.black,b,tolerance);}
});
test('black-to-move FEN aligns weights and scores with mover',()=>{
 const a=gameAccuracy([15,900,900],false);close(a.black,10,5);close(a.white,100,1);
 const cps=[15,-200,-20,100,500,400,-30];const normal=gameAccuracy(cps,true),inverted=gameAccuracy(cps.map(v=>-v),false);
 close(normal.white,inverted.black!);close(normal.black,inverted.white!);
});
test('empty/one-ply game has no two-player aggregate',()=>{for(const cps of [[],[15],[15,0]])assert.deepEqual(gameAccuracy(cps),{});});
test('volatility uses population stddev, prefix padding, weight clamps, and 2..8 windows',()=>{
 assert.deepEqual(volatilityWeights([0,0,0]),[.5,.5]);close(volatilityWeights([0,100])[0],(winPercent(100)-50)/2);
 assert.equal(volatilityWeights([-1000,1000])[0],12);
 for(const length of [2,3,20,31,41,80,81,200]){
 const weights=volatilityWeights(Array.from({length},(_,i)=>i%2?100:-100));assert.equal(weights.length,length-1);
 const size=Math.max(2,Math.min(8,Math.floor((length-1)/10)));for(let i=0;i<size-1;i++)close(weights[i],weights[0]);
 }
});
test('harmonic mean floors individual accuracy at 1, not zero',()=>{
 const result=gameAccuracy([1000,-1000,-1000]);close(result.white,.5);close(result.black,100);
});
test('saved legacy review is rescored without mutating original',()=>{
 const game=parseGame('1. e4 e5 *');
 const job:Job={id:'old',status:'done',progress:1,summary:{white:12,black:34},results:[
 {ply:1,before:ev(0),after:ev(0),label:'Excellent',loss:0,best:'e4',line:[]},
 {ply:2,before:ev(0),after:ev(0),label:'Excellent',loss:0,best:'e5',line:[]}]};
 const next=rescoreReview(game,job);assert.equal(next.scoringVersion,SCORING_VERSION);close(next.summary.white,100);close(next.results[0].accuracy,100);assert.equal(job.summary.white,12);assert.equal(job.results[0].label,'Excellent');
 assert.deepEqual(rescoreReview(game,{...job,status:'cancelled'}).summary,{});
});
