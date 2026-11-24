import type { Chess, Color, PieceSymbol } from 'chess.js';

export const pieceValues:Record<PieceSymbol,number>={p:1,n:3,b:3,r:5,q:9,k:0};
export const captureOrder:PieceSymbol[]=['p','n','b','r','q'];
export function materialSummary(board:Chess){
 const captured:Record<Color,PieceSymbol[]>={w:[],b:[]},totals={w:0,b:0};
 for(const move of board.history({verbose:true}))if(move.captured)captured[move.color].push(move.captured);
 for(const row of board.board())for(const piece of row)if(piece)totals[piece.color]+=pieceValues[piece.type];
 return {captured,advantage:{w:Math.max(0,totals.w-totals.b),b:Math.max(0,totals.b-totals.w)}};
}
