import express from 'express';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Effect, Cause, Exit } from 'effect';
import { enginePath } from './engine.js';
import { review } from './review.js';
import { analyzePosition, positionInput } from './position.js';
import { analysisOptions } from './analysis-profile.js';
import { recentGames } from './recent-games.js';
import { parseGame, importLink } from './game.js';
import { SCORING_VERSION } from '../src/scoring.js';
import type { Job } from '../src/types.js';

const app=express();
app.use((req,res,next)=>{
  if(!['127.0.0.1','localhost'].includes(req.hostname)){res.status(403).json({error:'Local access only'});return;}
  const origin=req.get('origin');
  if(origin&&!['http://127.0.0.1:8765','http://localhost:8765','http://127.0.0.1:5173','http://localhost:5173'].includes(origin)){res.status(403).json({error:'Cross-origin access denied'});return;}
  if(req.method==='POST'&&!req.is('application/json')){res.status(415).json({error:'JSON required'});return;}
  next();
});
app.use(express.json({limit:'256kb'}));
const jobs=new Map<string,Job>();
let active:{id:string;controller:AbortController}|undefined;
let liveController:AbortController|undefined;
app.get('/api/health',(_req,res)=>{try{res.json({available:existsSync(enginePath())});}catch{res.json({available:false});}});
app.post('/api/import',async(req,res,next)=>{
  const controller=new AbortController();res.on('close',()=>controller.abort());
  try{const game=req.body.pgn?parseGame(req.body.pgn):await Effect.runPromise(importLink(String(req.body.url||''),String(req.body.username||'')),{signal:controller.signal});res.json(game);}catch(e){next(e);}
});
app.post('/api/recent-games',async(req,res,next)=>{
  const controller=new AbortController();res.on('close',()=>controller.abort());
  try{const games=await Effect.runPromise(recentGames(req.body.username),{signal:controller.signal});if(!res.destroyed)res.json({games});}catch(error){if(!res.destroyed)next(error);}
});
app.post('/api/position',async(req,res,next)=>{
  let controller:AbortController|undefined;
  try{const input=positionInput(req.body);liveController?.abort();controller=new AbortController();liveController=controller;
    res.on('close',()=>controller?.abort());
    const result=await Effect.runPromise(analyzePosition(input),{signal:controller.signal});
    if(!res.destroyed)res.json(result);
  }catch(error){if(!res.destroyed){if(controller?.signal.aborted)res.status(409).json({error:'Position analysis superseded.'});else next(error);}}
  finally{if(liveController===controller)liveController=undefined;}
});
app.post('/api/analyze',(req,res,next)=>{try{
  if(active){res.status(409).json({error:'Another review is running. Cancel it first.'});return;}
  const game=parseGame(req.body.pgn),options=analysisOptions(req.body);
  enginePath();
  const id=randomUUID(),controller=new AbortController(),job:Job={id,status:'running',progress:0,results:[],summary:{},scoringVersion:SCORING_VERSION};
  if(jobs.size>=10)jobs.delete(jobs.keys().next().value!);
  jobs.set(id,job);active={id,controller};
  void Effect.runPromiseExit(review(game,options,job),{signal:controller.signal}).then(exit=>{
    if(Exit.isSuccess(exit))job.status='done';
    else if(Cause.isInterruptedOnly(exit.cause))job.status='cancelled';
    else{job.status='error';job.error=Cause.pretty(exit.cause);}
    active=undefined;
  });
  res.json({id});
}catch(e){next(e);}});
app.get('/api/jobs/:id',(req,res)=>{const job=jobs.get(req.params.id);res.status(job?200:404).json(job||{error:'Review not found. The server may have restarted.'});});
app.post('/api/jobs/:id/cancel',(req,res)=>{if(active?.id===req.params.id)active.controller.abort();res.json({ok:true});});
app.use('/api',(_req,res)=>{res.status(404).json({error:'Unknown API route'});});
app.use(express.static(resolve('dist')));
app.get('/',(_req,res)=>{if(existsSync(resolve('dist/index.html')))res.sendFile(resolve('dist/index.html'));else res.status(503).send('Run npm run build first, or use the Vite development URL.');});
app.use((error:Error, _req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(400).json({error:error.message});});
const server=app.listen(8765,'127.0.0.1',()=>console.log('Local Chess Review: http://127.0.0.1:8765'));
const stop=()=>{active?.controller.abort();liveController?.abort();server.close();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
