import {useRef, type CSSProperties} from 'react';
export const moveColors:Record<string,string>={Best:'#81b64c',Good:'#95b776',Book:'#a88865',Inaccuracy:'#edbb35',Mistake:'#ed9941',Blunder:'#e75c50'};
function Question({x}:{x:number}){return <g transform={`translate(${x} 8)`}><path d="M0 4C0 0 8 0 8 4C8 7 4 7 4 10" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round"/><circle cx="4" cy="14.5" r="1.5" fill="white"/></g>;}
export function MoveIcon({label}:{label:string}) {
 return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision"><circle cx="16" cy="16" r="15.5" fill={moveColors[label]||'#888'}/><circle cx="16" cy="16" r="14.8" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth=".8"/>
 {label==='Best'?<path d="m16 5.8 3.1 6.4 7.1 1-5.1 5 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5.1-5 7.1-1Z" fill="white" stroke="white" strokeWidth=".6" strokeLinejoin="round"/>:
 label==='Good'?<path d="m8.5 16.5 5 5L24 10.5" fill="none" stroke="white" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round"/>:
 label==='Book'?<g fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 10Q11 7 6 9v14q5-2 10 1 5-3 10-1V9q-5-2-10 1v14"/><path d="M9 12h3m-3 4h3m8-4h3m-3 4h3"/></g>:
 label==='Inaccuracy'?<><Question x={5}/><path d="M23 9v9" stroke="white" strokeWidth="2.8" strokeLinecap="round"/><circle cx="23" cy="22.5" r="1.5" fill="white"/></>:
 label==='Blunder'?<><Question x={4}/><Question x={19}/></>:<Question x={12}/>}
 </svg>;
}
export function squareCoordinates(square:string,flipped:boolean) {
 const file=square.charCodeAt(0)-97,rank=Number(square[1])-1;
 return {col:flipped?7-file:file,row:flipped?rank:7-rank};
}
export function MoveFeedback({square,label,flipped,animate}:{square:string;label:string;flipped:boolean;animate:boolean}){
 const {col,row}=squareCoordinates(square,flipped);
 const shouldAnimate=useRef(animate).current;
 return <div className={`move-feedback ${shouldAnimate?'feedback-animate':''} ${row===0?'feedback-below':''} ${col<2?'feedback-left':''}`} data-square={square} data-label={label} style={{left:`${col*12.5}%`,top:`${row*12.5}%`,'--feedback-color':moveColors[label]} as CSSProperties}>
 <span className="board-badge" title={label} aria-label={`${label} move`}><MoveIcon label={label}/></span>
 {shouldAnimate&&<span className="move-toast" aria-hidden="true">{label}{label==='Best'?' move':''}</span>}
 </div>;
}
