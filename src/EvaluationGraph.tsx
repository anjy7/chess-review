import { useLayoutEffect, useRef, useState } from 'react';
import type { Game, Job } from './types';
import { winPercent } from './scoring';
import { moveLabel } from './move-label';
import { moveColors } from './MoveFeedback';

export function EvaluationGraph({game,job,ply,summary,onSelect}:{game?:Game;job?:Job;ply:number;summary:boolean;onSelect:(ply:number)=>void}) {
 const ref=useRef<SVGSVGElement>(null),[size,setSize]=useState({width:600,height:100});
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const observer=new ResizeObserver(([entry])=>{const {width,height}=entry.contentRect;if(width&&height)setSize({width,height});});observer.observe(el);return()=>observer.disconnect();},[]);
 const {width,height}=size,pad=5,total=game?.moves.length||1;
 const x=(n:number)=>pad+n/total*(width-pad*2),y=(cp:number)=>pad+(1-winPercent(cp)/100)*(height-pad*2);
 const results=job?.results||[],initial=results[0]?.before;
 const points=results.map((r,i)=>`${x(i+1)},${y(r.after.cp)}`).join(' ');
 const path=initial?`M${x(0)},${y(initial.cp)} L${points.replaceAll(' ', ' L')}`:'';
 return <svg ref={ref} id="graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="White evaluation over game" tabIndex={0}
 onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();onSelect(e.key==='Home'?0:e.key==='End'?total:Math.max(0,Math.min(total,ply+(e.key==='ArrowRight'?1:-1))));e.stopPropagation();}}}
 onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();onSelect(Math.max(0,Math.min(total,Math.round((e.clientX-rect.left-pad)/(width-2*pad)*total))));}}>
 <title>White winning chances. Click or use arrow keys to select a position.</title>
 {initial&&<path className="graph-area" d={`${path} L${x(results.length)},${height} L${x(0)},${height} Z`} fill="#f5f5f3"/>}
 <line x1="0" x2={width} y1={height/2} y2={height/2} stroke="#ffffff40" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
 {initial&&<path d={path} fill="none" stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>}
 {results.map((r,i)=>moveLabel(game,i,r.label)!=='Good'&&<circle key={i} cx={x(i+1)} cy={y(r.after.cp)} r="3.5" fill={moveColors[moveLabel(game,i,r.label)||'']||'#999'} stroke="#302e2b" strokeWidth=".5"><title>{`${game?.moves[i].san}: ${moveLabel(game,i,r.label)}, ${r.after.mate!==null?'M'+r.after.mate:(r.after.cp/100).toFixed(2)}`}</title></circle>)}
 {!summary&&initial&&<line className="graph-cursor" x1={x(ply)} x2={x(ply)} y1="0" y2={height} stroke="#81b64c" strokeWidth="2" vectorEffect="non-scaling-stroke"/>}
 </svg>;
}
