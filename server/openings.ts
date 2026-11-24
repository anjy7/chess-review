import {readFileSync} from 'node:fs';
import type {Game,Opening} from '../src/types.js';
const database=JSON.parse(readFileSync(new URL('../data/openings/index.json',import.meta.url),'utf8')) as {named:Record<string,Opening>;edges:string[]};
const edges=new Set(database.edges);
const key=(fen:string)=>fen.split(' ').slice(0,4).join(' ');
export function annotateOpenings(game:Game):Game {
 // Full-game standard start only; do not label arbitrary setup puzzles as opening play.
 if(game.positions[0]!=='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')return game;
 let opening:Opening|undefined;
 const moves=game.moves.map((move,i)=>{
  opening=database.named[key(game.positions[i+1])]||opening;
  return {...move,book:edges.has(key(game.positions[i])+'|'+move.uci),...(opening?{opening}: {})};
 });
 return {...game,moves,opening};
}
