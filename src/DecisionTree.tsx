import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Chess} from 'chess.js';
import type {Evaluation,TreeAnalysis} from './types';
import {ChessPiece} from './ChessPiece';
import {winPercent} from './scoring';
import './decision-tree.css';
type Node={id:string;san:string;moves:string[];fen:string;rank?:number;evaluation?:Evaluation;line?:string[];accuracy?:number;winLoss?:number;children?:string[];terminal?:string;error?:string};
export function DecisionTree({initialFen,moves,onClose,onExplore}:{initialFen:string;moves:string[];onClose:()=>void;onExplore:(moves:string[])=>void}){
 const [nodes,setNodes]=useState<Record<string,Node>>(()=>{const b=new Chess(initialFen);for(const m of moves)b.move(m);return {root:{id:'root',san:'Current position',moves:[],fen:b.fen()}};});
 const [collapsed,setCollapsed]=useState<Set<string>>(new Set()),[pending,setPending]=useState<string>();
 const request=useRef<AbortController|undefined>(undefined),dialog=useRef<HTMLDialogElement>(null),focusNode=useRef('root');
 useLayoutEffect(()=>{dialog.current?.querySelector(`[data-node="${focusNode.current}"] > .tree-card`)?.scrollIntoView({block:'nearest',inline:'center'});},[nodes,collapsed]);
 async function expand(node:Node){
  focusNode.current=node.id;
  if(node.children){setCollapsed(old=>{const next=new Set(old);if(next.has(node.id))next.delete(node.id);else next.add(node.id);return next;});return;}
  request.current?.abort();const controller=new AbortController();request.current=controller;setPending(node.id);
  setNodes(old=>({...old,[node.id]:{...old[node.id],error:undefined}}));
  try{const response=await fetch('/api/tree',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initialFen,moves:[...moves,...node.moves]}),signal:controller.signal});
   const result=await response.json() as TreeAnalysis&{error?:string};if(!response.ok)throw Error(result.error||'Tree search failed');if(controller.signal.aborted)return;
   setNodes(old=>{const next={...old},children=result.candidates.map((candidate,i)=>{const board=new Chess(node.fen);board.move(candidate.uci);const id=node.id+'/'+candidate.uci;next[id]={id,san:candidate.san,moves:[...node.moves,candidate.uci],fen:board.fen(),rank:i+1,evaluation:candidate.evaluation,line:candidate.line,accuracy:candidate.accuracy,winLoss:candidate.winLoss};return id;});next[node.id]={...old[node.id],children,terminal:result.terminal};return next;});
  }catch(error){if(!controller.signal.aborted)setNodes(old=>({...old,[node.id]:{...old[node.id],error:String(error)}}));}
  finally{if(!controller.signal.aborted)setPending(undefined);}
 }
 useEffect(()=>{const element=dialog.current!;element.showModal();const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';void expand(nodes.root);return()=>{request.current?.abort();element.close();document.body.style.overflow=previousOverflow;};},[]);
 function renderNode(id:string){const node=nodes[id],open=!!node.children&&!collapsed.has(id),white=node.fen.split(' ')[1]==='w';
 const whiteShare=node.evaluation?winPercent(node.evaluation.cp):50;
 const advantage=whiteShare===50?'Even position':`${whiteShare>50?'White':'Black'} ${node.evaluation?.mate!==null?'has mate':'favored'}`;
 const barLabel=`${advantage}. Stockfish advantage estimate: White ${Math.round(whiteShare)}%, Black ${Math.round(100-whiteShare)}%.`;
 return <div className="tree-node" key={id} data-node={id}>
  <article className={`tree-card ${id==='root'?'tree-root':''}`}>
   <div className="tree-card-top"><span className="tree-rank">{node.rank?`Candidate ${node.rank}`:'Starting point'}</span></div>
   <div className="tree-move-row"><div>{id!=='root'&&<span className="tree-mover">{white?'Black':'White'} plays</span>}<h3 className={id==='root'?'':`tree-move ${white?'black-move':'white-move'}`} data-mover={id==='root'?undefined:white?'b':'w'}>{node.san}</h3><span className="tree-turn"><i className={white?'white-turn':''}/>{white?'White':'Black'} {id==='root'?'to move':'replies next'}</span></div>{node.evaluation&&<div className="tree-odds" role="img" aria-label={barLabel} title={barLabel}><span style={{height:`${whiteShare}%`}}/></div>}</div>
   {id==='root'&&<div className="tree-mini-board" aria-label="Tree starting position">{new Chess(node.fen).board().flat().map((piece,i)=><div key={i} className={(Math.floor(i/8)+i%8)%2?'mini-dark':'mini-light'}>{piece&&<ChessPiece type={piece.type} color={piece.color}/>}</div>)}</div>}
   {node.evaluation&&<><p className="tree-advantage">{advantage}</p><small>Depth {node.evaluation.depth} · parent search</small><p className="tree-line" title={node.line?.join(' ')}>{node.line?.slice(0,7).join(' ')}{(node.line?.length||0)>7?' …':''}</p></>}
   {node.accuracy!==undefined&&node.winLoss!==undefined&&<div className="tree-metrics" title="Estimated from this position’s top-three search, relative to its best candidate. May differ from the full game review. Winning-chance loss is measured in percentage points."><p>Move accuracy: <strong>{node.accuracy.toFixed(1)}%</strong></p><p>Winning-chance loss: <strong>{node.winLoss.toFixed(1)} pp</strong></p></div>}
   {node.terminal&&<p className="tree-terminal">{node.terminal}</p>}
   {node.error&&<p className="tree-error" role="alert">{node.error}</p>}
   <div className="tree-actions">{!node.terminal&&<button disabled={!!pending} onClick={()=>void expand(node)}>{pending===id?'Searching…':node.children?open?'Collapse':'Expand':node.error?'Retry':'Explore replies'}</button>}{id!=='root'&&<button onClick={()=>onExplore(node.moves)}>Show on board</button>}</div>
  </article>
  {open&&!!node.children?.length&&<div className="tree-children">{node.children.map(renderNode)}</div>}
 </div>;}
 return <dialog ref={dialog} className="decision-tree" aria-labelledby="tree-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
  <header><div><span className="tree-eyebrow">STOCKFISH EXPLORER</span><h2 id="tree-title">Decision tree</h2></div><button aria-label="Close decision tree" onClick={onClose}>✕</button></header>
  <div className="tree-canvas" tabIndex={0} aria-label="Scrollable candidate tree">{renderNode('root')}</div>
  <footer><span role="status">{pending?'Stockfish is searching…':`${Object.keys(nodes).length} positions explored`}</span><span>1 second per search · scroll to explore</span></footer>
 </dialog>;
}
