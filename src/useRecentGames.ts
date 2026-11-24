import {useEffect,useRef,useState} from 'react';
import type {RecentGame} from './types';
export function useRecentGames(username:string){
 const key=username.trim().toLowerCase();
 const [result,setResult]=useState<{key:string;games:RecentGame[];status:string}>({key:'',games:[],status:''});
 const [loading,setLoading]=useState(false),request=useRef<AbortController|undefined>(undefined);
 useEffect(()=>{setLoading(false);setResult({key,games:[],status:''});return()=>request.current?.abort();},[key]);
 async function refresh(){
  request.current?.abort();const controller=new AbortController();request.current=controller;
  setLoading(true);setResult({key,games:[],status:'Loading recent games…'});
  try{const response=await fetch('/api/recent-games',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username}),signal:controller.signal});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load recent games.');
   if(controller.signal.aborted)return;
   setResult({key,games:data.games,status:data.games.length?`${data.games.length} recent completed game${data.games.length===1?'':'s'} found.`:'No completed standard games found in the recent archives.'});
  }catch(error){if(!controller.signal.aborted)setResult({key,games:[],status:String(error)});}
  finally{if(!controller.signal.aborted)setLoading(false);}
 }
 return {games:result.key===key?result.games:[],status:result.key===key?result.status:'',loading,refresh};
}
export type RecentGamesState=ReturnType<typeof useRecentGames>;
