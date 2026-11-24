import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { availableParallelism } from 'node:os';
import { Effect } from 'effect';
import { Chess } from 'chess.js';
import type { Evaluation } from '../src/types.js';
import { engineMove, standardMove, type SearchLimit } from './analysis-profile.js';

export function enginePath(): string {
  if (process.env.STOCKFISH_PATH) return resolve(process.env.STOCKFISH_PATH);
  const scan = (dir:string):string[] => existsSync(dir) ? readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(resolve(dir,e.name)):/^stockfish.*\.exe$/i.test(e.name)?[resolve(dir,e.name)]:[]) : [];
  const path=scan(resolve('engines'))[0];
  if(!path) throw new Error('Stockfish is missing. Run npm run setup:engine, or set STOCKFISH_PATH.');
  return path;
}

// One sequential UCI command at a time. Each Effect is interruptible.
export class UciEngine {
  private child:ChildProcessWithoutNullStreams;
  private listener?: (line:string)=>void;
  private fail?: (e:Error)=>void;
  private dead?:Error;
  private closed=false;
  name='Stockfish';
  network='unknown';
  private compatible=false;
  constructor(path:string) {
    this.child=spawn(path,[],{windowsHide:true});
    const lines=createInterface({input:this.child.stdout});
    lines.on('line',line=>this.listener?.(line));
    this.child.stderr.resume();
    this.child.stdin.on('error',e=>{this.dead=e;this.fail?.(e);});
    this.child.on('error',e=>{this.dead=e;this.fail?.(e);});
    this.child.on('exit',code=>{this.dead=new Error(`Stockfish exited (${code})`);this.fail?.(this.dead);lines.close();});
  }
  command(command:string, until:(line:string)=>boolean, onLine:(line:string)=>void=()=>{},timeoutMs=20000) {
    return Effect.async<void,Error>(resume=>{
      if(this.dead){resume(Effect.fail(this.dead));return;}
      let finished=false;
      const clear=()=>{this.listener=undefined;this.fail=undefined;};
      this.fail=e=>{if(!finished){finished=true;clear();resume(Effect.fail(e));}};
      this.listener=line=>{onLine(line);if(until(line)&&!finished){finished=true;clear();resume(Effect.void);}};
      this.child.stdin.write(command+'\n',error=>{if(error)this.fail?.(error);});
      return Effect.sync(()=>{if(!finished){clear();this.close();}});
    }).pipe(Effect.timeout(timeoutMs));
  }
  initialize(compatible=false) {
    this.compatible=compatible;
    return Effect.gen(this,function*(){
      yield* this.command('uci',line=>line==='uciok',line=>{if(line.startsWith('id name '))this.name=line.slice(8);if(line.startsWith('option name EvalFile type '))this.network=line.split(' default ')[1];});
      if(compatible && (this.name!=='Stockfish 19'||this.network!=='nn-1a298aa575a0.nnue'))return yield* Effect.fail(new Error('Compatibility mode requires official Stockfish 19 with its default network. Run npm run setup:engine and remove any incompatible STOCKFISH_PATH override.'));
      yield* this.command(`setoption name Threads value ${compatible?1:Math.min(4,Math.max(1,Math.floor(availableParallelism()/2)))}\nsetoption name Hash value ${compatible?16:128}\nsetoption name MultiPV value 1\nsetoption name Skill Level value 20\nsetoption name UCI_Chess960 value ${compatible}\nisready`,line=>line==='readyok');
    });
  }
  newGame(){return this.command('ucinewgame\nisready',line=>line==='readyok');}
  evaluate(initialFen:string, moves:string[], budget:number|SearchLimit) {
    return Effect.gen(this,function*(){
      const limit=typeof budget==='number'?{milliseconds:budget}:budget;
      const board=new Chess(initialFen),engineMoves:string[]=[];
      for(const move of moves){engineMoves.push(this.compatible?engineMove(board,move):move);board.move(move);}
      if(board.isCheckmate())return {cp:board.turn()==='w'?-100000:100000,mate:0,pv:[],depth:0,nodes:0,timeMs:0} satisfies Evaluation;
      if(this.compatible?(board.isStalemate()||board.isInsufficientMaterial()):board.isDraw())return {cp:0,mate:null,pv:[],depth:0,nodes:0,timeMs:0} satisfies Evaluation;
      let evaluation:Evaluation|undefined;
      const sign=board.turn()==='w'?1:-1;
      let nodes=0,timeMs=0;
      const go='nodes' in limit?`go nodes ${limit.nodes}`:`go movetime ${limit.milliseconds}`;
      yield* this.command(`position fen ${initialFen}${engineMoves.length?' moves '+engineMoves.join(' '):''}\n${go}`,line=>line.startsWith('bestmove '),line=>{
        nodes=Number(/\bnodes (\d+)/.exec(line)?.[1]||nodes);timeMs=Number(/\btime (\d+)/.exec(line)?.[1]||timeMs);
        if(!line.startsWith('info ') || /\b(?:upperbound|lowerbound)\b/.test(line))return;
        const score=/\bscore (cp|mate) (-?\d+)/.exec(line);
        if(!score)return;
        const value=Number(score[2]);
        evaluation={cp:score[1]==='cp'?sign*value:sign*(value>=0?100000:-100000),mate:score[1]==='mate'?sign*value:null,depth:Number(/\bdepth (\d+)/.exec(line)?.[1]||0),pv:line.split(' pv ')[1]?.trim().split(/\s+/)||[]};
      },'nodes' in limit?120000:20000);
      if(!evaluation)return yield* Effect.fail(new Error('Stockfish returned no evaluation.'));
      if(this.compatible){const pvBoard=new Chess(board.fen());evaluation.pv=evaluation.pv.map(uci=>{const normal=standardMove(pvBoard,uci);pvBoard.move(normal);return normal;});}
      return {...evaluation,nodes,timeMs};
    });
  }
  close(){if(!this.closed){this.closed=true;this.child.stdin.on('error',()=>{});this.child.kill();}}
}

export const acquireEngine=Effect.acquireRelease(
  Effect.try({try:()=>new UciEngine(enginePath()),catch:e=>e as Error}),
  engine=>Effect.sync(()=>engine.close())
);
