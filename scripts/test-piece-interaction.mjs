import assert from 'node:assert/strict';
export async function checkPieceInteraction(browser){
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const center=async square=>{const b=await page.locator(`button[title="${square}"]`).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2,size:b.width};};
 const reset=async()=>{if(await page.getByRole('button',{name:'Return to game',exact:true}).count())await page.getByRole('button',{name:'Return to game',exact:true}).click();};
 const settle=()=>page.waitForFunction(()=>[...document.querySelectorAll('.piece')].every(el=>el.getAnimations().every(a=>a.playState!=='running')));
 try{
  await page.goto('http://127.0.0.1:8765');await page.getByRole('button',{name:'Try demo',exact:true}).click();await page.getByText('Ready to analyze',{exact:true}).waitFor();
  const initial=await page.locator('#board').getAttribute('data-fen');
  // Click-to-move remains animated and lands exactly at the square center.
  await page.locator('button[title="e2"]').click();await page.locator('button[title="e4"]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.piece')].some(el=>el.getAnimations().some(a=>a.playState==='running')));
  await settle();assert.equal(await page.locator('button[title="e4"] .piece-vector').getAttribute('data-piece'),'wp');await reset();
  for(const flipped of [false,true]){
   if(flipped)await page.getByRole('button',{name:'Flip board',exact:true}).click();
   const a=await center('d2'),b=await center('d4');await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x+b.size*.2,b.y,{steps:12});
   assert.equal(await page.locator('.drag-piece').count(),1);assert.equal(await page.locator('.drag-source').count(),1);
   const ghost=await page.locator('.drag-piece').boundingBox();const distance=Math.abs(ghost.x+ghost.width/2-b.x);
   assert.ok(distance<b.size*.16,'Legal-square attraction must pull the piece closer than the pointer');
   assert.equal(await page.locator('.magnet-target').evaluate(el=>getComputedStyle(el).visibility),'visible');
   await page.mouse.up();await settle();assert.equal(await page.locator('.drag-piece').count(),0);
   assert.match(await page.locator('#position').innerText(),/Variation 1/);assert.equal(await page.locator('button[title="d4"] .piece-vector').getAttribute('data-piece'),'wp');await reset();
  }
  await page.getByRole('button',{name:'Flip board',exact:true}).click();
  // Illegal drops glide home without changing the game, then a regular click still works.
  let a=await center('e2'),b=await center('e5');await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:10});
  assert.equal(await page.locator('.magnet-target').evaluate(el=>getComputedStyle(el).visibility),'hidden');await page.mouse.up();await settle();
  assert.equal(await page.locator('#board').getAttribute('data-fen'),initial);assert.equal(await page.locator('.drag-source').count(),0);
  await page.locator('button[title="e4"]').click();assert.match(await page.locator('#position').innerText(),/Variation 1/);await reset();
  // Releasing outside the board and Escape both clean up capture/overlays.
  for(const cancel of ['outside','escape']){
   a=await center('g1');await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(5,5,{steps:8});
   if(cancel==='escape')await page.keyboard.press('Escape');await page.mouse.up();await settle();
   assert.equal(await page.locator('.drag-piece').count(),0);assert.equal(await page.locator('#board').getAttribute('data-fen'),initial);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('button[title="e2"]').click();await page.locator('button[title="e4"]').click();
  assert.equal(await page.locator('.piece').evaluateAll(nodes=>nodes.flatMap(el=>el.getAnimations()).filter(a=>a.playState==='running').length),0);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 try{
  const mobile=await context.newPage();await mobile.goto('http://127.0.0.1:8765');await mobile.getByRole('button',{name:'Try demo',exact:true}).click();await mobile.getByText('Ready to analyze',{exact:true}).waitFor();
  const cdp=await context.newCDPSession(mobile),a=await mobile.locator('button[title="e2"]').boundingBox(),b=await mobile.locator('button[title="e4"]').boundingBox();
  const touch=(x,y)=>[{x,y,id:1,radiusX:4,radiusY:4,force:1}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touch(a.x+a.width/2,a.y+a.height/2)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touch(b.x+b.width/2,b.y+b.height/2)});
  await mobile.locator('.drag-piece').waitFor();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.locator('#position').filter({hasText:'Variation 1'}).waitFor();assert.equal(await mobile.locator('.drag-piece').count(),0);
 }finally{await context.close();}
 console.log('PASS: click slides, magnetic legal drops, flipped-board drag, illegal/outside snap-back, Escape cleanup, reduced motion and real touch input.');
}
