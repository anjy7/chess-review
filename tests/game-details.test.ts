import {test} from 'node:test';import assert from 'node:assert/strict';import {gameDetails} from '../src/game-details.js';
test('saved game details use original game ID and UTC start time',()=>{
 assert.deepEqual(gameDetails({Link:'https://www.chess.com/game/live/1234567890',UTCDate:'2026.11.24',UTCTime:'06:42:11',Date:'2026.11.23',StartTime:'22:42:11'}),{id:'1234567890',timeLabel:'2026-11-24 · 06:42:11 UTC'});
 assert.equal(gameDetails({Site:'https://www.chess.com/analysis/game/daily/999/analysis'}).id,'999');
});
test('missing or malformed details never invent a game ID, midnight, or timezone',()=>{
 assert.deepEqual(gameDetails({}),{id:undefined,timeLabel:'Game time unavailable'});
 assert.equal(gameDetails({Link:'https://evil.example/game/live/123'}).id,undefined);
 assert.equal(gameDetails({UTCDate:'2026.02.30',UTCTime:'23:99:00',Date:'????.??.??'}).timeLabel,'Game time unavailable');
 assert.equal(gameDetails({Date:'2026.11.24'}).timeLabel,'2026-11-24 · Time unavailable');
 assert.equal(gameDetails({Date:'2026.11.24',StartTime:'12:34:56'}).timeLabel,'2026-11-24 · 12:34:56 (timezone unspecified)');
});
