import type {Color,PieceSymbol} from 'chess.js';
import {ChessPiece} from './ChessPiece';
import {captureOrder} from './material';
const names:Record<PieceSymbol,string>={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
export function CapturedPieces({color,pieces,advantage}:{color:Color;pieces:PieceSymbol[];advantage:number}){
 const groups=captureOrder.map(type=>({type,count:pieces.filter(piece=>piece===type).length})).filter(group=>group.count);
 const description=groups.map(({type,count})=>`${count} ${names[type]}${count===1?'':'s'}`).join(', ')||'none';
 return <div className="captured-pieces" data-color={color} role="img" aria-label={`${color==='w'?'White':'Black'} captured: ${description}. Material advantage: ${advantage?'+':''}${advantage}.`}>
  {groups.map(({type,count})=><span className="capture-group" key={type} title={`${count} ${names[type]}${count===1?'':'s'} captured`}>{Array.from({length:count},(_,i)=><span className="captured-piece" key={i}><ChessPiece type={type} color={color==='w'?'b':'w'}/></span>)}</span>)}
  {advantage>0&&<span className="material-advantage" title="Material lead · pawn 1, knight/bishop 3, rook 5, queen 9">+{advantage}</span>}
 </div>;
}
