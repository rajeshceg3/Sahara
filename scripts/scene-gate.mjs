import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const out=process.env.OUT||'verification/gate';fs.mkdirSync(out,{recursive:true});
let server,b;const results=[];
try{
 const url=process.env.BASE_URL||'http://127.0.0.1:8793';
 if(!process.env.BASE_URL){server=spawn('python3',['-m','http.server','8793'],{stdio:'ignore'});for(let i=0;i<30;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}}
 b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--hide-scrollbars']});
 for(const width of JSON.parse(process.env.WIDTHS||'[320,390,1440]'))for(const motion of JSON.parse(process.env.MOTIONS||'["reduce","no-preference"]')){
 const p=await b.newPage();const errors=[];await p.evaluateOnNewDocument(()=>{try{localStorage.setItem('sahara-chrome-pin','1')}catch(e){}});p.on('pageerror',e=>errors.push(String(e)));await p.setViewport({width,height:844});await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:motion}]);await p.goto(url);await p.waitForFunction(()=>!document.querySelector('#status'));await p.evaluate(()=>document.fonts.ready);if(motion!=='reduce')await p.click('#pause');
 for(const ch of JSON.parse(process.env.CHAPTERS||'[0,1,2,3]')){
 await p.click(`nav [data-chapter="${ch}"]`);await new Promise(r=>setTimeout(r,motion==='reduce'?200:2000));
 await p.mouse.move(width*.8,240);await p.mouse.down();await p.mouse.move(width*.2,310,{steps:10});await p.mouse.up();await p.click('#reset');await new Promise(r=>setTimeout(r,600));
 let s=await p.evaluate(()=>{const c=document.querySelector('canvas');return {yaw:+c.dataset.yaw,pitch:+c.dataset.pitch,ey:+c.dataset.entryYaw,ep:+c.dataset.entryPitch,chapter:+document.body.dataset.chapter,audio:document.querySelector('#sound').getAttribute('aria-pressed'),overflow:document.documentElement.scrollWidth>innerWidth,targets:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();return[r.width,r.height]}),labels:[...document.querySelectorAll('nav button,#line,.encounter,#compass')].map(e=>parseFloat(getComputedStyle(e).fontSize))}});
 assert.equal(s.chapter,ch);assert.ok(Math.abs(s.yaw-s.ey)<.001&&Math.abs(s.pitch-s.ep)<.001);assert.equal(s.audio,'false');assert.equal(s.overflow,false);assert.ok(s.targets.every(t=>t[0]>=44&&t[1]>=44));assert.ok(s.labels.every(f=>f>=16));await p.screenshot({path:`${out}/${width}-${motion}-${ch}.png`});
 await p.click('#encounter');assert.ok((await p.$eval('#encounter',e=>e.textContent)).includes('Return'));await p.screenshot({path:`${out}/${width}-${motion}-encounter${ch}.png`});await p.click('#encounter');assert.ok(!(await p.$eval('#encounter',e=>e.textContent)).includes('Return'));
 results.push({width,motion,ch,resetHeld:true,audioOff:true,targets:true,labels:true,encounter:true});
 }
 await p.click('nav [data-chapter="0"]');const r=await p.$eval('nav',e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width}});await p.mouse.move(r.x+r.w*.8,r.y+20);await p.mouse.down();await p.mouse.move(r.x+r.w*.2,r.y+20,{steps:10});await p.mouse.up();await p.waitForFunction(()=>+document.body.dataset.chapter===1,{timeout:5000});
 await p.focus('nav [aria-current=true]');await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>+document.body.dataset.chapter===2,{timeout:5000});
 await p.click('#about');assert.equal(await p.$eval('dialog',e=>e.open),true);await p.keyboard.press('Escape');assert.equal(await p.$eval('dialog',e=>e.open),false);
 await p.close();
 {const q=await b.newPage();await q.bringToFront();await q.setViewport({width,height:844});await q.emulateMediaFeatures([{name:'prefers-reduced-motion',value:motion}]);await q.evaluateOnNewDocument(()=>{try{localStorage.removeItem('sahara-chrome-pin')}catch(e){}});await q.goto(url);await q.waitForFunction(()=>!document.querySelector('#status'));await q.evaluate(()=>{try{localStorage.removeItem('sahara-chrome-pin')}catch(e){}});
 await new Promise(r=>setTimeout(r,3400));
 assert.ok(await q.$('#chrome-hint'),'chrome retired and the caravan-star hint is showing');
 assert.equal(await q.$eval('header',e=>getComputedStyle(e).visibility),'hidden','toolbar retired');
 assert.equal(await q.$eval('.crossing',e=>getComputedStyle(e).visibility),'hidden','crossing retired');
 assert.ok(await q.$eval('.story',e=>getComputedStyle(e).visibility==='visible'),'story note stays');
 await q.screenshot({path:`${out}/${width}-${motion}-quiet.png`});
 // touch-tap the hint star (real CDP touch: the way phones wake the chrome)
 const hc=await q.$eval('#chrome-hint',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 const cdp=await q.createCDPSession();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hc.x,y:hc.y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 // Focus the pin in the same breath as the tap: focus-within then holds the
 // woken chrome, so slow software-rendered CI frames cannot race the 2.6s
 // retire. One round-trip, no sleeps, with one tap-and-focus retry.
 let st;
 for(let tries=0;tries<2;tries++){
   st=await q.evaluate(()=>{document.querySelector('#pin').focus();return {ae:document.activeElement&&document.activeElement.id,vis:getComputedStyle(document.querySelector('header')).visibility,pr:document.querySelector('#pin').getAttribute('aria-pressed')}});
   if(st.ae==='pin'&&st.vis==='visible')break;
   const hc2=await q.$eval('#chrome-hint',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hc2.x,y:hc2.y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 assert.equal(st.vis,'visible','hint woke the controls');
 assert.equal(st.ae,'pin','pin focused');
 assert.equal(st.pr,'false');
 // layout hit-test: the pin cairn really is the topmost target at its centre
 assert.ok(['svg','path','BUTTON'].includes(await q.evaluate(()=>{const b=document.querySelector('#pin');const r=b.getBoundingClientRect();const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return t?(t.id||t.tagName):'none'})),'pin is the hit target at its centre');
 await q.keyboard.press('Enter');await new Promise(r=>setTimeout(r,150));
 assert.equal(await q.$eval('#pin',e=>e.getAttribute('aria-pressed')),'true','pin toggled on');
 await new Promise(r=>setTimeout(r,3200));
 assert.equal(await q.$eval('header',e=>getComputedStyle(e).visibility),'visible','pin holds the controls');
 await q.screenshot({path:`${out}/${width}-${motion}-pinned.png`});
 await q.close();}
 console.log('Passed',width,motion);fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
 }
}finally{await b?.close();server?.kill();}
