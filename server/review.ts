import { Effect } from 'effect';
import { Chess } from 'chess.js';
import { acquireEngine } from './engine.js';
import { analysisOptions, fishnetChunks, FISHNET_PROFILE } from './analysis-profile.js';
import { scoreMove, gameAccuracy } from '../src/scoring.js';
import type { Evaluation, Game, Job, Row } from '../src/types.js';

function rowFor(game:Game,i:number,before:Evaluation,after:Evaluation):Row {
  const move=game.moves[i],board=new Chess(game.positions[i]),white=board.turn()==='w',line:string[]=[];
  for(const uci of before.pv.slice(0,12)){try{line.push(board.move(uci).san);}catch{break;}}
  return {ply:i+1,before,after,...scoreMove(before,after,white,before.pv[0]===move.uci),best:line[0]||'—',line};
}
export function review(game:Game,options:ReturnType<typeof analysisOptions>,job:Job){
  return Effect.scoped(Effect.gen(function*(){
    const initial=game.positions[0],moves=game.moves.map(m=>m.uci);
    job.analysis={mode:options.mode,...options.limit,
      ...(options.mode==='lichess'?{profile:FISHNET_PROFILE.id,nominalNodes:FISHNET_PROFILE.nominalNodes}:{}),completedPositions:0,totalPositions:moves.length+1};
    if(options.mode==='lichess'){
      const evaluations:Evaluation[]=Array(moves.length+1);
      const chunks=fishnetChunks(moves.length),workers=Math.min(options.workers,chunks.length);
      job.analysis.workers=options.workers;job.analysis.effectiveWorkers=workers;
      let next=0;
      // Each scoped engine owns its cache and processes one complete group at a time.
      // Effect interrupts all siblings and releases their engines on failure/cancellation.
      yield* Effect.forEach(Array.from({length:workers}),()=>Effect.scoped(Effect.gen(function*(){
        const engine=yield* acquireEngine;yield* engine.initialize(true);
        job.analysis!.engine=engine.name;job.analysis!.network=engine.network;
        while(next<chunks.length){
          const chunk=chunks[next++];yield* engine.newGame();
          for(const position of chunk){
            const evaluated=yield* engine.evaluate(initial,moves.slice(0,position.index),options.limit);
            if(!position.warmup){evaluations[position.index]=evaluated;job.analysis!.completedPositions!++;job.progress=job.analysis!.completedPositions!/(moves.length+1);}
          }
        }
      })),{concurrency:'unbounded',discard:true});
      // Return chronological rows only once backwards analysis is complete; no sparse API arrays.
      job.results=game.moves.map((_,i)=>rowFor(game,i,evaluations[i],evaluations[i+1]));
    }else{
      const engine=yield* acquireEngine;yield* engine.initialize(false);job.analysis.engine=engine.name;job.analysis.network=engine.network;
      let before=yield* engine.evaluate(initial,[],options.limit);job.analysis.completedPositions=1;
      for(let i=0;i<moves.length;i++){
        const after=yield* engine.evaluate(initial,moves.slice(0,i+1),options.limit);
        job.results.push(rowFor(game,i,before,after));job.analysis.completedPositions=i+2;
        job.progress=(i+1)/moves.length;before=after;
      }
    }
    job.summary=gameAccuracy([job.results[0].before.cp,...job.results.map(r=>r.after.cp)],initial.split(' ')[1]==='w');
  }));
}
