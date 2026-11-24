import {useEffect,useRef,useState} from 'react';
import type {RecentGame} from './types';
export function RecentGames({username,busy,onImport}:{username:string;busy:boolean;onImport:(pgn:string)=>void}){
 const [games,setGames]=useState<RecentGame[]>([]),[selected,setSelected]=useState(''),[loading,setLoading]=useState(false),[status,setStatus]=useState('');
 const request=useRef<AbortController|undefined>(undefined);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function fetchGames(){
  request.current?.abort();const controller=new AbortController();request.current=controller;
  setLoading(true);setGames([]);setSelected('');setStatus('Loading recent games…');
  try{const response=await fetch('/api/recent-games',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username}),signal:controller.signal});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load recent games.');
   if(controller.signal.aborted)return;
   setGames(data.games);setSelected(data.games[0]?.url||'');setStatus(data.games.length?`${data.games.length} recent completed game${data.games.length===1?'':'s'} found.`:'No completed standard games found in the recent archives.');
  }catch(error){if(!controller.signal.aborted)setStatus(String(error));}
  finally{if(!controller.signal.aborted)setLoading(false);}
 }
 const choice=games.find(game=>game.url===selected);
 const option=(game:RecentGame)=>{const white=game.white.toLowerCase()===username.trim().toLowerCase(),opponent=white?game.black:game.white;
  const outcome=game.result==='1/2-1/2'?'Draw':game.result===(white?'1-0':'0-1')?'Win':'Loss';
  return `${new Date(game.endTime*1000).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})} · vs ${opponent} · ${outcome} · ${game.timeClass} · #${game.id}`;
 };
 return <section className="recent-games" aria-label="Recent Chess.com games">
  <button type="button" disabled={busy||loading||!username.trim()} onClick={fetchGames}>{loading?'Loading…':'Find recent games'}</button>
  {!!games.length&&<><label>Recent games<select aria-label="Recent games" value={selected} disabled={busy||loading} onChange={e=>setSelected(e.target.value)}>{games.map(game=><option key={game.url} value={game.url}>{option(game)}</option>)}</select></label><button type="button" className="primary" disabled={busy||loading||!choice} onClick={()=>choice&&onImport(choice.pgn)}>Import selected game</button></>}
  {status&&<p role="status">{status}</p>}
 </section>;
}
