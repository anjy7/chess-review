import {useState} from 'react';
import type {RecentGame} from './types';
import type {RecentGamesState} from './useRecentGames';
export function RecentGames({username,busy,onImport,state}:{username:string;busy:boolean;onImport:(pgn:string)=>void;state:RecentGamesState}){
 const [selected,setSelected]=useState('');
 const {games,loading,status,refresh}=state;
 const choice=games.find(game=>game.url===selected)||games[0];
 const option=(game:RecentGame)=>{const white=game.white.toLowerCase()===username.trim().toLowerCase(),opponent=white?game.black:game.white;
  const outcome=game.result==='1/2-1/2'?'Draw':game.result===(white?'1-0':'0-1')?'Win':'Loss';
  return `${new Date(game.endTime*1000).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})} · vs ${opponent} · ${outcome} · ${game.timeClass} · #${game.id}`;
 };
 return <section className="recent-games" aria-label="Recent Chess.com games">
  <button type="button" disabled={busy||loading||!username.trim()} onClick={refresh}>{loading?'Loading…':'Find recent games'}</button>
  {!!games.length&&<><label>Recent games<select aria-label="Recent games" value={choice?.url||''} disabled={busy||loading} onChange={e=>setSelected(e.target.value)}>{games.map(game=><option key={game.url} value={game.url}>{option(game)}</option>)}</select></label><button type="button" className="primary" disabled={busy||loading||!choice} onClick={()=>choice&&onImport(choice.pgn)}>Import selected game</button></>}
  {status&&<p role="status">{status}</p>}
 </section>;
}
