export type RecentGame={id:string;url:string;pgn:string;white:string;black:string;result:string;endTime:number;timeClass:string};
export type Opening={eco:string;name:string};
export type Game = {pgn:string; headers:Record<string,string>; positions:string[]; opening?:Opening; moves:{san:string;uci:string;clockSeconds?:number;book?:boolean;opening?:Opening}[]};
export type Evaluation = {cp:number;mate:number|null;pv:string[];depth:number;nodes?:number;timeMs?:number};
export type TreeAnalysis={fen:string;turn:'w'|'b';terminal?:string;candidates:{uci:string;san:string;evaluation:Evaluation;line:string[];accuracy:number;winLoss:number}[]};
export type Row = {ply:number;before:Evaluation;after:Evaluation;label:string;loss:number;accuracy?:number;winLoss?:number;best:string;line:string[]};
export type Job = {id:string;status:'running'|'done'|'cancelled'|'error';progress:number;scoringVersion?:string;analysis?:{mode:'timed'|'lichess';profile?:string;nodes?:number;nominalNodes?:number;workers?:number;effectiveWorkers?:number;milliseconds?:number;engine?:string;network?:string;completedPositions?:number;totalPositions?:number};results:Row[];summary:{white?:number;black?:number};error?:string};
