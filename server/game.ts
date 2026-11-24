import { Chess } from 'chess.js';
import { Effect, Schedule } from 'effect';
import type { Game } from '../src/types.js';
import { annotateOpenings } from './openings.js';
import { parseClock } from '../src/clocks.js';

export function parseGame(pgn:unknown):Game {
  if(typeof pgn!=='string'||!pgn.trim()||pgn.length>200000)throw new Error('Provide a PGN smaller than 200 KB.');
  const chess=new Chess();chess.loadPgn(pgn);
  const headers=chess.getHeaders();
  if(headers.Variant && !['standard','chess'].includes(headers.Variant.toLowerCase()))throw new Error('Only standard chess is supported.');
  const history=chess.history({verbose:true});
  if(!history.length||history.length>800)throw new Error('Use a game with 1–800 half-moves.');
  const comments=new Map(chess.getComments().map(({fen,comment})=>[fen,comment]));
  return annotateOpenings({pgn:chess.pgn(),headers,positions:[history[0].before,...history.map(m=>m.after)],moves:history.map(m=>({san:m.san,uci:m.from+m.to+(m.promotion||''),clockSeconds:parseClock(comments.get(m.after)||'')}))});
}
export function linkId(link:string) {
  const url=new URL(link);
  const match=/^\/(?:analysis\/)?game\/(live|daily)\/(\d+)(?:\/|$)/.exec(url.pathname);
  if(url.protocol!=='https:'||!['chess.com','www.chess.com'].includes(url.hostname)||!match)throw new Error('Use a Chess.com completed game/live or game/daily link.');
  return {kind:match[1],id:match[2]};
}
const json=(url:string)=>Effect.tryPromise({try:async signal=>{
  const response=await fetch(url,{signal,headers:{'User-Agent':'LocalChessReview/0.1 (personal analysis)'},redirect:'error'});
  if(!response.ok)throw new Error(`Chess.com returned HTTP ${response.status}`);
  return response.json();
},catch:e=>e as Error}).pipe(Effect.timeout('12 seconds'),Effect.retry(Schedule.recurs(1)));

export const importLink=(link:string,player:string)=>Effect.gen(function*(){
  const {kind,id}=yield* Effect.try(()=>linkId(link));
  let username=player.trim();
  const callback=yield* json(`https://www.chess.com/callback/${kind}/game/${id}`).pipe(Effect.orElseSucceed(()=>null));
  const game=callback?.game||callback;
  if(game?.isFinished===false)throw new Error('Only completed games can be imported.');
  if(typeof game?.pgn==='string')return parseGame(game.pgn);
  if(!username && typeof game?.pgnHeaders?.White==='string')username=game.pgnHeaders.White;
  if(!username){
    const players=callback?.players||game?.players||{};
    for(const p of Object.values(players) as any[])if(typeof p?.username==='string'){username=p.username;break;}
  }
  if(!/^[a-zA-Z0-9_-]{2,50}$/.test(username))throw new Error('Direct import unavailable. Enter either player’s username and retry, or paste the game PGN.');
  const data=yield* json(`https://api.chess.com/pub/player/${username}/games/archives`);
  const archives=(data.archives as string[]).slice(-24).reverse();
  for(const archive of archives){
    const date=/\/games\/(\d{4})\/(\d{2})$/.exec(archive);if(!date)continue;
    const month=yield* json(`https://api.chess.com/pub/player/${username}/games/${date[1]}/${date[2]}`);
    for(const item of month.games||[]){
      let match=false;try{const key=linkId(item.url);match=key.id===id&&key.kind===kind;}catch{}
      if(match&&item.pgn)return parseGame(item.pgn);
    }
  }
  throw new Error('Game not found in the last 24 monthly archives. Newly completed games may not be published yet; use PGN instead.');
}).pipe(Effect.timeout('90 seconds'));
