import type {Game} from './types';
// Opening annotations are presentation-only; engine evaluations and accuracy remain unchanged.
export const moveLabel=(game:Game|undefined,index:number,engineLabel?:string)=>game?.moves[index]?.book?'Book':engineLabel;
