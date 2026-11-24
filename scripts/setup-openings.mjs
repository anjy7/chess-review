import {Chess} from 'chess.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision='48a8c0e733facfdc9a3723fe882e51ec28014074';
const directory=new URL('../data/openings/',import.meta.url);await mkdir(directory,{recursive:true});
const named={},edges=new Set(),sources=[];let count=0;
const key=fen=>fen.split(' ').slice(0,4).join(' ');
for(const letter of 'abcde'){
 const url=`https://raw.githubusercontent.com/lichess-org/chess-openings/${revision}/${letter}.tsv`;
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`HTTP ${response.status}: ${url}`);
 const text=await response.text();if(!text.startsWith('eco\tname\tpgn'))throw Error('Unexpected opening data');
 await writeFile(new URL(`${letter}.tsv`,directory),text);
 sources.push({url,sha256:createHash('sha256').update(text).digest('hex')});
 for(const line of text.trim().split(/\r?\n/).slice(1)){
  const [eco,name,pgn]=line.split('\t');const board=new Chess();board.loadPgn(pgn);
  for(const move of board.history({verbose:true}))edges.add(key(move.before)+'|'+move.from+move.to+(move.promotion||''));
  named[key(board.fen())]={eco,name};count++;
 }
}
await writeFile(new URL('index.json',directory),JSON.stringify({revision,count,named,edges:[...edges]}));
await writeFile(new URL('sources.json',directory),JSON.stringify({revision,count,sources},null,2)+'\n');
console.log(`Indexed ${count} named lines, ${Object.keys(named).length} positions, ${edges.size} book transitions.`);
