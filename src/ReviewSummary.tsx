import type {Game, Job} from './types';
import { MoveIcon } from './MoveFeedback';
import { moveLabel } from './move-label';
import { ChessPiece } from './ChessPiece';
export function ReviewSummary({game,job,start}:{game:Game;job:Job;start:()=>void}){
 const labels=['Book','Best','Good','Inaccuracy','Mistake','Blunder'];
 const counts=(label:string,white:boolean)=>job.results.filter((row,i)=>moveLabel(game,i,row.label)===label&&((game.positions[i].split(' ')[1]==='w')===white)).length;
 return <section className="review-summary"><div className="summary-players"><span>Players</span>{['White','Black'].map(side=><div key={side}><strong>{game.headers[side]||side}</strong><div className="profile-pawn"><ChessPiece type="p" color="w"/></div></div>)}</div><div className="scores"><span>Accuracy</span>{(['white','black'] as const).map(side=><div key={side}><span className="sr-only">{side==='white'?'White':'Black'} accuracy</span><strong>{job.summary[side]?.toFixed(1)??'—'}</strong></div>)}</div><div className="classification-table">{labels.map(label=><div className={`classification ${label.toLowerCase()}`} key={label}><span>{label}</span><b>{counts(label,true)}</b><span className="summary-icon"><MoveIcon label={label}/></span><b>{counts(label,false)}</b></div>)}</div><button className="primary start-review" onClick={start}>Start Review</button></section>;
}
