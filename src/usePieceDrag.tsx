import {useEffect,useLayoutEffect,useRef,useState,type PointerEvent} from 'react';
import {Chess,type Square,type PieceSymbol,type Color} from 'chess.js';
import {ChessPiece} from './ChessPiece';
import {squareCoordinates} from './MoveFeedback';

type Session={id:number;board:HTMLElement;fen:string;flipped:boolean;from:Square;type:PieceSymbol;color:Color;legal:Set<string>;startX:number;startY:number;x:number;y:number;size:number;over?:Square;active:boolean};
type Landing={square:Square;dx:number;dy:number;fen:string;flipped:boolean;id:number};
export function usePieceDrag({fen,flipped,enabled,onMove,onSelect}:{fen:string;flipped:boolean;enabled:boolean;onMove:(from:Square,to:Square)=>string|undefined;onSelect:(square:Square)=>void}){
 const session=useRef<Session|undefined>(undefined),ghost=useRef<HTMLDivElement>(null),target=useRef<HTMLDivElement>(null),landing=useRef<Landing|undefined>(undefined),serial=useRef(0),suppress=useRef(false);
 const [view,setView]=useState<Session>();
 const paint=()=>{const s=session.current;if(!s)return;if(ghost.current)ghost.current.style.transform=`translate(${s.x-s.size/2}px,${s.y-s.size/2}px)`;
  if(target.current){target.current.style.visibility=s.over?'visible':'hidden';if(s.over){const p=squareCoordinates(s.over,s.flipped);target.current.style.transform=`translate(${p.col*s.size}px,${p.row*s.size}px)`;}}
 };
 useLayoutEffect(paint,[view]);
 useLayoutEffect(()=>{if(landing.current&&(landing.current.fen!==fen||landing.current.flipped!==flipped))landing.current=undefined;},[fen,flipped]);
 const release=(s:Session)=>{if(s.board.hasPointerCapture(s.id))s.board.releasePointerCapture(s.id);};
 const finish=(commit:boolean)=>{const s=session.current;if(!s)return;session.current=undefined;
  if(s.active){suppress.current=true;setTimeout(()=>{suppress.current=false;},0);
   const destination=commit&&s.over?s.over:s.from;
   const nextFen=commit&&s.over?onMove(s.from,s.over):undefined;
   const square=nextFen?destination:s.from,p=squareCoordinates(square,s.flipped);
   landing.current={square,dx:s.x/s.size-p.col-.5,dy:s.y/s.size-p.row-.5,fen:nextFen||s.fen,flipped:s.flipped,id:++serial.current};
  }
  setView(undefined);release(s);
 };
 useEffect(()=>{const s=session.current;if(s&&(s.fen!==fen||s.flipped!==flipped||!enabled)){session.current=undefined;setView(undefined);release(s);}},[fen,flipped,enabled]);
 useEffect(()=>{const cancel=()=>finish(false);const key=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel();};window.addEventListener('blur',cancel);window.addEventListener('keydown',key);return()=>{window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key);};});
 useEffect(()=>()=>{const s=session.current;session.current=undefined;if(s)release(s);},[]);
 const move=(e:PointerEvent<HTMLElement>)=>{const s=session.current;if(!s||s.id!==e.pointerId)return;
  if(!s.active&&Math.hypot(e.clientX-s.startX,e.clientY-s.startY)<5)return;
  if(!s.active){s.active=true;s.board.setPointerCapture(s.id);onSelect(s.from);setView({...s});}
  e.preventDefault();const rect=s.board.getBoundingClientRect();s.size=rect.width/8;
  const x=e.clientX-rect.left,y=e.clientY-rect.top,col=Math.floor(x/s.size),row=Math.floor(y/s.size);
  const square=(String.fromCharCode(97+(s.flipped?7-col:col))+(s.flipped?row+1:8-row)) as Square;
  s.over=col>=0&&col<8&&row>=0&&row<8&&s.legal.has(square)?square:undefined;
  const cx=(col+.5)*s.size,cy=(row+.5)*s.size;
  const attraction=s.over?Math.max(0,1-Math.hypot(x-cx,y-cy)/(s.size*.55))*.8:0;
  s.x=x+(cx-x)*attraction;s.y=y+(cy-y)*attraction;paint();
 };
 return {
  from:view?.from,
  landing:landing.current?.fen===fen&&landing.current.flipped===flipped?landing.current:undefined,
  handlers:{
   onPointerDown:(e:PointerEvent<HTMLDivElement>)=>{if(!enabled||session.current||!e.isPrimary||e.button!==0)return;const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button[title]');if(!button)return;
    const from=button.title as Square,board=new Chess(fen),piece=board.get(from);if(!piece||piece.color!==board.turn())return;
    const rect=e.currentTarget.getBoundingClientRect(),p=squareCoordinates(from,flipped),size=rect.width/8;
    session.current={id:e.pointerId,board:e.currentTarget,fen,flipped,from,...piece,legal:new Set(board.moves({square:from,verbose:true}).map(m=>m.to)),startX:e.clientX,startY:e.clientY,x:(p.col+.5)*size,y:(p.row+.5)*size,size,active:false};
   },
   onPointerMove:move,
   onPointerUp:(e:PointerEvent<HTMLDivElement>)=>{if(session.current?.id===e.pointerId){if(session.current.active)move(e);finish(true);}},
   onPointerCancel:()=>finish(false),
   onLostPointerCapture:(e:PointerEvent<HTMLDivElement>)=>{if(e.target===e.currentTarget)finish(false);},
   onPointerLeave:()=>{if(session.current&&!session.current.active)session.current=undefined;},
   onClickCapture:(e:React.MouseEvent)=>{if(suppress.current){e.preventDefault();e.stopPropagation();suppress.current=false;}},
  },
  overlay:view&&<><div ref={target} className="magnet-target" aria-hidden="true"/><div ref={ghost} className="drag-piece" aria-hidden="true"><ChessPiece type={view.type} color={view.color}/></div></>
 };
}
