import * as T from './three.module.min.js';
import { createSoundscape } from './soundscape/soundscape-engine.js';
import soundProgram from './soundscape/soundscape-program.js';
const $=s=>document.querySelector(s), canvas=$('#desert');
let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){$('#fallback').style.display='block';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene(), camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.12,1600);scene.background=new T.Color('#e9b98c');scene.fog=new T.FogExp2('#ecc39a',.0016);
const hemi=new T.HemisphereLight(0xffe2c4,0x7a5238,1.5);scene.add(hemi);
const sunlight=new T.DirectionalLight(0xffc08a,2.4);sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);
Object.assign(sunlight.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:500});sunlight.shadow.bias=-0.0006;sunlight.shadow.normalBias=.4;
scene.add(sunlight);scene.add(sunlight.target);
let seed=311;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646},range=(a,b)=>a+(b-a)*rand();
const mat=(color,roughness=.92,flat=true)=>new T.MeshStandardMaterial({color,roughness,flatShading:flat});
// Sky dome: vertical gradient plus a sun-side glow, lerped per chapter.
const skyU={top:{value:new T.Color('#8fb4d6')},hor:{value:new T.Color('#f7c489')},sunDir:{value:new T.Vector3(.92,.14,.22)},glow:{value:new T.Color('#ffb36b')},glowAmt:{value:1.1}};
const skyDome=new T.Mesh(new T.SphereGeometry(980,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:skyU,vertexShader:`varying vec3 vd;void main(){vd=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vd;uniform vec3 top,hor,glow,sunDir;uniform float glowAmt;void main(){vec3 d=normalize(vd);vec3 col=mix(hor,top,pow(max(d.y,0.),.55));float s=max(dot(d,normalize(sunDir)),0.);col+=glow*(pow(s,18.)*.9+pow(s,3.)*.22)*glowAmt;gl_FragColor=vec4(col,1.);}`}));
skyDome.frustumCulled=false;const skyRig=new T.Group();skyRig.add(skyDome);scene.add(skyRig);
// Dune field: sinuous sharp-crested ridge families over a broad swell, with an oasis basin.
function ridge(t){t=t-Math.floor(t);return Math.pow(Math.sin(Math.PI*Math.pow(t,.72)),1.15);}
function dune(x,z){
const u1=(x*.94+z*.34)*.016+.55*Math.sin(z*.006+1.3)+.3*Math.sin(x*.004);
const u2=(x*.5-z*.86)*.011+.5*Math.sin(x*.005+4.0);
const dx0=x-58,dz0=z-42,of=1-.8*Math.exp(-(dx0*dx0+dz0*dz0)/(2*30*30));let h=(11*ridge(u1)+6.5*ridge(u2))*of;
h+=7*Math.sin(x*.0042+1.0)*Math.sin(z*.0037+2.0);
h+=.35*Math.sin(x*.35+Math.sin(z*.3))*Math.sin(z*.31);
h+=16*Math.exp(-((z+128)*(z+128))/(2*45*45))*(.75+.25*Math.sin(x*.012));
const dx=dx0,dz=dz0;h-=6*Math.exp(-(dx*dx+dz*dz)/(2*20*20));
return h;}
const geo=new T.PlaneGeometry(760,760,320,320);geo.rotateX(-Math.PI/2);
{const p=geo.attributes.position;let hmin=1e9,hmax=-1e9;const hs=new Float32Array(p.count);
for(let i=0;i<p.count;i++){const h=dune(p.getX(i),p.getZ(i));hs[i]=h;p.setY(i,h);if(h<hmin)hmin=h;if(h>hmax)hmax=h;}
geo.computeVertexNormals();const n=geo.attributes.normal,colors=new Float32Array(p.count*3);
const base=new T.Color('#e2a869'),dark=new T.Color('#9c6a38'),light=new T.Color('#f7e0ae'),c=new T.Color();
for(let i=0;i<p.count;i++){const t=(hs[i]-hmin)/(hmax-hmin),ny=n.getY(i);
c.copy(base).lerp(dark,Math.min(.72,Math.max(0,(1-ny)*2.4)));
c.lerp(light,Math.max(0,Math.min(1,(t-.55)*2.2))*.7);
const v2=1+.05*Math.sin(p.getX(i)*.02)*Math.sin(p.getZ(i)*.017);
colors[i*3]=c.r*v2;colors[i*3+1]=c.g*v2;colors[i*3+2]=c.b*v2;}
geo.setAttribute('color',new T.BufferAttribute(colors,3));}
const sandMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.96});
const floor=new T.Mesh(geo,sandMat);floor.receiveShadow=true;scene.add(floor);
const dummy=new T.Object3D(),v=(x,y,z)=>new T.Vector3(x,y,z),up=v(0,1,0);
const batches={};function inst(key,geoI,color,max=3000){if(!batches[key]){const mesh=new T.InstancedMesh(geoI,mat(color),max);mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=true;scene.add(mesh);batches[key]=mesh;}return batches[key];}
function stamp(key,geoI,color,p,s,rot){const b=inst(key,geoI,color);dummy.position.copy(p);dummy.scale.copy(s);dummy.quaternion.copy(rot||new T.Quaternion());dummy.updateMatrix();b.setMatrixAt(b.count++,dummy.matrix);}
// Scattered stone and dry shrubs on the regs between dunes.
const rockGeo=new T.IcosahedronGeometry(1,0),shrubGeo=new T.ConeGeometry(.5,1.1,5);
for(let i=0;i<110;i++){const a=range(0,6.28),r=range(18,150),x=Math.sin(a)*r,z=Math.cos(a)*r,s=range(.3,1.4);stamp('rock',rockGeo,i%3?'#8a6a4c':'#6e5238',v(x,dune(x,z)-s*.35,z),v(s*1.3,s*.7,s),new T.Quaternion().setFromEuler(new T.Euler(range(0,3),range(0,3),range(0,3))));}
for(let i=0;i<90;i++){const a=range(0,6.28),r=range(24,150),x=Math.sin(a)*r,z=Math.cos(a)*r,s=range(.35,.8);for(let k=0;k<3;k++){stamp('shrub',shrubGeo,k?'#7d6b3f':'#6b5c33',v(x+range(-.4,.4),dune(x,z)+.3*s,z+range(-.4,.4)),v(s,s*range(.8,1.3),s),new T.Quaternion().setFromEuler(new T.Euler(range(-.3,.3),range(0,6),range(-.3,.3))));}}
// The oasis: a pool, a ring of true date palms, tall grass.
const oasisC=v(58,0,42);oasisC.y=dune(oasisC.x,oasisC.z);
const pool=new T.Mesh(new T.CircleGeometry(8.5,40),new T.ShaderMaterial({transparent:true,uniforms:{time:{value:0},night:{value:0}},vertexShader:`varying vec3 w;void main(){w=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 w;uniform float time;uniform float night;void main(){float q=sin(w.x*1.3+time*.9)*sin(w.z*1.6+time*.7);float c=pow(max(0.,q),3.);vec3 day=mix(vec3(.24,.48,.47),vec3(.62,.85,.78),c*.5+.15);vec3 nit=mix(vec3(.03,.06,.13),vec3(.25,.34,.52),c*.6);gl_FragColor=vec4(mix(day,nit,night),.96);}`}));pool.rotation.x=-Math.PI/2;pool.position.copy(oasisC).add(v(0,.35,0));scene.add(pool);
// Date palms merged into one mesh: bent ringed trunks, arcing V-folded fronds, dead-frond skirts, date clusters.
{const P=[],Cc=[],I=[];let vi=0;const tc=new T.Color(),tc2=new T.Color();
const pushV=(p,c)=>{P.push(p.x,p.y,p.z);Cc.push(c.r,c.g,c.b);return vi++;};
function addGeo(g,m4,color){const pa=g.attributes.position,nv=pa.count,base=vi,ve=new T.Vector3();tc.set(color);for(let i=0;i<nv;i++){ve.fromBufferAttribute(pa,i).applyMatrix4(m4);pushV(ve,tc);}const ia=g.index;if(ia)for(let i=0;i<ia.count;i++)I.push(base+ia.getX(i));else for(let i=0;i<nv;i++)I.push(base+i);}
function frond(top,yaw0,e0,droopK,L,w0,c0,c1){
const S=8,dx=Math.cos(yaw0),dz=Math.sin(yaw0),px=-dz,pz=dx,rows=[];
for(let s=0;s<=S;s++){const t=s/S,along=L*t*Math.cos(e0*.5);
const cy=top.y+L*(Math.sin(e0)*t-droopK*t*t),cx=top.x+dx*along,cz=top.z+dz*along,w=w0*(1-t*.82);
tc.copy(c0).lerp(c1,t);tc2.copy(tc).multiplyScalar(.88);
const row={L:pushV(v(cx+px*w,cy-w*.5,cz+pz*w),tc2),C:pushV(v(cx,cy,cz),tc),R:pushV(v(cx-px*w,cy-w*.5,cz-pz*w),tc2)};rows.push(row);}
for(let s=0;s<S;s++){const a=rows[s],b=rows[s+1];I.push(a.L,b.L,a.C,b.L,b.C,a.C,a.C,b.C,a.R,b.C,b.R,a.R);}}
function palm(x,z,h,leanA,leanAmt,sd){
const rings=7,sides=6;let prev=null;
for(let r=0;r<=rings;r++){const t=r/rings,cx=x+Math.cos(leanA)*leanAmt*t*t*h,cz=z+Math.sin(leanA)*leanAmt*t*t*h,y=t*h,rad=(.3-.16*t)*(1+.13*Math.sin(t*23+sd*7)),ring=[];
for(let s=0;s<sides;s++){const a=s/sides*Math.PI*2;tc.setHSL(.07,.35,.26+.08*Math.sin(t*23+sd*7+s*1.7));ring.push(pushV(v(cx+Math.cos(a)*rad,y,cz+Math.sin(a)*rad),tc));}
if(prev)for(let s=0;s<sides;s++){const s2=(s+1)%sides;I.push(prev[s],prev[s2],ring[s],prev[s2],ring[s2],ring[s]);}prev=ring;}
const top=v(x+Math.cos(leanA)*leanAmt*h,h,z+Math.sin(leanA)*leanAmt*h),g0=new T.Color('#2e5c2a'),g1=new T.Color('#6f9a3f'),b0=new T.Color('#7a5a30'),b1=new T.Color('#54401e');
for(let j=0;j<14;j++){const yaw=j*2.4+sd,tier=j%3;
frond(top,yaw,tier===0?1.15:tier===1?.55:.05,tier===0?.15:tier===1?.5:.95,(2.4+1.0*rand())*(h/4.4),.3,g0,g1);}
for(let j=0;j<6;j++)frond(top,j/6*6.28+sd+.4,-.5,.9,1.4,.22,b0,b1);
if(rand()<.65){const m=new T.Matrix4();for(let d=0;d<6;d++){const a=range(0,6.28),rr=range(.1,.3);m.makeTranslation(top.x+Math.cos(a)*rr,top.y-range(.1,.5),top.z+Math.sin(a)*rr);addGeo(new T.OctahedronGeometry(.1,0),m,'#c8781e');}}}
for(let i=0;i<10;i++){const a=i/10*6.28+range(-.2,.2),r=range(10.5,15),x=oasisC.x+Math.sin(a)*r,z=oasisC.z+Math.cos(a)*r;
palm(x,z,range(3.4,5.2),range(0,6.28),range(.06,.16),range(0,6.28));}
palm(52,38,5.5,Math.atan2(42-38,58-52),.22,3.3);
const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(new Float32Array(P),3));pg.setAttribute('color',new T.BufferAttribute(new Float32Array(Cc),3));pg.setIndex(I);pg.computeVertexNormals();
const palms=new T.Mesh(pg,new T.MeshStandardMaterial({vertexColors:true,roughness:.9,side:T.DoubleSide}));palms.castShadow=true;scene.add(palms);}
const grassTufts=new T.InstancedMesh(new T.ConeGeometry(.07,.9,3),mat('#4a6a33'),420);grassTufts.count=420;for(let i=0;i<420;i++){const a=range(0,6.28),r=range(8.6,13.5),x=oasisC.x+Math.sin(a)*r,z=oasisC.z+Math.cos(a)*r;dummy.position.set(x,dune(x,z)+.25,z);dummy.scale.setScalar(range(.4,.9));dummy.rotation.set(range(-.2,.2),range(0,6.28),range(-.2,.2));dummy.updateMatrix();grassTufts.setMatrixAt(i,dummy.matrix);}scene.add(grassTufts);
// Sun, halo, moon, stars, and the Milky Way band.
const sunMat=new T.MeshBasicMaterial({color:0xfff2d0,fog:false,transparent:true});const sun=new T.Mesh(new T.CircleGeometry(40,32),sunMat);skyRig.add(sun);
const halo=new T.Mesh(new T.CircleGeometry(110,32),new T.MeshBasicMaterial({color:0xffe2b0,fog:false,transparent:true,opacity:.22,depthWrite:false}));skyRig.add(halo);
const moon=new T.Mesh(new T.CircleGeometry(22,32),new T.MeshBasicMaterial({color:0xe8ecff,fog:false,transparent:true,opacity:0}));skyRig.add(moon);
const starGeo=new T.BufferGeometry(),starPos=new Float32Array(1100*3);for(let i=0;i<1100;i++){const a=range(0,6.28),e=range(.08,1.5),r=900;starPos[i*3]=Math.cos(a)*Math.cos(e)*r;starPos[i*3+1]=Math.sin(e)*r;starPos[i*3+2]=Math.sin(a)*Math.cos(e)*r;}starGeo.setAttribute('position',new T.BufferAttribute(starPos,3));const stars=new T.Points(starGeo,new T.PointsMaterial({color:0xdfe8ff,size:1.5,transparent:true,opacity:0,fog:false,depthWrite:false,sizeAttenuation:false}));skyRig.add(stars);
{const mn=v(.25,1,.35).normalize(),b1=v(0,0,0).crossVectors(mn,v(0,0,1)).normalize(),b2=v(0,0,0).crossVectors(mn,b1).normalize();
const mwN=1500,mwPos=new Float32Array(mwN*3),mwCol=new Float32Array(mwN*3),ca=new T.Color(),cb=new T.Color('#cfd8f8'),cc=new T.Color('#f8e8d0');
for(let i=0;i<mwN;i++){const u=range(0,6.28),g=(rand()+rand()+rand()-1.5)*.16;
const p=v(0,0,0).copy(b1).multiplyScalar(Math.cos(u)).addScaledVector(b2,Math.sin(u)).addScaledVector(mn,g).normalize().multiplyScalar(940);
mwPos[i*3]=p.x;mwPos[i*3+1]=p.y;mwPos[i*3+2]=p.z;ca.copy(cb).lerp(cc,rand()).multiplyScalar(range(.5,1));mwCol[i*3]=ca.r;mwCol[i*3+1]=ca.g;mwCol[i*3+2]=ca.b;}
const mwGeo=new T.BufferGeometry();mwGeo.setAttribute('position',new T.BufferAttribute(mwPos,3));mwGeo.setAttribute('color',new T.BufferAttribute(mwCol,3));
const milky=new T.Points(mwGeo,new T.PointsMaterial({vertexColors:true,size:1.7,transparent:true,opacity:0,fog:false,depthWrite:false,sizeAttenuation:false}));milky.userData.isMilky=true;skyRig.add(milky);}
// Heat mirage for the white hour.
const mirage=new T.Mesh(new T.PlaneGeometry(240,9),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},amt:{value:0}},vertexShader:`varying vec2 uv2;void main(){uv2=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 uv2;uniform float time;uniform float amt;void main(){float w=sin(uv2.x*90.+time*2.2)*.5+sin(uv2.x*31.-time*1.3)*.5;float a=(.16+.1*w)*(1.-abs(uv2.y-.5)*1.7)*amt;gl_FragColor=vec4(.82,.9,.95,max(0.,a));}`}));mirage.position.set(0,5,-150);scene.add(mirage);
// Wind-blown sand streaks.
const streakGeo=new T.BufferGeometry(),streakPos=new Float32Array(240*3),streakBase=new Float32Array(240);for(let i=0;i<240;i++){streakBase[i]=range(-70,70);streakPos[i*3]=streakBase[i];streakPos[i*3+1]=range(.2,3.2);streakPos[i*3+2]=range(-70,70);}streakGeo.setAttribute('position',new T.BufferAttribute(streakPos,3));const streaks=new T.Points(streakGeo,new T.PointsMaterial({color:0xf2d9a8,size:.5,transparent:true,opacity:.35,depthWrite:false}));scene.add(streaks);
function mesh(g,material,pos,scale,parent){const o=new T.Mesh(g,material);o.position.copy(pos);o.scale.copy(scale);o.castShadow=true;parent.add(o);return o;}
const eyeMat=mat('#241505');
const animals=[];
// Living creatures, rebuilt part by part against field references (see verification/README.md).
function paint(geo,fn){const p=geo.attributes.position,n=p.count,col=new Float32Array(n*3),c=new T.Color(),q=new T.Vector3();for(let i=0;i<n;i++){q.fromBufferAttribute(p,i);fn(q,c,i);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}geo.setAttribute('color',new T.BufferAttribute(col,3));return geo;}
function mergeParts(parts){const Ps=[],Ns=[],Cs=[],vs=new T.Vector3(),ns=new T.Vector3(),nm=new T.Matrix3(),cc=new T.Color();
for(const part of parts){const g=part.geo.index?part.geo.toNonIndexed():part.geo.clone();const p=g.attributes.position,n2=g.attributes.normal;nm.getNormalMatrix(part.m);
for(let i=0;i<p.count;i++){vs.fromBufferAttribute(p,i).applyMatrix4(part.m);Ps.push(vs.x,vs.y,vs.z);ns.fromBufferAttribute(n2,i).applyMatrix3(nm).normalize();Ns.push(ns.x,ns.y,ns.z);
if(typeof part.c==='function')part.c(vs,cc,i);else if(part.c!=null)cc.set(part.c);else if(g.attributes.color)cc.setRGB(g.attributes.color.getX(i),g.attributes.color.getY(i),g.attributes.color.getZ(i));else cc.set('#ffffff');Cs.push(cc.r,cc.g,cc.b);}}
const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(new Float32Array(Ps),3));out.setAttribute('normal',new T.BufferAttribute(new Float32Array(Ns),3));out.setAttribute('color',new T.BufferAttribute(new Float32Array(Cs),3));return out;}
const M4=(x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>new T.Matrix4().compose(v(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),v(sx,sy,sz));
function taperTube(pts,rFn,sides=9){const curve=new T.CatmullRomCurve3(pts);const segs=Math.max(10,pts.length*5);const frames=curve.computeFrenetFrames(segs,false);const P=[],N=[],I=[];
for(let i=0;i<=segs;i++){const t=i/segs,c=curve.getPoint(t),r=rFn(t),nrm=frames.normals[i],bin=frames.binormals[i];
for(let s=0;s<sides;s++){const a=s/sides*Math.PI*2,nx=Math.cos(a),ny=Math.sin(a);
P.push(c.x+(nrm.x*nx+bin.x*ny)*r,c.y+(nrm.y*nx+bin.y*ny)*r,c.z+(nrm.z*nx+bin.z*ny)*r);
N.push(nrm.x*nx+bin.x*ny,nrm.y*nx+bin.y*ny,nrm.z*nx+bin.z*ny);}}
for(let i=0;i<segs;i++)for(let s=0;s<sides;s++){const a=i*sides+s,b=i*sides+(s+1)%sides,c2=(i+1)*sides+s,d=(i+1)*sides+(s+1)%sides;I.push(a,c2,b,b,c2,d);}
const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(P),3));g.setAttribute('normal',new T.BufferAttribute(new Float32Array(N),3));g.setIndex(I);return g;}
function furTex(streak,alpha=.12,strokes=1100){const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,128,128);x.strokeStyle=streak;x.lineWidth=.8;for(let i=0;i<strokes;i++){x.globalAlpha=alpha*(.4+Math.random());const px=Math.random()*128,py=Math.random()*128,l=2+Math.random()*4,a=Math.PI/2+(Math.random()-.5)*.8;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke();}const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
function featherGeo(len,wid){const s=new T.Shape();s.moveTo(len*.08,-wid*.30);s.quadraticCurveTo(-len*.30,-wid*.62,-len*.70,-wid*.46);s.quadraticCurveTo(-len*.96,-wid*.28,-len,0);s.quadraticCurveTo(-len*.96,wid*.28,-len*.70,wid*.46);s.quadraticCurveTo(-len*.30,wid*.62,len*.08,wid*.30);s.quadraticCurveTo(len*.16,0,len*.08,-wid*.30);const g=new T.ShapeGeometry(s,5);g.rotateX(-Math.PI/2);return g;}
function strandTex(streak,alpha=.5,strokes=1500){const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,128,128);x.strokeStyle=streak;x.lineWidth=.9;for(let i=0;i<strokes;i++){x.globalAlpha=alpha*(.4+Math.random());const px=Math.random()*128,py=Math.random()*128,l=2.5+Math.random()*5,a=Math.PI/2+(Math.random()-.5)*.9;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke();}const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
const creatureMat=(rough=.9,map=null,extra={})=>new T.MeshStandardMaterial(Object.assign({vertexColors:true,map,roughness:rough},extra));
// Coat references: wild dromedary - tawny flank, darker woolly hump crest, pale legs and belly.
const C_BACK='#9a6b3f',C_FLANK='#b08254',C_BELLY='#cfa773',C_LEG='#c19b6b',C_WOOL='#6e4a2a',C_MUZZLE='#6e4a2e',C_EYE='#241505',C_HI='#ffffff';
function headCoat(q,c){c.set(C_FLANK);c.lerp(new T.Color(C_WOOL),T.MathUtils.clamp((q.y-.02)/.16,0,.8));c.lerp(new T.Color(C_MUZZLE),T.MathUtils.clamp((q.x-.18)/.15,0,1)*T.MathUtils.clamp((-q.y)/.1,0,1)*.6);}
function coat(q,c){c.set(C_BELLY).lerp(new T.Color(C_FLANK),T.MathUtils.clamp((q.y-1.0)/.7,0,1));c.lerp(new T.Color(C_BACK),T.MathUtils.clamp((q.y-1.55)/.5,0,1));
const hx=(q.x+.08)/.34;if(q.y>1.85)c.lerp(new T.Color(C_WOOL),Math.min(1,(q.y-1.85)*3)*Math.exp(-hx*hx));}
function camelBodyGeo(){const geo=new T.SphereGeometry(1,30,22);const p=geo.attributes.position;
for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);x*=1.22;y*=.70;z*=.50;
y+=Math.exp(-(((x+.08)/.34)**2))*Math.max(0,y)*.55;
y+=Math.exp(-(((x-.78)/.3)**2))*Math.max(0,y)*.16;
y-=Math.exp(-(((x+1.1)/.28)**2))*Math.max(0,y)*.20;
y-=Math.exp(-(((x-.9)/.22)**2))*Math.max(0,-y)*.30;
y-=.05*Math.exp(-((x/.7)**2))*Math.max(0,-y+.2);
z*=1-.10*Math.exp(-(((x+1.05)/.3)**2));
p.setXYZ(i,x,y+1.62,z);}
geo.computeVertexNormals();return paint(geo,coat);}
function makeCamel(blanket){const g=new T.Group();
const neck=paint(taperTube([v(.78,1.42,0),v(1.10,1.50,0),v(1.34,1.90,0),v(1.47,2.22,0)],t=>.005+.21*(1-t)+.02*Math.sin(t*9),9),coat);
const mane=paint(taperTube([v(.90,1.75,0),v(1.18,1.82,0),v(1.38,2.12,0),v(1.47,2.30,0)],t=>.03*(1-t*.6),7),function(q,c){c.set(C_WOOL);});
mane.scale(.55,1,1);
const beard=paint(taperTube([v(1.16,1.52,0),v(1.36,1.72,0),v(1.46,2.00,0)],t=>.038*(1-t*.5),7),function(q,c){c.set(C_WOOL);});
beard.scale(.6,1,1);
const body=mergeParts([{geo:new T.SphereGeometry(1,8,6),m:M4(-.08,2.32,0,.38,.05,.08),c:C_WOOL},{geo:camelBodyGeo(),m:M4(0,0,0),c:null},{geo:neck,m:M4(0,0,0),c:null},{geo:mane,m:M4(0,0,0),c:null},{geo:beard,m:M4(0,0,0),c:null}]);
const bodyMesh=new T.Mesh(body,camelMatGlobal);bodyMesh.castShadow=true;g.add(bodyMesh);
// Head: cranium, long downturned muzzle, split-lip shading, nostrils, lashed eyes, small ears, forelock.
const headG=new T.Group();headG.position.set(1.47,2.20,0);
const headGeo=mergeParts([
{geo:new T.SphereGeometry(1,20,15),m:M4(.08,0,0,.20,.155,.135),c:headCoat},
{geo:paint(taperTube([v(.14,-.02,0),v(.37,-.05,0),v(.52,-.13,0)],t=>.082-.032*t,8),(q,c)=>{c.set(C_FLANK).lerp(new T.Color(C_MUZZLE),T.MathUtils.clamp((q.x-.30)/.18,0,1));}),m:M4(0,0,0),c:null},
{geo:new T.SphereGeometry(1,8,6),m:M4(.28,-.125,0,.15,.055,.085),c:C_MUZZLE},
{geo:new T.SphereGeometry(.014,6,5),m:M4(.50,-.09,.038),c:C_EYE},
{geo:new T.SphereGeometry(.014,6,5),m:M4(.50,-.09,-.038),c:C_EYE},
{geo:new T.SphereGeometry(1,8,6),m:M4(-.01,.135,0,.075,.05,.085),c:C_WOOL},
{geo:new T.SphereGeometry(1,7,5),m:M4(-.03,.135,.10,.05,.085,.032,.4,.3,.5),c:C_FLANK},
{geo:new T.SphereGeometry(1,7,5),m:M4(-.03,.135,-.10,.05,.085,.032,-.4,-.3,.5),c:C_FLANK}]);
const headMesh=new T.Mesh(headGeo,camelMatGlobal);headMesh.castShadow=true;headG.add(headMesh);
for(const s of[-1,1]){const eye=mesh(new T.SphereGeometry(.033,8,6),eyeMat,v(.095,.05,s*.128),v(1,1,1),headG);paint(eye.geometry,(q,c)=>c.set(C_EYE));const hi=mesh(new T.SphereGeometry(.011,5,4),new T.MeshBasicMaterial({color:0xffffff}),v(.11,.068,s*.138),v(1,1,1),headG);hi.castShadow=false;}
g.add(headG);
// Legs: thigh, knee/hock callus, cannon, two-toed pad.
function leg(front,side){const hipX=front?.62:-.66,hipY=front?1.42:1.46,z=side*(front?.30:.28);
const legG=new T.Group();legG.position.set(hipX,hipY,z);
const upLen=hipY-(front?.82:.80);
const up=mergeParts([
{geo:new T.CylinderGeometry(front?.105:.13,front?.082:.10,upLen,8),m:M4(0,-upLen/2,0),c:function(q,c){c.set(front?C_FLANK:C_BACK).lerp(new T.Color(C_BELLY),.3);}},
front?{geo:new T.SphereGeometry(1,7,6),m:M4(0,-.16,0,.11,.18,.10),c:C_FLANK}:{geo:new T.SphereGeometry(1,8,6),m:M4(-.02,-.16,0,.17,.28,.135),c:C_BACK}]);
const upMesh=new T.Mesh(up,camelMatGlobal);upMesh.castShadow=true;legG.add(upMesh);
const kneeG=new T.Group();kneeG.position.set(front?.02:-.05,-upLen,0);
const low=mergeParts([
{geo:new T.SphereGeometry(front?.085:.10,8,6),m:M4(0,0,0),c:'#8a5f3a'},
{geo:new T.CylinderGeometry(.070,.056,.60,7),m:M4(front?.02:.02,-.31,0),c:C_LEG},
{geo:new T.SphereGeometry(1,8,6),m:M4(front?.06:.04,-.615,0,.145,.055,.115),c:C_LEG},
{geo:new T.SphereGeometry(1,6,5),m:M4(front?.13:.11,-.63,.034,.05,.034,.034),c:'#a8855c'},
{geo:new T.SphereGeometry(1,6,5),m:M4(front?.13:.11,-.63,-.034,.05,.034,.034),c:'#a8855c'}]);
const lowMesh=new T.Mesh(low,camelMatGlobal);lowMesh.castShadow=true;kneeG.add(lowMesh);legG.add(kneeG);g.add(legG);return{legG,kneeG};}
const legs=[leg(true,1),leg(true,-1),leg(false,1),leg(false,-1)];
// Tail with dark tuft.
const tailG=new T.Group();tailG.position.set(-1.16,1.80,0);
const tailGeo=mergeParts([
{geo:paint(taperTube([v(0,0,0),v(-.07,-.38,.01),v(-.03,-.70,0)],t=>.028*(1-t*.6),6),(q,c)=>c.set(C_BACK)),m:M4(0,0,0),c:null},
{geo:new T.ConeGeometry(.045,.20,6),m:M4(-.03,-.80,0,1,1,1,Math.PI),c:'#5e3f22'}]);
const tailMesh=new T.Mesh(tailGeo,camelMatGlobal);tailMesh.castShadow=true;tailG.add(tailMesh);g.add(tailG);
// Woven blanket with tassel hem, girth rope and saddle roll.
const bcol=new T.Color(blanket);
const shell=new T.CylinderGeometry(.85,.92,1.10,14,1,true,-Math.PI*.46,Math.PI*.92);shell.rotateZ(Math.PI/2);
const blanketParts=[{geo:paint(shell,(q,c)=>{c.copy(bcol);if(Math.abs(q.z)>.42||Math.abs(q.x+.1)>.42)c.multiplyScalar(.55);}),m:M4(-.14,1.80,0,1,.88,1.04),c:null},
{geo:new T.TorusGeometry(.66,.016,5,20),m:M4(-.14,1.62,0,1,1.05,1,0,0,0),c:'#4a3018'},
{geo:new T.CylinderGeometry(.065,.065,.5,7),m:M4(-.14,2.22,0,1,1,1,Math.PI/2,0,0),c:new T.Color(blanket).multiplyScalar(.7).getStyle()}];
for(let k=0;k<9;k++){const bx=-.14-.46+k*.115;for(const s of[-1,1])blanketParts.push({geo:new T.ConeGeometry(.02,.075,4),m:M4(bx,1.06,s*.65,1,1,1,Math.PI),c:'#d9c49a'});}
const blanketMesh=new T.Mesh(mergeParts(blanketParts),new T.MeshStandardMaterial({vertexColors:true,roughness:.85,side:T.DoubleSide}));blanketMesh.castShadow=true;g.add(blanketMesh);
g.scale.setScalar(.9);g.userData.kind='caravan';g.userData.legs=legs;g.userData.head=headG;g.userData.tail=tailG;return g;}
const camelMatGlobal=creatureMat(.9,furTex('#7a5636',.16,1500));
const camels=[];const blankets=['#a8442f','#2f5a8a','#b8862f','#6a3a8a'];
for(let i=0;i<4;i++){const c=makeCamel(blankets[i]);c.scale.multiplyScalar(range(1.0,1.15));scene.add(c);camels.push(c);animals.push(c);}
const caraC=v(14,0,-20),caraR=14;
// Lead ropes between consecutive camels, recomputed each frame with a natural sag.
const ROPES=3,ROPE_RINGS=9,ROPE_SIDES=5,ropes=[];
for(let i=0;i<ROPES;i++){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array((ROPE_RINGS+1)*ROPE_SIDES*3),3));const idx=[];for(let r2=0;r2<ROPE_RINGS;r2++)for(let s=0;s<ROPE_SIDES;s++){const a=r2*ROPE_SIDES+s,b=r2*ROPE_SIDES+(s+1)%ROPE_SIDES,c2=(r2+1)*ROPE_SIDES+s,d=(r2+1)*ROPE_SIDES+(s+1)%ROPE_SIDES;idx.push(a,c2,b,b,c2,d);}geo.setIndex(idx);const rm=new T.Mesh(geo,mat('#7a5a38',.9,false));rm.frustumCulled=false;scene.add(rm);ropes.push(rm);}
const _ra=v(0,0,0),_rb=v(0,0,0),_rm=v(0,0,0),_rt=v(0,0,0),_rs=v(0,0,0),_ru=v(0,0,0);
function ropeUpdate(rm,a,b,sag){const pos=rm.geometry.attributes.position;
for(let r2=0;r2<=ROPE_RINGS;r2++){const t=r2/ROPE_RINGS;_rm.lerpVectors(a,b,t);_rm.y-=sag*4*t*(1-t);
_rt.subVectors(b,a).normalize();_rs.crossVectors(up,_rt).normalize();if(_rs.lengthSq()<.01)_rs.set(1,0,0);_ru.crossVectors(_rt,_rs).normalize();
for(let s=0;s<ROPE_SIDES;s++){const an=s/ROPE_SIDES*Math.PI*2;pos.setXYZ(r2*ROPE_SIDES+s,_rm.x+(_rs.x*Math.cos(an)+_ru.x*Math.sin(an))*.014,_rm.y+(_rs.y*Math.cos(an)+_ru.y*Math.sin(an))*.014,_rm.z+(_rs.z*Math.cos(an)+_ru.z*Math.sin(an))*.014);}}
pos.needsUpdate=true;rm.geometry.computeVertexNormals();}
// The sandfish: a banded, glossy skink that swims beneath the loose sand.
const skink=new T.Group();
const skinkBody=paint(taperTube([v(.58,.01,0),v(.34,.03,.025),v(0,.045,-.02),v(-.30,.02,.02),v(-.52,0,0),v(-.68,-.01,0)],t=>.004+.095*Math.pow(Math.sin(Math.PI*Math.min(1,.06+t*1.02)),.8),10),(q,c)=>{
if(q.y<-.01){c.set('#ecdfc4');return;}
if(q.x>.40){c.set('#6a5138');return;}
const band=Math.floor((q.x+.7)/.15);c.set(band%2?'#d8a83c':'#463018');c.lerp(new T.Color('#ecdfc4'),T.MathUtils.clamp((-q.y)*8,0,.8));});
const skinkMesh=new T.Mesh(skinkBody,creatureMat(.28));skinkMesh.castShadow=true;skink.add(skinkMesh);
const skinkLegs=mergeParts([...[[.30,1],[.30,-1],[-.22,1],[-.22,-1]].flatMap(([lx,s])=>[
{geo:new T.CylinderGeometry(.016,.012,.085,5),m:M4(lx,-.02,s*.12,1,1,1,0,0,.5),c:'#e0d0ae'},
{geo:new T.ConeGeometry(.006,.05,4),m:M4(lx+.045,-.045,s*.16,1,1,1,0,0,1.9),c:'#e0d0ae'},
{geo:new T.ConeGeometry(.006,.05,4),m:M4(lx+.02,-.05,s*.175,1,1,1,.5,0,2.4),c:'#e0d0ae'}])]);
const skinkLegMesh=new T.Mesh(skinkLegs,creatureMat(.5));skinkLegMesh.castShadow=true;skink.add(skinkLegMesh);
for(const s of[-1,1]){const e=mesh(new T.SphereGeometry(.014,6,5),eyeMat,v(.47,.035,s*.05),v(1,1,1),skink);paint(e.geometry,(q,c)=>c.set('#1a0f05'));}
skink.userData.kind='sandfish';scene.add(skink);animals.push(skink);
const skinkC=v(44,0,55);
// Sand bulge and collapsing trail left by its swimming.
const wakeMat=new T.MeshStandardMaterial({color:'#e8b57a',roughness:1});
const wake=new T.Mesh(new T.SphereGeometry(1,12,8),wakeMat);wake.scale.set(1.4,.14,.4);wake.castShadow=false;scene.add(wake);
const trail=[];for(let i=0;i<4;i++){const t=new T.Mesh(new T.SphereGeometry(1,8,6),wakeMat);t.castShadow=false;scene.add(t);trail.push(t);}
// The fennec, out only after dark. Cream coat, russet back, enormous pink-lined ears.
const fennec=new T.Group();
const F_BACK='#dcae72',F_CREAM='#f2e2c4',F_WHITE='#f8f0e0',F_PINK='#e8a58e',F_DARK='#2a1a10';
const fenMat=creatureMat(.94,furTex('#b08248',.08,1300));
const fenBody=mergeParts([
{geo:new T.SphereGeometry(1,24,18),m:M4(-.10,.25,0,.255,.21,.205),c:function(q,c){c.set(F_BACK).lerp(new T.Color(F_CREAM),T.MathUtils.clamp((.26-q.y)*2.4,0,1));}},
{geo:paint(taperTube([v(-.20,.33,0),v(.04,.40,0),v(.24,.50,0)],t=>.175-.035*t,10),(q,c)=>c.set(F_BACK).lerp(new T.Color(F_CREAM),T.MathUtils.clamp((.44-q.y)*3,0,.9))),m:M4(0,0,0),c:null},
{geo:new T.SphereGeometry(1,12,9),m:M4(.22,.42,0,.17,.19,.15),c:F_CREAM},
{geo:new T.SphereGeometry(1,10,7),m:M4(-.04,.045,.14,.13,.04,.055),c:F_CREAM},
{geo:new T.SphereGeometry(1,10,7),m:M4(-.04,.045,-.14,.13,.04,.055),c:F_CREAM},
{geo:new T.CylinderGeometry(.034,.027,.26,6),m:M4(.26,.20,.085),c:'#ecd9b8'},
{geo:new T.CylinderGeometry(.034,.027,.26,6),m:M4(.26,.20,-.085),c:'#ecd9b8'},
{geo:new T.SphereGeometry(1,7,5),m:M4(.27,.06,.088,.05,.03,.042),c:F_WHITE},
{geo:new T.SphereGeometry(1,7,5),m:M4(.27,.06,-.088,.05,.03,.042),c:F_WHITE}]);
const fenBodyMesh=new T.Mesh(fenBody,fenMat);fenBodyMesh.castShadow=true;fennec.add(fenBodyMesh);
const fenShellMat=new T.MeshStandardMaterial({color:'#dfc290',roughness:1,alphaMap:strandTex('#c8c8c8',.5,1700),transparent:true,alphaTest:.42,depthWrite:false});
const fenShell=new T.Mesh(fenBody,fenShellMat);fenShell.scale.setScalar(1.035);fenShell.castShadow=false;fennec.add(fenShell);
// Bushy curled tail with dark tip.
const fenTail=mergeParts([
{geo:paint(taperTube([v(-.26,.14,0),v(-.42,.08,.12),v(-.30,.06,.28),v(-.02,.07,.32)],t=>.05+.035*Math.sin(Math.PI*t),9),(q,c)=>c.set(F_BACK).lerp(new T.Color(F_CREAM),.35)),m:M4(0,0,0),c:null},
{geo:paint(taperTube([v(-.02,.07,.32),v(.08,.09,.30)],t=>.055*(1-t*.4),8),(q,c)=>c.set('#6a4a34')),m:M4(0,0,0),c:null}]);
const fenTailMesh=new T.Mesh(fenTail,fenMat);fenTailMesh.castShadow=true;fennec.add(fenTailMesh);
const fenTailShell=new T.Mesh(fenTail,fenShellMat);fenTailShell.scale.setScalar(1.05);fenTailShell.castShadow=false;fennec.add(fenTailShell);
const fenHead=new T.Group();fenHead.position.set(.30,.64,0);
const fenHeadGeo=mergeParts([
{geo:new T.SphereGeometry(1,20,15),m:M4(0,0,0,.115,.105,.095),c:function(q,c){c.set(F_BACK).lerp(new T.Color(F_CREAM),T.MathUtils.clamp((-q.y+.02)*6,0,.8));}},
{geo:new T.SphereGeometry(1,10,7),m:M4(.10,-.032,0,.068,.045,.045),c:F_WHITE},
{geo:new T.SphereGeometry(.013,6,5),m:M4(.152,-.018,0),c:'#120a06'},
{geo:new T.SphereGeometry(1,8,6),m:M4(.085,-.05,.042,.035,.026,.03),c:F_WHITE},
{geo:new T.SphereGeometry(1,8,6),m:M4(.085,-.05,-.042,.035,.026,.03),c:F_WHITE}]);
const fenHeadMesh=new T.Mesh(fenHeadGeo,fenMat);fenHeadMesh.castShadow=true;fenHead.add(fenHeadMesh);
const fenEyes=[];for(const s of[-1,1]){const e=mesh(new T.SphereGeometry(.025,8,6),eyeMat,v(.072,.035,s*.076),v(1,1,1),fenHead);paint(e.geometry,(q,c)=>c.set(F_DARK));const hi=mesh(new T.SphereGeometry(.008,5,4),new T.MeshBasicMaterial({color:0xfff4e0}),v(.083,.045,s*.085),v(1,1,1),fenHead);hi.castShadow=false;fenEyes.push(e);}
function fenEar(side){const earG=new T.Group();earG.position.set(-.04,.10,side*.052);
const outer=mesh(new T.ConeGeometry(.078,.42,10),fenMat,v(0,.18,0),v(1,1,.52),earG);paint(outer.geometry,(q,c)=>c.set(F_BACK).lerp(new T.Color(F_CREAM),T.MathUtils.clamp((.12-q.y)*1.4,0,.7)));
const inner=mesh(new T.ConeGeometry(.058,.34,8),creatureMat(.55,null,{emissive:'#b04a34',emissiveIntensity:.13}),v(.034,.15,0),v(1,1,.42),earG);paint(inner.geometry,(q,c)=>c.set(F_PINK).lerp(new T.Color(F_WHITE),T.MathUtils.clamp((q.y)*2,0,.5)));
earG.rotation.x=side*.40;earG.rotation.z=-.30;fenHead.add(earG);return earG;}
const earL=fenEar(1),earR=fenEar(-1);
fennec.add(fenHead);
fennec.userData.kind='fennec';fennec.userData.head=fenHead;fennec.userData.earL=earL;fennec.userData.earR=earR;fennec.userData.eyes=fenEyes;
const denC=v(-27,0,50);denC.y=dune(denC.x,denC.z);fennec.scale.setScalar(1.5);fennec.position.copy(denC).add(v(2.6,.02,1.8));scene.add(fennec);animals.push(fennec);
const denMound=mesh(new T.SphereGeometry(1,10,6),mat('#c99a5f'),denC.clone().add(v(0,-.6,0)),v(1.7,.85,1.6),scene);denMound.castShadow=false;
// Laughing doves: pink-fawn breast, speckled copper foreneck, blue-grey wings, white-tipped tail fan.
const doveMat=creatureMat(.85,null,{side:T.DoubleSide});
const D_PINK='#d9a58e',D_BELLY='#eed3b8',D_WING='#9aa7bf',D_WINGD='#6d7890',D_SPECK='#7a4a28',D_TAIL='#a08a78';
function doveBody(perched){const parts=[
{geo:new T.SphereGeometry(1,20,14),m:M4(0,0,0,.32,.145,.125),c:function(q,c){c.set(D_PINK).lerp(new T.Color(D_BELLY),T.MathUtils.clamp((-q.y)*6,0,1));if(q.y>.04)c.lerp(new T.Color(D_TAIL),T.MathUtils.clamp((-q.x)*2.2,0,.85));}},
{geo:paint(taperTube([v(.22,.03,0),v(.28,.10,0)],t=>.055-.012*t,8),(q,c)=>c.set(D_PINK)),m:M4(0,0,0),c:null},
{geo:new T.SphereGeometry(1,12,9),m:M4(.285,.135,0,.088,.085,.08),c:D_PINK},
{geo:new T.SphereGeometry(1,8,6),m:M4(.25,.085,0,.068,.055,.065),c:D_SPECK},
{geo:new T.ConeGeometry(.016,.055,6),m:M4(.375,.125,0,1,1,1,0,0,-1.65),c:'#1c1210'},
{geo:new T.SphereGeometry(.02,6,5),m:M4(.305,.165,.055),c:'#1c1210'},
{geo:new T.SphereGeometry(.02,6,5),m:M4(.305,.165,-.055),c:'#1c1210'}];
if(perched){parts.push({geo:new T.CylinderGeometry(.011,.009,.10,5),m:M4(.02,-.19,.035),c:'#b04838'},{geo:new T.CylinderGeometry(.011,.009,.10,5),m:M4(.02,-.19,-.035),c:'#b04838'},
{geo:paint(taperTube([v(-.24,.02,0),v(-.46,.01,0)],t=>.04*(1-t*.5),6),(q,c)=>c.set(D_TAIL)),m:M4(0,0,0,.4,1,2.6),c:null});
for(const sw of[-1,1]){for(let k=0;k<4;k++)parts.push({geo:featherGeo(.26-k*.012,.052),m:M4(.10-k*.045,.068+k*.006,sw*(.062+k*.034),1,1,1,sw*(.30+k*.10),-sw*(.16+k*.05),-.05),c:k>1?D_WINGD:(k?'#8fa0bb':D_WING)});
for(let k=0;k<4;k++)parts.push({geo:featherGeo(.19-k*.012,.030),m:M4(-.14,.052+k*.004,sw*(.075-k*.026),1,1,1,sw*.18,-sw*(.34+k*.12),0),c:k>1?'#43506a':'#5d6a86'});}}
else{for(let k=-2;k<=2;k++)parts.push({geo:featherGeo(.24,.048),m:M4(-.36,.012,k*.024,1,1,1,0,k*.13,0),c:(q2,c)=>{c.set(D_TAIL);if(q2.x<-.44)c.set('#463b2e');if(Math.abs(k)===2&&q2.x<-.50)c.set('#e8e0d0');}});}
return mergeParts(parts);}
function doveWing(side){const root=new T.Group();root.position.set(.03,.055,side*.10);
const innerParts=[{geo:featherGeo(.24,.20),m:M4(.03,0,side*.03,1,1,1,0,-side*.10,0),c:(q,c)=>c.set(D_WING).lerp(new T.Color(D_WINGD),T.MathUtils.clamp(Math.abs(q.z)*1.2,0,.55))}];
for(let k=0;k<5;k++)innerParts.push({geo:featherGeo(.19-k*.008,.042),m:M4(-.06-k*.014,.002,side*(.035+k*.030),1,1,1,0,-side*(.10+k*.05),0),c:k%2?D_WING:'#8fa0bb'});
const inner=new T.Mesh(mergeParts(innerParts),doveMat);inner.castShadow=true;root.add(inner);
const outerG=new T.Group();outerG.position.set(-.12,0,side*.155);root.add(outerG);
const outerParts=[];
for(let k=0;k<7;k++)outerParts.push({geo:featherGeo(.235-k*.014,.040),m:M4(-k*.018,0,side*(.004+k*.023),1,1,1,0,-side*(.14+k*.085),0),c:k>3?'#43506a':k>1?'#5d6a86':D_WING});
const outer=new T.Mesh(mergeParts(outerParts),doveMat);outer.castShadow=true;outerG.add(outer);
root.userData.outer=outerG;return root;}
const doves=[];for(let i=0;i<5;i++){const d=new T.Group();const body=new T.Mesh(doveBody(false),doveMat);body.castShadow=true;d.add(body);
const wl=doveWing(1),wr=doveWing(-1);d.add(wl);d.add(wr);d.userData.kind='dove';d.userData.wingL=wl;d.userData.wingR=wr;scene.add(d);doves.push(d);animals.push(d);}
// A resident pair feeding and drinking at the pool edge.
const perchedDoves=[];for(let i=0;i<2;i++){const d=new T.Group();const body=new T.Mesh(doveBody(true),doveMat);body.castShadow=true;d.add(body);
d.userData.kind='dove';const a=1.1+i*1.9;d.position.set(oasisC.x+Math.sin(a)*10.4,0,oasisC.z+Math.cos(a)*10.4);d.position.y=Math.max(dune(d.position.x,d.position.z)+.26,oasisC.y+.5);d.rotation.y=a+Math.PI/2+i*.8;scene.add(d);perchedDoves.push(d);animals.push(d);}
const chapters=[
{title:'First light.<br><i>Long shadows.</i>',line:"The dunes hold the night's cold a little longer.",action:'Walk with the caravan',pos:v(-3,0,10),yaw:2.40,pitch:-.04,skyTop:'#8fb4d6',skyHor:'#f7c489',fog:.0016,ink:'#4a2f14',veil:['#3a240c30','#2a1a08e0','#22150af7'],sun:v(.92,.14,.22),sunColor:'#ffc08a',sunI:2.4,hemiI:1.5,glowAmt:1.1,kind:'caravan',wind:.5},
{title:'The white<br><i>hour.</i>',line:'Light everywhere. Even shadows hide.',action:'Read the wind',pos:v(-2,0,34),yaw:Math.PI,pitch:.1,skyTop:'#a8cfe8',skyHor:'#f4e3c0',fog:.0040,ink:'#4a2f14',veil:['#5a3c1440','#3a240cd8','#2a1a08ee'],sun:v(.15,.95,-.2),sunColor:'#fff4e0',sunI:3.2,hemiI:2.2,glowAmt:.5,kind:'wind',wind:1.6},
{title:'A ring<br><i>of green.</i>',line:'Deep water, rising where the land dips low.',action:'Watch for the sandfish',pos:v(43,0,24),yaw:.695,pitch:-.16,skyTop:'#9cc4e0',skyHor:'#e8ddb0',fog:.0020,ink:'#3f2c12',veil:['#2c2c1030','#22301cd8','#1a2410ee'],sun:v(-.6,.5,.3),sunColor:'#ffe6c0',sunI:2.4,hemiI:1.9,glowAmt:.7,kind:'sandfish',wind:.6},
{title:'The river<br><i>of stars.</i>',line:'The cold returns. The sky fills.',action:'Meet the fennec',pos:v(-17,0,36),yaw:-.44,pitch:-.08,skyTop:'#060b1c',skyHor:'#16233f',fog:.0009,ink:'#f3ead9',veil:['#04081440','#060a1ae0','#04060ef7'],sun:v(-.4,.72,-.5),sunColor:'#a8bcf0',sunI:1.15,hemiI:1.0,glowAmt:.35,kind:'fennec',wind:.3}];
let chapter=0,yaw=2.75,pitch=.05,targetYaw=2.75,targetPitch=.05,night=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=performance.now(),dragged=false,down=null,encountered=false,frames=0;
let focusKind=null;const focusV=v(0,0,0);const frameKind=new URLSearchParams(location.search).get('frame');
if(new URLSearchParams(location.search).get('clean'))document.body.classList.add('clean');
function groundY(p){p.y=dune(p.x,p.z)+2.6;return p;}chapters.forEach(c=>groundY(c.pos));chapters[2].pos.y+=4.5;camera.position.copy(chapters[0].pos);
function pauseUI(){const b=$('#pause');b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'Resume ambient motion':'Pause ambient motion');}pauseUI();
function changeChapter(n){chapter=(n+4)%4;const c=chapters[chapter];
const ca=elapsed*.03+.32,cx=caraC.x+Math.sin(ca)*caraR,cz=caraC.z+Math.cos(ca)*caraR;const subject=chapter===0?v(cx,dune(cx,cz)+1.2,cz):chapter===2?oasisC.clone().add(v(0,.35,0)):chapter===3?fennec.position.clone().add(v(0,.7,0)):null;
if(subject){const d=subject.sub(c.pos);c.yaw=Math.atan2(d.x,d.z);c.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));}
targetYaw=c.yaw;targetPitch=c.pitch;encountered=false;focusKind=null;$('#title').innerHTML=c.title;$('#line').textContent=c.line;$('#encounter').innerHTML=c.action+' <span aria-hidden="true">↗</span>';document.querySelectorAll('nav [data-chapter]').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.chapter===chapter)));document.documentElement.style.setProperty('--ink',c.ink);soundscape.setScene(AUDIO_SCENES[chapter]);$('.veil').style.background=`linear-gradient(${c.veil[0]},transparent 28%,transparent 43%,${c.veil[1]} 77%,${c.veil[2]})`;$('#orientation').classList.remove('show');if(matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(c.pos);yaw=targetYaw;pitch=targetPitch;}}
$('#reset').onclick=()=>{down=null;changeChapter(chapter);yaw=targetYaw;pitch=targetPitch;camera.position.copy(chapters[chapter].pos);};
const facts={caravan:['The long road.','For centuries, camel caravans crossed the Sahara between wells, carrying salt, gold and stories.'],wind:['A travelling desert.',"The Sahara is Earth's largest source of airborne dust. Some of it crosses the Atlantic and helps feed the Amazon rainforest."],sandfish:['A swimmer in sand.',"The sandfish skink doesn't burrow through loose sand - it swims through it, the way a fish moves through water."],fennec:['Ears like sails.','The fennec hunts at night. Its oversized ears shed heat and can hear prey moving under the sand.'],dove:['Laughing doves.','A year-round resident of Saharan oases and wadis. Its soft, laughing coo carries far in still evening air.']};
function encounter(kind){const f=facts[kind];if(!f)return;encountered=true;focusKind=kind;$('#title').textContent=f[0];$('#line').textContent=f[1];$('#encounter').innerHTML='Return to the crossing <span aria-hidden="true">↙</span>';}
$('#encounter').onclick=()=>encountered?changeChapter(chapter):encounter(chapters[chapter].kind);document.querySelectorAll('nav [data-chapter]').forEach(b=>b.onclick=()=>changeChapter(+b.dataset.chapter));$('#pause').onclick=()=>{paused=!paused;pauseUI();};$('#about').onclick=()=>$('#notes').showModal();$('#close').onclick=()=>$('#notes').close();$('#notes').onclick=e=>{if(e.target===$('#notes'))$('#notes').close();};
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};dragged=false;canvas.setPointerCapture(e.pointerId);$('#orientation').classList.remove('show');});canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.lx,dy=e.clientY-down.ly;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;targetYaw-=dx*.006;targetPitch=Math.max(-.65,Math.min(.85,targetPitch+dy*.004));down.lx=e.clientX;down.ly=e.clientY;});const caster=new T.Raycaster();canvas.addEventListener('pointerup',e=>{if(down&&!dragged){caster.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);const hit=caster.intersectObjects(animals,true)[0];if(hit){let o=hit.object;while(o.parent&&!o.userData.kind)o=o.parent;encounter(o.userData.kind);}}down=null;});canvas.addEventListener('pointercancel',()=>down=null);
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')targetYaw+=.16;if(e.key==='ArrowRight')targetYaw-=.16;if(e.key==='ArrowUp')targetPitch=Math.min(.85,targetPitch+.12);if(e.key==='ArrowDown')targetPitch=Math.max(-.65,targetPitch-.12);$('#orientation').classList.remove('show');}});
let sx=0,navDown=false,navSwiped=false;const nav=$('nav');nav.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();changeChapter(chapter+(e.key==='ArrowRight'?1:-1));nav.querySelector('[aria-current=true]').focus();}});nav.addEventListener('pointerdown',e=>{sx=e.clientX;navDown=true;navSwiped=false;});nav.addEventListener('pointerup',e=>{if(!navDown)return;navDown=false;const dx=e.clientX-sx;if(Math.abs(dx)>45){navSwiped=true;changeChapter(chapter+(dx<0?1:-1));}});nav.addEventListener('click',e=>{if(navSwiped){e.preventDefault();e.stopImmediatePropagation();navSwiped=false;}},true);
/* Opt-in desert sound, off by default. Synthesized from what the Sahara holds:
   dune wind and saltation hiss, camel bells on the dawn caravan, the oasis
   pool with palm rustle and doves, thin cold air with fennec yips at night.
   No samples, no voice; follows the chapter. */
const AUDIO_SCENES=['dawn','whiteHour','oasis','night'];
const soundscape=createSoundscape(soundProgram,{masterGain:.9});
let audioStarted=false;$('#sound').onclick=async()=>{
if(!audioStarted){audioStarted=true;await soundscape.start(AUDIO_SCENES[chapter]);}else soundscape.setOn(!soundscape.on);
$('#sound').setAttribute('aria-pressed',String(soundscape.on));$('#sound').setAttribute('aria-label',soundscape.on?'Turn desert sound off':'Turn desert sound on');};
document.addEventListener('visibilitychange',()=>{last=performance.now();soundscape.handleVisibility();});
window.__soundscape=soundscape;
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const look=v(0,0,0),bg=new T.Color(),sunPos=v(0,0,0),skyTopC=new T.Color(),skyHorC=new T.Color(),sunColC=new T.Color(),glowC=new T.Color('#ffb36b');
function animate(now){requestAnimationFrame(animate);if(document.hidden)return;const dt=Math.min((now-last)/1000,.15);last=now;if(!paused&&!encountered)elapsed+=dt;const c=chapters[chapter];
const watching=frameKind||(encountered?focusKind:null);
const watchAnimal=watching==='caravan'||watching==='camel'?camels[1]:watching==='sandfish'?skink:watching==='fennec'?fennec:watching==='dove'?perchedDoves[0]:null;
if(watchAnimal){const ap=watchAnimal.position,lift=watching==='fennec'?.55:watching==='sandfish'?.3:watching==='dove'?.2:2.0,dist=watching==='caravan'||watching==='camel'?11:watching==='fennec'?3.4:watching==='sandfish'?2.4:1.9,ry=watchAnimal.rotation.y;
const orbit=watching==='dove'?.3:(watching==='caravan'||watching==='camel')?.5:2.5;
focusV.set(ap.x+Math.sin(ry+orbit)*dist,ap.y+lift+dist*.28,ap.z+Math.cos(ry+orbit)*dist);
if(frameKind||matchMedia('(prefers-reduced-motion: reduce)').matches)camera.position.copy(focusV);else camera.position.lerp(focusV,1-Math.exp(-dt*4));
focusV.set(ap.x,ap.y+lift,ap.z).sub(camera.position);targetYaw=Math.atan2(focusV.x,focusV.z);targetPitch=Math.atan2(focusV.y,Math.hypot(focusV.x,focusV.z));
if(frameKind){yaw=targetYaw;pitch=targetPitch;}}
else camera.position.lerp(c.pos,1-Math.exp(-dt*4));if(matchMedia('(prefers-reduced-motion: reduce)').matches){yaw=targetYaw;pitch=targetPitch;}else{yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*9));pitch+=(targetPitch-pitch)*(1-Math.exp(-dt*9));}look.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).add(camera.position);camera.lookAt(look);
const k=matchMedia('(prefers-reduced-motion: reduce)').matches?1:1-Math.exp(-dt*3);night+=((chapter===3?1:0)-night)*k;if(Math.abs((chapter===3?1:0)-night)<.001)night=chapter===3?1:0;
skyTopC.set(c.skyTop);skyHorC.set(c.skyHor);sunColC.set(c.sunColor);
skyU.top.value.lerp(skyTopC,k);skyU.hor.value.lerp(skyHorC,k);skyU.sunDir.value.lerp(c.sun,k).normalize();skyU.glowAmt.value+=(c.glowAmt-skyU.glowAmt.value)*k;
scene.background.copy(skyU.hor.value);scene.fog.color.copy(skyU.hor.value);scene.fog.density+=(c.fog-scene.fog.density)*k;
sunlight.color.lerp(sunColC,k);sunlight.intensity+=(c.sunI-sunlight.intensity)*k;hemi.intensity+=(c.hemiI-hemi.intensity)*k;hemi.color.set('#ffe2c4').lerp(new T.Color('#6c89c2'),night);hemi.groundColor.set('#7a5238').lerp(new T.Color('#18213f'),night);
sunlight.position.copy(camera.position).addScaledVector(c.sun,180);sunlight.target.position.copy(camera.position);sunlight.target.updateMatrixWorld();
skyRig.position.copy(camera.position);
sunPos.copy(c.sun).normalize().multiplyScalar(900);sun.position.copy(sunPos);sun.lookAt(camera.position);sun.material.opacity=1-night;halo.position.copy(sunPos);halo.lookAt(camera.position);halo.material.opacity=.22*(1-night);
moon.position.copy(v(-.4,.72,-.5).normalize().multiplyScalar(900));moon.lookAt(camera.position);moon.material.opacity=night*.95;stars.material.opacity=night*.95;skyRig.children.forEach(o=>{if(o.userData.isMilky)o.material.opacity=night*.9;});
sandMat.color.set('#ffffff').lerp(new T.Color('#414d81'),night*.85);
mirage.material.uniforms.time.value=elapsed;mirage.material.uniforms.amt.value+=((chapter===1?1:0)-mirage.material.uniforms.amt.value)*k;pool.material.uniforms.time.value=elapsed;pool.material.uniforms.night.value=night;
// --- gait, behaviour and camera focus, replacing the primitive loops ---
for(let i=0;i<camels.length;i++){const a=elapsed*.03+i*.32,x=caraC.x+Math.sin(a)*caraR,z=caraC.z+Math.cos(a)*caraR,g=camels[i];
g.position.set(x,dune(x,z),z);g.rotation.y=a+Math.PI;
const ph=elapsed*2.1+i*1.7;
g.position.y+=Math.abs(Math.sin(ph))*.045;g.rotation.z=Math.sin(ph)*.035;
const lgs=g.userData.legs;for(let l=0;l<4;l++){const side=l%2===0?1:-1;const lp=ph+(side>0?0:Math.PI)+(l<2?0:.35);
lgs[l].legG.rotation.x=Math.sin(lp)*.30;lgs[l].kneeG.rotation.x=-.62*Math.max(0,Math.sin(lp-.8));}
g.userData.head.rotation.z=-.02+Math.sin(ph+.6)*.035;g.userData.head.rotation.y=Math.sin(elapsed*.21+i*2.1)*.06;
g.userData.tail.rotation.x=Math.sin(elapsed*.9+i*2)*.28;g.userData.tail.rotation.z=Math.sin(elapsed*.53+i)*.12;}
for(let i=0;i<ROPES;i++){camels[i+1].userData.head.getWorldPosition(_ra);camels[i].userData.tail.getWorldPosition(_rb);_rb.y+=.4;ropeUpdate(ropes[i],_rb,_ra,.5);}
{const sa=elapsed*.35,sx2=skinkC.x+Math.sin(sa)*3.2,sz2=skinkC.z+Math.cos(sa)*2.2;
const hdX=Math.cos(sa)*3.2,hdZ=-Math.sin(sa)*2.2;
skink.rotation.y=Math.atan2(-hdZ,hdX);skink.rotation.x=Math.sin(elapsed*9)*.10;
const surf=(elapsed+4)%12;let sy=.01,crest=0;
if(frameKind==='sandfish'){sy=.26;crest=.65;skink.rotation.z=Math.cos(elapsed*8.5)*.3;}
else if(surf>10.2){const u=Math.min(1,(surf-10.2)/1.8);sy=Math.sin(u*Math.PI)*.5;crest=Math.sin(u*Math.PI);skink.rotation.z=Math.cos(elapsed*8.5)*.4*crest;}else skink.rotation.z=0;
skink.position.set(sx2,dune(sx2,sz2)+.05+sy,sz2);
wake.position.set(sx2-Math.cos(skink.rotation.y)*.4,dune(sx2,sz2)+.05,sz2+Math.sin(skink.rotation.y)*.4);wake.rotation.y=skink.rotation.y;
wake.scale.set(1.05*(1-crest*.4),.10*(1-crest*.6)+.03,.32*(1-crest*.25));
if(elapsed-(trail.t||0)>.5){trail.t=elapsed;const t=trail.shift();trail.push(t);t.position.set(sx2,dune(sx2,sz2)+.03,sz2);t.userData.born=elapsed;}
for(const t of trail){const age=elapsed-(t.userData.born||0);const s2=Math.max(.001,1-age*.4);t.scale.set(1.1*s2,.085*s2,.3*s2);}}
{const fe=fennec.userData;fennec.position.y=denC.y+.02+Math.sin(elapsed*1.3)*.008;
fennec.rotation.y=Math.sin(elapsed*.23)*.5+2.2;
fe.earL.rotation.z=-.12+Math.sin(elapsed*2.1)*.10+Math.max(0,Math.sin(elapsed*.41+2))*.22;
fe.earR.rotation.z=-.12+Math.sin(elapsed*1.7+1)*.10+Math.max(0,Math.sin(elapsed*.37))*.22;
fe.earL.rotation.y=Math.sin(elapsed*.53)*.2;fe.earR.rotation.y=Math.sin(elapsed*.47+3)*.2;
fe.head.rotation.y=Math.sin(elapsed*.19)*Math.sin(elapsed*.31+1)*.9;fe.head.rotation.z=Math.sin(elapsed*.13+2)*.12;
const blink=(elapsed%4.3)<.13;for(const e of fe.eyes)e.scale.y=blink?.12:1;}
for(let i=0;i<doves.length;i++){const a=elapsed*.22+i*1.26,d=doves[i];
const r=16+Math.sin(elapsed*.11+i*2)*2.5;
d.position.set(oasisC.x+Math.sin(a)*r,oasisC.y+11+Math.sin(elapsed*.9+i)*2+Math.sin(elapsed*.23+i*3)*1.5,oasisC.z+Math.cos(a)*r);
d.rotation.y=a;d.rotation.x=-.38; 
const cyc=(elapsed*.9+i*1.3)%4.4,gate=cyc<2.2?1:Math.max(0,1-(cyc-2.2)*4);
const base=.10+(1-gate)*.30,osc=.55*gate*Math.sin(elapsed*9+i*2);
d.userData.wingL.rotation.x=-(base+osc);d.userData.wingR.rotation.x=base+osc;
d.userData.wingL.userData.outer.rotation.x=-.25*gate*Math.sin(elapsed*9+i*2-.7);
d.userData.wingR.userData.outer.rotation.x=.25*gate*Math.sin(elapsed*9+i*2-.7);
d.position.y+=Math.sin(elapsed*9+i*2)*.05*gate;d.rotation.z=Math.sin(elapsed*.9+i)*.05;}
for(let i=0;i<perchedDoves.length;i++){const d=perchedDoves[i];
const peck=(elapsed+i*2.7)%6.5;d.children[0].rotation.z=peck<.9?-.45*Math.sin(peck/.9*Math.PI):0;
d.rotation.y+=Math.sin(elapsed*.5+i*2)*.0006;}
const sp=streaks.geometry.attributes.position;for(let i=0;i<sp.count;i++){let x=(streakBase[i]+elapsed*c.wind*9)%140;if(x>70)x-=140;if(x<-70)x+=140;sp.setX(i,x);}sp.needsUpdate=true;streaks.position.set(camera.position.x,0,camera.position.z);streaks.material.opacity=.35*(1-night*.6);
canvas.dataset.yaw=yaw.toFixed(5);canvas.dataset.pitch=pitch.toFixed(5);canvas.dataset.entryYaw=c.yaw.toFixed(5);canvas.dataset.entryPitch=c.pitch.toFixed(5);document.body.dataset.chapter=chapter;$('#compass').textContent=['N','E','S','W'][Math.floor((((yaw*180/Math.PI)%360+360+45)%360)/90)]+' · '+String(Math.round((yaw*180/Math.PI%360+360)%360)).padStart(3,'0')+'°';renderer.render(scene,camera);if(++frames===2){$('#status').remove();}if(frames===500)$('#orientation').classList.remove('show');}
changeChapter(0);requestAnimationFrame(animate);

/* Chrome: the desert leads. The caravan tools greet on entry, then retire;
   they visit when called (top/bottom edge, hint star, keyboard) and leave when left. */
const PIN_KEY='sahara-chrome-pin',TOP_ZONE=96,BOTTOM_ZONE=150,RETIRE_MS=2600;
let pinned=false;try{pinned=localStorage.getItem(PIN_KEY)==='1'}catch(e){}
let chromeOn=true,focusWithin=false,retireTimer=null;const pinBtn=$('#pin');
function applyChrome(){document.body.classList.toggle('chrome-on',chromeOn||pinned);}
function pinUI(){pinBtn.setAttribute('aria-pressed',String(pinned));pinBtn.setAttribute('aria-label',pinned?'Let controls retire':'Keep controls visible');}
function retireSoon(){clearTimeout(retireTimer);retireTimer=setTimeout(()=>{if(!focusWithin){chromeOn=false;applyChrome();}},RETIRE_MS);}
function wakeChrome(){chromeOn=true;applyChrome();retireSoon();}
pinBtn.onclick=()=>{pinned=!pinned;try{pinned?localStorage.setItem(PIN_KEY,'1'):localStorage.removeItem(PIN_KEY)}catch(e){}if(pinned)chromeOn=true;pinUI();applyChrome();};
$('#chrome-hint').onclick=wakeChrome;
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;if(e.target.closest&&e.target.closest('#chrome-hint'))return;if(e.clientY<TOP_ZONE||e.clientY>innerHeight-BOTTOM_ZONE)wakeChrome();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pinned){focusWithin=false;chromeOn=false;applyChrome();}});
document.addEventListener('focusin',e=>{if(e.target.closest&&e.target.closest('header,.crossing,#chrome-hint')){focusWithin=true;clearTimeout(retireTimer);chromeOn=true;applyChrome();}});
document.addEventListener('focusout',e=>{if(!e.relatedTarget||!e.relatedTarget.closest||!e.relatedTarget.closest('header,.crossing')){focusWithin=false;retireSoon();}});
pinUI();applyChrome();retireSoon();
