import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
export async function checkTree(browser){
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8765');await page.getByRole('button',{name:'Try demo',exact:true}).click();await page.getByText('Ready to analyze',{exact:true}).waitFor();
  for(let i=0;i<4;i++)await page.getByRole('button',{name:'Next move',exact:true}).click();
  const checkMini=async()=>{
   const geometry=await page.locator('.tree-mini-board').evaluate(board=>{const b=board.getBoundingClientRect(),r=board.closest('.tree-card').getBoundingClientRect();return {width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom,cells:[...board.children].map(c=>{const x=c.getBoundingClientRect();return {width:x.width,height:x.height,x:x.left-b.left,y:x.top-b.top};})};});
   assert.equal(geometry.width,160);assert.equal(geometry.height,160);assert.ok(geometry.inside);assert.equal(geometry.cells.length,64);
   geometry.cells.forEach((c,i)=>{assert.equal(c.width,20);assert.equal(c.height,20);assert.ok(Math.abs(c.x-i%8*20)<.1);assert.ok(Math.abs(c.y-Math.floor(i/8)*20)<.1);});
  };
  const checkDirection=async()=>assert.ok(await page.locator('.tree-node').evaluateAll(nodes=>nodes.every(n=>{const parent=n.querySelector(':scope > .tree-card').getBoundingClientRect();return [...n.querySelectorAll(':scope > .tree-children > .tree-node > .tree-card')].every(c=>c.getBoundingClientRect().top>=parent.bottom+25);})), 'Every child is below its parent');
  for(const [width,height] of [[1440,1000],[1366,768],[1280,800],[390,844],[320,700]]){
   await page.setViewportSize({width,height});const layout=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),launch=r('.tree-launch'),nav=r('.navigation'),tools=r('.bottom-tools'),panel=r('.review-panel'),body=r('.panel-body'),footer=r('.review-bottom');return {separated:launch.bottom+10<=nav.top&&nav.bottom+10<=tools.top&&body.bottom<=footer.top+1,contained:launch.left>=panel.left&&launch.right<=panel.right&&footer.bottom<=panel.bottom+1};});assert.ok(layout.separated&&layout.contained,'Tree button has its own non-overlapping toolbar row at '+width);
  }
  await page.setViewportSize({width:1440,height:1000});
  const rootFen=await page.locator('#board').getAttribute('data-fen');
  const open=async()=>{await page.getByRole('button',{name:/View decision tree/}).click();await page.getByRole('dialog',{name:'Decision tree',exact:true}).waitFor();assert.equal(await page.locator('.tree-description').count(),0);};
  await open();await page.waitForFunction(()=>document.querySelectorAll('.tree-card').length===4);await checkMini();await checkDirection();
  await page.locator('.tree-children .tree-card').first().getByRole('button',{name:'Explore replies',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.tree-card').length===7);await checkMini();await checkDirection();
  assert.equal(await page.locator('.tree-metrics').count(),6);assert.equal(await page.locator('.tree-root .tree-metrics').count(),0);
  for(const metric of await page.locator('.tree-metrics').all()){assert.match((await metric.innerText()).replace(/\s+/g,' '),/Move accuracy: \d+\.\d%[\s\S]*Winning-chance loss: \d+\.\d pp/);assert.ok(await metric.evaluate(e=>e.scrollWidth<=e.clientWidth));}
  assert.equal(await page.locator('.tree-score').count(),0);assert.equal(await page.locator('.tree-odds').count(),6);
  for(const side of ['w','b']){const move=page.locator(`.tree-move[data-mover=${side}]`).first();assert.equal(await move.evaluate(e=>getComputedStyle(e).color),side==='w'?'rgb(255, 255, 255)':'rgb(17, 17, 17)');const card=move.locator('..').locator('..');assert.match(await card.innerText(),side==='w'?/White plays[\s\S]*Black replies next/:/Black plays[\s\S]*White replies next/);}
  assert.ok(await page.locator('.tree-odds').evaluateAll(bars=>bars.every(b=>{const r=b.getBoundingClientRect(),fill=b.firstElementChild;return r.height>r.width&&parseFloat(fill.style.height)>=0&&parseFloat(fill.style.height)<=100&&getComputedStyle(fill).backgroundColor==='rgb(255, 255, 255)'&&getComputedStyle(fill).bottom==='0px';})));
  await page.screenshot({path:'.scratch/decision-tree.png'});
  const first=page.locator('.tree-children .tree-card').first();await first.getByRole('button',{name:'Collapse',exact:true}).click();assert.equal(await page.locator('.tree-card').count(),4);
  await first.getByRole('button',{name:'Expand',exact:true}).click();assert.equal(await page.locator('.tree-card').count(),7);
  const deep=page.locator('.tree-children .tree-children .tree-node').first(),id=await deep.getAttribute('data-node'),b=new Chess(rootFen);for(const move of id.split('/').slice(1))b.move(move);
  await deep.locator(':scope > .tree-card').getByRole('button',{name:'Show on board',exact:true}).click();
  assert.equal(await page.locator('dialog').count(),0);assert.equal(await page.locator('#board').getAttribute('data-fen'),b.fen());await page.locator('#live-analysis[data-fen="'+b.fen()+'"]').waitFor();
  await open();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').count(),0);assert.equal(await page.locator('#board').getAttribute('data-fen'),b.fen());
  // Failed searches are retryable; closing aborts a pending request without changing the board.
  await page.route('**/api/tree',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Test retry'})}));
  await open();await page.getByRole('alert').filter({hasText:'Test retry'}).waitFor();await page.unroute('**/api/tree');await page.getByRole('button',{name:'Retry',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.tree-card').length===4);
  await page.mouse.click(2,2);assert.equal(await page.locator('dialog').count(),0);
  await page.setViewportSize({width:390,height:844});await open();await page.waitForFunction(()=>document.querySelectorAll('.tree-card').length===4);
  const rect=await page.locator('dialog').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=390);assert.ok(await page.locator('.tree-canvas').evaluate(e=>e.scrollWidth>e.clientWidth));
  await checkMini();await checkDirection();await page.screenshot({path:'.scratch/decision-tree-mobile.png'});await page.getByRole('button',{name:'Close decision tree',exact:true}).click();
  assert.equal((await page.request.post('http://127.0.0.1:8765/api/tree',{data:{initialFen:'bad',moves:[]}})).status(),400);
  await page.getByRole('button',{name:'Return to game',exact:true}).click();await page.getByRole('button',{name:'Last position',exact:true}).click();await open();await page.locator('.tree-terminal').filter({hasText:'Checkmate'}).waitFor();await checkMini();assert.equal(await page.locator('.tree-card').count(),1);await page.keyboard.press('Escape');
  // Concurrent/late requests must queue, not cancel another popup's active search.
  const simultaneous=await Promise.all([1,2].map(()=>page.request.post('http://127.0.0.1:8765/api/tree',{data:{initialFen:rootFen,moves:[]}})));for(const response of simultaneous){assert.equal(response.status(),200);assert.equal((await response.json()).candidates.length,3);}
  const live=await Promise.all([1,2].map(()=>page.request.post('http://127.0.0.1:8765/api/position',{data:{initialFen:rootFen,moves:[]}})));for(const response of live)assert.equal(response.status(),200);
  assert.deepEqual(errors,[]);console.log('PASS: native candidate tree, nested expansions, cached collapse/reopen, branch-to-board history, live analysis, Escape/outside dismissal, retries and mobile scrolling.');
 }catch(error){console.error('Tree failure:',{dialog:await page.locator('dialog').innerText().catch(()=>'(closed)'),errors});await page.screenshot({path:'.scratch/tree-failure.png'});throw error;}finally{await page.close();}
}
