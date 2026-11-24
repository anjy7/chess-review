import test from 'node:test';
import assert from 'node:assert/strict';
import {Effect} from 'effect';
import {recentGames} from '../server/recent-games';
const item=(id:number,end=id)=>({url:`https://www.chess.com/game/live/${id}`,rules:'chess',pgn:'[Result "1-0"]\n\n1. e4 e5 1-0',white:{username:'Alice'},black:{username:'Bob'},end_time:end,time_class:'blitz'});
test('recent games are newest first, limited to five, and deduplicated',async()=>{
 const calls:string[]=[];
 const games=await Effect.runPromise(recentGames(' ALICE ',url=>{calls.push(url);return Effect.succeed(url.endsWith('/archives')?{archives:['https://api.chess.com/pub/player/alice/games/2026/10','https://api.chess.com/pub/player/alice/games/2026/11']}:{games:[item(3),item(7),item(4),item(7),item(1),item(6),item(2),item(5)]});}));
 assert.deepEqual(games.map(g=>g.id),['7','6','5','4','3']);assert.equal(calls.length,2);assert.ok(calls.every(url=>url.startsWith('https://api.chess.com/pub/player/alice/')));
});
test('walks previous months, ignores unfinished, variants, invalid and unrelated games',async()=>{
 const calls:string[]=[];
 const games=await Effect.runPromise(recentGames('alice',url=>{calls.push(url);return Effect.succeed(url.endsWith('/archives')?{archives:['https://evil.test/games/2026/10','bad','https://api.chess.com/pub/player/alice/games/2026/11']}:
 url.endsWith('/11')?{games:[item(11),{...item(12),pgn:'1. e4 *'},{...item(13),rules:'chess960'},{...item(14),url:'https://evil.test/game/live/14'},{...item(15),white:{username:'Other'}},{...item(16),end_time:null}]}:{games:[item(10)]});}));
 assert.deepEqual(games.map(g=>g.id),['11','10']);assert.ok(calls.every(url=>url.startsWith('https://api.chess.com/')));
});
test('validates usernames before network access and handles empty/error responses',async()=>{
 let called=false;const client=()=>{called=true;return Effect.succeed({archives:[]});};
 for(const username of ['',null,'a','../alice','alice?bad'])await assert.rejects(Effect.runPromise(recentGames(username,client)),/valid Chess.com username/);
 assert.equal(called,false);
 assert.deepEqual(await Effect.runPromise(recentGames('alice',client)),[]);
 await assert.rejects(Effect.runPromise(recentGames('alice',()=>Effect.fail(Error('Chess.com returned HTTP 404')))),/404/);
 await assert.rejects(Effect.runPromise(recentGames('alice',()=>Effect.succeed({}))),/invalid archive list/);
});
