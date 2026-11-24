import { useLayoutEffect, useRef } from 'react';
import type { PieceSymbol, Color } from 'chess.js';

// Trusted, bundled Cburnett SVGs only; never accepts user-supplied SVG markup.
// Cburnett / Wikimedia Commons, CC BY-SA 3.0. See public/pieces/cburnett/NOTICE.md.
const files=import.meta.glob('/public/pieces/cburnett/*.svg',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const artwork=Object.fromEntries(Object.entries(files).map(([path,svg])=>[path.split('/').pop()!.replace('.svg',''),svg.replace(/^[\s\S]*?<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'')]));
export function ChessPiece({type,color}:{type:PieceSymbol;color:Color}) {
 return <svg className="piece-vector" data-piece={`${color}${type}`} viewBox="0 0 45 45" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision" dangerouslySetInnerHTML={{__html:artwork[color+type]}}/>;
}

export function PieceMotion({dx,dy,motionKey,children,...props}:React.HTMLAttributes<HTMLSpanElement>&{dx:number;dy:number;motionKey:string}) {
 const ref=useRef<HTMLSpanElement>(null);
 useLayoutEffect(()=>{
  const el=ref.current;if(!el||(!dx&&!dy)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const animation=el.animate([{transform:`translate(${dx*100}%,${dy*100}%)`},{transform:'translate(0,0)'}],{duration:Math.min(240,150+Math.hypot(dx,dy)*22),easing:'cubic-bezier(.16,1,.3,1)'});
  el.style.zIndex='5';animation.onfinish=()=>{el.style.zIndex='';};
  return()=>{animation.cancel();el.style.zIndex='';};
 // Position identity, not transient offsets: analysis updates must not cancel a slide.
 },[motionKey]);
 return <span {...props} ref={ref}>{children}</span>;
}
