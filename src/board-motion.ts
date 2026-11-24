import { Chess } from 'chess.js';
import { squareCoordinates } from './MoveFeedback';
export type BoardSnapshot={fen:string;history:string[];flipped:boolean};
export function pieceMotions(previous:BoardSnapshot|undefined,next:BoardSnapshot):Record<string,{dx:number;dy:number}> {
 if(!previous||previous.flipped!==next.flipped||Math.abs(previous.history.length-next.history.length)!==1)return {};
 const short=previous.history.length<next.history.length?previous.history:next.history,long=previous.history.length<next.history.length?next.history:previous.history;
 if(!short.every((m,i)=>long[i]===m))return {};
 const oldBoard=new Chess(previous.fen),board=new Chess(next.fen);
 const oldPieces=oldBoard.board().flat().filter(p=>p&&(!board.get(p.square)||board.get(p.square)?.color!==p.color||board.get(p.square)?.type!==p.type));
 const added=board.board().flat().filter(p=>p&&(!oldBoard.get(p.square)||oldBoard.get(p.square)?.color!==p.color||oldBoard.get(p.square)?.type!==p.type));
 const moves:Record<string,{dx:number;dy:number}>={};
 for(const piece of added){if(!piece)continue;const i=oldPieces.findIndex(p=>p&&p.color===piece.color&&(p.type===piece.type||(p.type==='p'&&/[18]$/.test(piece.square))||(piece.type==='p'&&/[27]$/.test(piece.square))));if(i<0)continue;
 const from=oldPieces.splice(i,1)[0]!,a=squareCoordinates(from.square,next.flipped),b=squareCoordinates(piece.square,next.flipped);moves[piece.square]={dx:a.col-b.col,dy:a.row-b.row};}
 return moves;
}
