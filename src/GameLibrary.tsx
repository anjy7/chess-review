import {gameDetails} from './game-details';
import type {Game,Job,RecentGame} from './types';
import type {RecentGamesState} from './useRecentGames';
export function GameLibrary({username,setUsername,recent,saved,busy,active,onRecent,onSaved}:{username:string;setUsername:(name:string)=>void;recent:RecentGamesState;saved:{game:Game;job:Job}[];busy:boolean;active?:string;onRecent:(game:RecentGame)=>void;onSaved:(index:number)=>void}){
 return <aside className="game-library" aria-label="Game library">
  <section className="library-card"><h2>Recent games <span>{recent.games.length}/5</span></h2>
   <form className="library-search" onSubmit={e=>{e.preventDefault();if(!busy&&!recent.loading&&username.trim())void recent.refresh();}}>
    <input aria-label="Recent games username" placeholder="Chess.com username" value={username} disabled={busy} onChange={e=>setUsername(e.target.value)}/>
    <button aria-label="Refresh recent games" disabled={busy||recent.loading||!username.trim()}>{recent.loading?'…':'↻'}</button>
   </form>
   <ul className="library-scroll" aria-label="Recent game list">{recent.games.map(game=><li key={game.url}><button disabled={busy} aria-current={active===game.url?'true':undefined} onClick={()=>onRecent(game)}><strong>{game.white} <span>vs</span> {game.black}</strong><small>{game.result} · {game.timeClass} · {new Date(game.endTime*1000).toLocaleDateString()}</small><small>#{game.id}</small></button></li>)}</ul>
   {!recent.games.length&&<p className="library-empty" role="status">{recent.status||'Enter a username to find recent games.'}</p>}
  </section>
  <section className="library-card"><h2>Saved analyses <span>{saved.length}</span></h2>
   <ul className="library-scroll" aria-label="Saved analysis list">{saved.map(({game,job},i)=>{const details=gameDetails(game.headers);return <li key={job.id+':'+i}><button disabled={busy} aria-current={active==='saved:'+job.id?'true':undefined} onClick={()=>onSaved(i)}><strong>{game.headers.White||'White'} <span>vs</span> {game.headers.Black||'Black'}</strong><small>{game.headers.Result||'—'} · {details.id?'Game #'+details.id:'Game ID unavailable'}</small><small className="saved-game-time" title="Original game start time">{details.timeLabel}</small><small>Accuracy {job.summary.white?.toFixed(1)??'—'} / {job.summary.black?.toFixed(1)??'—'}</small></button></li>;})}</ul>
   {!saved.length&&<p className="library-empty">Saved reviews appear here.</p>}
  </section>
 </aside>;
}
