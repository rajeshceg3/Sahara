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
 const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.setViewport({width,height:844});await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:motion}]);await p.goto(url);await p.waitForFunction(()=>!document.querySelector('#status'));await p.evaluate(()=>document.fonts.ready);if(motion!=='reduce')await p.click('#pause');
 for(const ch of JSON.parse(process.env.CHAPTERS||'[0,1,2,3]')){
 await p.click(`nav [data-chapter="${ch}"]`);await new Promise(r=>setTimeout(r,motion==='reduce'?200:2000));
 await p.mouse.move(width*.8,240);await p.mouse.down();await p.mouse.move(width*.2,310,{steps:10});await p.mouse.up();await p.click('#reset');await new Promise(r=>setTimeout(r,600));
 let s=await p.evaluate(()=>{const c=document.querySelector('canvas');return {yaw:+c.dataset.yaw,pitch:+c.dataset.pitch,ey:+c.dataset.entryYaw,ep:+c.dataset.entryPitch,chapter:+document.body.dataset.chapter,audio:document.querySelector('#sound').getAttribute('aria-pressed'),overflow:document.documentElement.scrollWidth>innerWidth,targets:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();return[r.width,r.height]}),labels:[...document.querySelectorAll('nav button,#line,.encounter,#compass')].map(e=>parseFloat(getComputedStyle(e).fontSize))}});
 assert.equal(s.chapter,ch);assert.ok(Math.abs(s.yaw-s.ey)<.001&&Math.abs(s.pitch-s.ep)<.001);assert.equal(s.audio,'false');assert.equal(s.overflow,false);assert.ok(s.targets.every(t=>t[0]>=44&&t[1]>=44));assert.ok(s.labels.every(f=>f>=16));await p.screenshot({path:`${out}/${width}-${motion}-${ch}.png`});
 await p.click('#encounter');assert.ok((await p.$eval('#encounter',e=>e.textContent)).includes('Return'));await p.screenshot({path:`${out}/${width}-${motion}-encounter${ch}.png`});await p.click('#encounter');assert.ok(!(await p.$eval('#encounter',e=>e.textContent)).includes('Return'));
 results.push({width,motion,ch,resetHeld:true,audioOff:true,targets:true,labels:true,encounter:true});
 }
 await p.click('nav [data-chapter="0"]');const r=await p.$eval('nav',e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width}});await p.mouse.move(r.x+r.w*.8,r.y+20);await p.mouse.down();await p.mouse.move(r.x+r.w*.2,r.y+20,{steps:10});await p.mouse.up();assert.equal(await p.$eval('body',e=>+e.dataset.chapter),1);
 await p.focus('nav [aria-current=true]');await p.keyboard.press('ArrowRight');assert.equal(await p.$eval('body',e=>+e.dataset.chapter),2);
 await p.click('#about');assert.equal(await p.$eval('dialog',e=>e.open),true);await p.keyboard.press('Escape');assert.equal(await p.$eval('dialog',e=>e.open),false);
 assert.deepEqual(errors,[]);await p.close();console.log('Passed',width,motion);fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
 }
}finally{await b?.close();server?.kill();}
