import {Effect} from 'effect';
import {json,linkId} from './game.js';
import type {RecentGame} from '../src/types.js';

export function recentGames(player:unknown,getJson:typeof json=json){
 return Effect.gen(function*(){
  const username=yield* Effect.try(()=>{if(typeof player!=='string'||!/^[a-zA-Z0-9_-]{2,50}$/.test(player.trim()))throw Error('Enter a valid Chess.com username.');return player.trim().toLowerCase();});
  const data=yield* getJson(`https://api.chess.com/pub/player/${username}/games/archives`);
  if(!Array.isArray(data?.archives))throw Error('Chess.com returned an invalid archive list.');
  const months=[...new Set<string>(data.archives.flatMap((url:unknown)=>{const match=typeof url==='string'?/\/games\/(\d{4}\/(?:0[1-9]|1[0-2]))$/.exec(url):null;return match?[match[1]]:[];}))].sort().reverse().slice(0,24);
  const games:RecentGame[]=[],seen=new Set<string>();
  for(const month of months){
   const archive=yield* getJson(`https://api.chess.com/pub/player/${username}/games/${month}`);
   if(!Array.isArray(archive?.games))throw Error('Chess.com returned an invalid game archive.');
   for(const item of archive.games){
    if(!item||item.rules&&item.rules!=='chess'||typeof item.pgn!=='string'||item.pgn.length>200000||!Number.isFinite(item.end_time)||item.end_time<=0)continue;
    const result=/\[Result\s+"(1-0|0-1|1\/2-1\/2)"\]/.exec(item.pgn)?.[1];
    if(!result||typeof item.white?.username!=='string'||typeof item.black?.username!=='string'||![item.white.username,item.black.username].some(name=>name.toLowerCase()===username))continue;
    try{const key=linkId(item.url),identity=`${key.kind}:${key.id}`;if(seen.has(identity))continue;seen.add(identity);
     games.push({id:key.id,url:`https://www.chess.com/game/${key.kind}/${key.id}`,pgn:item.pgn,white:item.white.username,black:item.black.username,result,endTime:item.end_time,timeClass:typeof item.time_class==='string'?item.time_class:''});
    }catch{/* Ignore unrelated or malformed game links. */}
   }
   games.sort((a,b)=>b.endTime-a.endTime);
   if(games.length>=5)break;
  }
  return games.slice(0,5);
 }).pipe(Effect.timeout('90 seconds'));
}
