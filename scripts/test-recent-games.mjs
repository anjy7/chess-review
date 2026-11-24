import assert from 'node:assert/strict';
export async function checkRecentGames(browser){
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const games=Array.from({length:5},(_,i)=>({id:String(100+i),url:`https://www.chess.com/game/live/${100+i}`,white:'Alice',black:`Opponent${i}`,result:i===1?'1/2-1/2':'1-0',endTime:1800000000-i*1000,timeClass:'blitz',pgn:`[White "Alice"]\n[Black "Opponent${i}"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0`}));
 let release;
 try{
  await page.route('**/api/recent-games',async route=>{
   const username=route.request().postDataJSON().username;
   if(username==='Slow')await new Promise(resolve=>release=resolve);
   try{await route.fulfill({status:username==='Missing'?400:200,contentType:'application/json',body:JSON.stringify(username==='Missing'?{error:'Chess.com returned HTTP 404'}:{games:username==='Empty'?[]:games})});}catch{/* A username edit or dialog close can abort the request. */}
  });
  await page.goto('http://127.0.0.1:8765');
  assert.ok(await page.getByRole('button',{name:'Find recent games',exact:true}).isDisabled());
  await page.getByLabel('Username',{exact:true}).fill('Alice');await page.getByRole('button',{name:'Find recent games',exact:true}).click();
  await page.getByText('5 recent completed games found.',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Recent games',{exact:true}).locator('option').count(),5);
  assert.match(await page.getByLabel('Recent games',{exact:true}).locator('option').nth(1).innerText(),/Opponent1.*Draw.*#101/);
  await page.getByLabel('Recent games',{exact:true}).selectOption(games[2].url);
  await page.locator('.import-modal summary').click();await page.getByLabel('PGN',{exact:true}).fill('stale invalid PGN');
  await page.getByRole('button',{name:'Import selected game',exact:true}).click();await page.getByText('Ready to analyze',{exact:true}).waitFor();
  assert.ok(await page.locator('.player[data-color=b]').innerText().then(s=>s.includes('Opponent2')));
  await page.getByRole('button',{name:'＋ Import game',exact:true}).click();
  await page.getByLabel('Username',{exact:true}).fill('Empty');await page.getByRole('button',{name:'Find recent games',exact:true}).click();
  await page.locator('.recent-games').getByText('No completed standard games found in the recent archives.',{exact:true}).waitFor();assert.equal(await page.getByLabel('Recent games',{exact:true}).count(),0);
  await page.getByLabel('Username',{exact:true}).fill('Missing');await page.getByRole('button',{name:'Find recent games',exact:true}).click();await page.locator('.recent-games').getByText(/HTTP 404/).waitFor();
  await page.getByLabel('Username',{exact:true}).fill('Slow');
  const pending=page.waitForRequest('**/api/recent-games');await page.getByRole('button',{name:'Find recent games',exact:true}).click();await pending;
  await page.getByLabel('Username',{exact:true}).fill('Alice');release?.();
  await page.getByRole('button',{name:'Find recent games',exact:true}).click();await page.getByText('5 recent completed games found.',{exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'.scratch/recent-games-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  const response=await page.request.post('http://127.0.0.1:8765/api/recent-games',{data:{username:'../invalid'}});assert.equal(response.status(),400);
 }finally{release?.();await page.close();}
 console.log('PASS: recent-game dropdown, selected PGN import, username changes, stale-request cancellation, empty/error states and mobile layout.');
}
