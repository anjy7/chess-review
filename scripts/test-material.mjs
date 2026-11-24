import assert from 'node:assert/strict';
export async function checkMaterial(browser){
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const captures=color=>page.locator(`.captured-pieces[data-color="${color}"]`);
 const lead=color=>captures(color).locator('.material-advantage');
 try{
  await page.goto('http://127.0.0.1:8765');await page.locator('.import-modal summary').click();
  await page.getByLabel('PGN',{exact:true}).fill('[White "PlayerWithAVeryLongUsername"]\n[Black "AnotherLongUsername"]\n\n1. e4 d5 2. exd5 Qxd5 *');
  await page.getByRole('button',{name:'Import game',exact:true}).click();await page.getByText('Ready to analyze',{exact:true}).waitFor();
  assert.equal(await page.locator('.captured-piece').count(),0);assert.equal(await page.locator('.material-advantage').count(),0);
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Next move',exact:true}).click();
  assert.equal(await captures('w').locator('[data-piece="bp"]').count(),1);assert.equal(await lead('w').innerText(),'+1');assert.equal(await lead('b').count(),0);
  await page.screenshot({path:'.scratch/captured-desktop.png'});
  await page.getByRole('button',{name:'Next move',exact:true}).click();assert.equal(await captures('b').locator('[data-piece="wp"]').count(),1);assert.equal(await page.locator('.material-advantage').count(),0);
  await page.getByRole('button',{name:'Previous move',exact:true}).click();assert.equal(await lead('w').innerText(),'+1');assert.equal(await captures('b').locator('.captured-piece').count(),0);
  // The captured lists follow an explored branch and restore with the main game.
  await page.locator('button[title="d8"]').click();await page.locator('button[title="d5"]').click();
  assert.equal(await captures('b').locator('[data-piece="wp"]').count(),1);assert.equal(await page.locator('.material-advantage').count(),0);
  await page.getByRole('button',{name:'Return to game',exact:true}).click();assert.equal(await lead('w').innerText(),'+1');
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   for(let flip=0;flip<2;flip++){
    await page.getByRole('button',{name:'Flip board',exact:true}).click();assert.equal(await lead('w').innerText(),'+1');
    assert.ok(await page.locator('.player').evaluateAll(players=>players.every(p=>{const b=p.getBoundingClientRect(),c=p.querySelector('.clock').getBoundingClientRect();return [...p.querySelectorAll('.captured-piece,.material-advantage')].every(el=>{const r=el.getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom+.1&&r.right<c.left;});})));
   }
  }
  await page.getByRole('button',{name:'First position',exact:true}).click();assert.equal(await page.locator('.captured-piece').count(),0);assert.equal(await page.locator('.material-advantage').count(),0);
  await page.getByRole('button',{name:'＋ Import game',exact:true}).click();await page.getByRole('button',{name:'Try demo',exact:true}).click();await page.getByText('Ready to analyze',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Last position',exact:true}).click();assert.ok(await page.locator('.captured-piece').count()>10);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('.player').evaluateAll(players=>players.every(p=>{const bounds=p.getBoundingClientRect(),clock=p.querySelector('.clock').getBoundingClientRect();return [...p.querySelectorAll('.captured-piece,.material-advantage')].every(el=>{const r=el.getBoundingClientRect();return r.bottom<=bounds.bottom+.1&&r.right<clock.left;});})));
  await page.screenshot({path:'.scratch/captured-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 }finally{await page.close();}
 console.log('PASS: captured pieces and material lead across captures, exchanges, navigation, variations, board flips and mobile layout.');
}
