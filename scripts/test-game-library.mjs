import assert from 'node:assert/strict';
export async function checkGameLibrary(browser){
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const pgn='[White "LibraryUser"]\n[Black "SavedOpponent"]\n\n1. e4 e5 2. Nf3 Nc6 *';
 const imported=await page.request.post('http://127.0.0.1:8765/api/import',{data:{pgn}});const game=await imported.json();
 const started=await page.request.post('http://127.0.0.1:8765/api/analyze',{data:{pgn,mode:'timed',seconds:.1}});const {id}=await started.json();let job;
 for(let i=0;i<100;i++){job=await (await page.request.get('http://127.0.0.1:8765/api/jobs/'+id)).json();if(job.status!=='running')break;await new Promise(r=>setTimeout(r,100));}assert.equal(job.status,'done');
 const saved=Array.from({length:7},(_,i)=>({game:{...game,pgn:game.pgn.replace('SavedOpponent','SavedOpponent'+i),headers:{...game.headers,Black:'SavedOpponent'+i,...(i===0?{Link:'https://www.chess.com/game/live/1234567890',UTCDate:'2026.11.24',UTCTime:'06:42:11'}:{})}},job:{...job,id:'saved-'+i}}));
 const games=Array.from({length:5},(_,i)=>({id:String(700+i),url:'https://www.chess.com/game/live/'+(700+i),pgn:pgn.replace('SavedOpponent','RecentOpponent'+i),white:'LibraryUser',black:'RecentOpponent'+i,result:'1-0',endTime:1800000000-i*1000,timeClass:'blitz'}));
 await page.addInitScript(items=>{localStorage.setItem('chess-reviews',JSON.stringify(items));},saved);
 await page.route('**/api/recent-games',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({games})}));
 try{
  await page.goto('http://127.0.0.1:8765');assert.equal(await page.getByText('Your games. Your computer. No subscription.',{exact:true}).count(),0);
  await page.locator('.import-modal h2').click();assert.ok(await page.getByRole('dialog').isVisible());
  await page.locator('.modal-backdrop').click({position:{x:3,y:3}});assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await page.locator('.compact-status').count(),0);assert.equal(await page.locator('.review-title h1').innerText(),'Game Review');assert.equal(await page.locator('.review-title h1 span').count(),0);
  const recent=page.getByRole('list',{name:'Recent game list',exact:true}),reviews=page.getByRole('list',{name:'Saved analysis list',exact:true});
  assert.equal(await reviews.locator('button').count(),7);
  assert.match(await reviews.locator('button').first().innerText(),/Game #1234567890/);assert.match(await reviews.locator('button').first().innerText(),/2026-11-24 · 06:42:11 UTC/);
  assert.match(await reviews.locator('button').nth(1).innerText(),/Game ID unavailable/);assert.match(await reviews.locator('button').nth(1).innerText(),/Game time unavailable/);
  const library=await page.locator('.game-library').boundingBox(),board=await page.locator('.board-column').boundingBox();assert.ok(library.x+library.width<board.x);assert.ok(library.width>=240&&library.width<=300);assert.ok(board.x-library.x-library.width<=13,'No auto-centering gap between lists and board');assert.ok((await page.locator('#board').boundingBox()).width>=620,'Board retains its larger size');
  await page.getByRole('button',{name:'＋ Import game',exact:true}).click();await page.getByLabel('Username',{exact:true}).fill('LibraryUser');await page.getByRole('button',{name:'Find recent games',exact:true}).click();
  await page.getByLabel('Recent games',{exact:true}).waitFor();await page.locator('.modal-backdrop').click({position:{x:3,y:3}});
  assert.equal(await recent.locator('button').count(),5);
  await recent.locator('button').nth(2).click();await page.getByText('Ready to analyze',{exact:true}).waitFor();assert.match(await page.locator('.player[data-color=b]').innerText(),/RecentOpponent2/);
  await page.getByRole('button',{name:'Last position',exact:true}).click();assert.equal(await page.locator('#board').getAttribute('data-fen'),game.positions.at(-1));
  await recent.locator('button').nth(3).click();await page.getByText('Ready to analyze',{exact:true}).waitFor();assert.equal(await page.locator('#board').getAttribute('data-fen'),game.positions[0]);assert.match(await page.locator('.player[data-color=b]').innerText(),/RecentOpponent3/);
  await reviews.locator('button').nth(6).click();await page.getByRole('button',{name:'Start Review',exact:true}).waitFor();assert.match(await page.locator('.player[data-color=b]').innerText(),/SavedOpponent6/);
  assert.equal(await reviews.locator('[aria-current=true]').count(),1);
  assert.ok(await reviews.evaluate(el=>el.scrollHeight>el.clientHeight));assert.equal(await recent.evaluate(el=>getComputedStyle(el).overflowY),'auto');
  await page.screenshot({path:'.scratch/game-library-desktop.png',fullPage:true});
  await recent.locator('button').first().click();await page.getByText('Ready to analyze',{exact:true}).waitFor();await page.getByLabel('Analysis mode').selectOption('0.1');await page.getByRole('button',{name:'Analyze game',exact:true}).click();
  assert.ok(await reviews.locator('button').first().isDisabled());
  await page.getByRole('button',{name:'Start Review',exact:true}).waitFor({timeout:30000});
  for(let i=0;i<2;i++){await page.getByRole('button',{name:'Save review',exact:true}).click();assert.equal(await reviews.locator('button').count(),8);}
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('chess-reviews')).length),8);
  await page.getByRole('button',{name:'＋ Import game',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.scratch/game-library-mobile.png',fullPage:true});
  await reviews.locator('button').last().click();assert.match(await page.locator('.player[data-color=b]').innerText(),/SavedOpponent6/);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
 console.log('PASS: shared recent-game sidebar, all saved reviews, game switching, scroll regions, save persistence/deduplication, outside/Escape modal dismissal and responsive layout.');
}
