import * as T from './three.module.min.js';
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
// The caravan: dromedaries with true proportions crossing a mid-distance ridge.
const camelMat=mat('#8a6a48',.95,false);
function makeCamel(blanket){const g=new T.Group();
mesh(new T.SphereGeometry(1,14,10),camelMat,v(0,1.42,0),v(1.05,.45,.5),g);
mesh(new T.SphereGeometry(1,10,8),camelMat,v(-.12,1.86,0),v(.5,.4,.42),g);
mesh(new T.BoxGeometry(.78,.14,.86),mat(blanket),v(-.12,1.72,0),v(1,1,1),g);
const n1=mesh(new T.CylinderGeometry(.11,.15,.75,7),camelMat,v(1.05,1.85,0),v(1,1,1),g);n1.rotation.z=-.85;
const n2=mesh(new T.CylinderGeometry(.09,.11,.6,7),camelMat,v(1.42,2.28,0),v(1,1,1),g);n2.rotation.z=-.25;
const head=mesh(new T.BoxGeometry(.4,.19,.19),camelMat,v(1.62,2.62,0),v(1,1,1),g);head.rotation.z=-.15;
mesh(new T.BoxGeometry(.2,.14,.15),camelMat,v(1.88,2.56,0),v(1,1,1),g);
for(const z of[-.07,.07]){mesh(new T.ConeGeometry(.035,.1,4),camelMat,v(1.5,2.75,z),v(1,1,1),g);mesh(new T.SphereGeometry(.028,5,4),eyeMat,v(1.74,2.64,z*1.3),v(1,1,1),g);}
const tail=mesh(new T.CylinderGeometry(.028,.02,.6,4),camelMat,v(-1.05,1.2,0),v(1,1,1),g);tail.rotation.z=.25;
mesh(new T.ConeGeometry(.05,.16,4),mat('#4a3018'),v(-1.13,.92,0),v(1,1,1),g).rotation.z=Math.PI;
const legs=[];
for(const x of[-.62,.62])for(const z of[-.26,.26]){const lg=new T.Group();lg.position.set(x,1.35,z);
mesh(new T.CylinderGeometry(.06,.048,.68,6),camelMat,v(0,-.34,0),v(1,1,1),lg);
const lowG=new T.Group();lowG.position.set(0,-.68,0);lowG.rotation.z=x>0?.12:-.18;lg.add(lowG);
mesh(new T.CylinderGeometry(.042,.036,.68,6),camelMat,v(0,-.32,0),v(1,1,1),lowG);
mesh(new T.SphereGeometry(.07,6,5),mat('#5e4028'),v(0,-.66,0),v(1,.6,1),lowG);
g.add(lg);legs.push(lg);}
g.scale.setScalar(.9);g.userData.kind='caravan';g.userData.legs=legs;return g;}
const camels=[];const blankets=['#a8442f','#2f5a8a','#b8862f','#6a3a8a'];
for(let i=0;i<4;i++){const c=makeCamel(blankets[i]);c.scale.multiplyScalar(range(1.0,1.15));scene.add(c);camels.push(c);animals.push(c);}
const caraC=v(14,0,-20),caraR=14;
// The sandfish: a skink that swims the loose sand near the oasis edge.
const skink=new T.Group();mesh(new T.SphereGeometry(1,10,6),mat('#cbb27e'),v(0,0,0),v(.55,.13,.13),skink);mesh(new T.ConeGeometry(.1,.5,5),mat('#b89f6e'),v(-.62,0,0),v(1,1,1),skink).rotation.z=Math.PI/2;for(const z of[-.07,.07])mesh(new T.SphereGeometry(.03,5,4),eyeMat,v(.4,.06,z),v(1,1,1),skink);skink.userData.kind='sandfish';scene.add(skink);animals.push(skink);
const skinkC=v(44,0,55);
// The fennec, out only after dark.
const fennec=new T.Group(),fenMat=mat('#e2c493',.95,false);mesh(new T.SphereGeometry(1,10,7),fenMat,v(0,.42,0),v(.42,.26,.22),fennec);mesh(new T.SphereGeometry(1,10,7),fenMat,v(.4,.62,0),v(.2,.18,.17),fennec);for(const z of[-.1,.1]){const ear=mesh(new T.ConeGeometry(.09,.34,5),fenMat,v(.32,.86,z*1.2),v(1,1,1),fennec);ear.rotation.x=z*3.6;fennec.userData['ear'+(z>0?'R':'L')]=ear;}for(const z of[-.075,.075])mesh(new T.SphereGeometry(.032,5,4),eyeMat,v(.55,.66,z),v(1,1,1),fennec);mesh(new T.SphereGeometry(1,8,5),mat('#d9b988'),v(-.4,.3,0),v(.32,.12,.12),fennec);fennec.userData.kind='fennec';
const denC=v(-27,0,50);denC.y=dune(denC.x,denC.z);fennec.scale.setScalar(1.5);fennec.position.copy(denC).add(v(2.6,.15,1.8));scene.add(fennec);animals.push(fennec);
const denMound=mesh(new T.SphereGeometry(1,10,6),mat('#c99a5f'),denC.clone().add(v(0,-.6,0)),v(1.7,.85,1.6),scene);denMound.castShadow=false;
// Doves over the oasis.
const doveMat=mat('#e8e2d2');const doves=[];for(let i=0;i<5;i++){const d=new T.Group();mesh(new T.SphereGeometry(1,8,5),doveMat,v(0,0,0),v(.3,.12,.1),d);for(const s of[-1,1]){const w=mesh(new T.ConeGeometry(.09,.5,3),doveMat,v(0,0,s*.28),v(1,1,1),d);w.rotation.x=s*1.4;d.userData['wing'+(s>0?'R':'L')]=w;}d.userData.kind='dove';scene.add(d);doves.push(d);animals.push(d);}
const chapters=[
{title:'First light.<br><i>Long shadows.</i>',line:"The dunes hold the night's cold a little longer.",action:'Walk with the caravan',pos:v(-3,0,10),yaw:2.40,pitch:-.04,skyTop:'#8fb4d6',skyHor:'#f7c489',fog:.0016,ink:'#4a2f14',veil:['#3a240c30','#2a1a08e0','#22150af7'],sun:v(.92,.14,.22),sunColor:'#ffc08a',sunI:2.4,hemiI:1.5,glowAmt:1.1,kind:'caravan',wind:.5},
{title:'The white<br><i>hour.</i>',line:'Light everywhere. Even shadows hide.',action:'Read the wind',pos:v(-2,0,34),yaw:Math.PI,pitch:.1,skyTop:'#a8cfe8',skyHor:'#f4e3c0',fog:.0040,ink:'#4a2f14',veil:['#5a3c1440','#3a240cd8','#2a1a08ee'],sun:v(.15,.95,-.2),sunColor:'#fff4e0',sunI:3.2,hemiI:2.2,glowAmt:.5,kind:'wind',wind:1.6},
{title:'A ring<br><i>of green.</i>',line:'Deep water, rising where the land dips low.',action:'Watch for the sandfish',pos:v(43,0,24),yaw:.695,pitch:-.16,skyTop:'#9cc4e0',skyHor:'#e8ddb0',fog:.0020,ink:'#3f2c12',veil:['#2c2c1030','#22301cd8','#1a2410ee'],sun:v(-.6,.5,.3),sunColor:'#ffe6c0',sunI:2.4,hemiI:1.9,glowAmt:.7,kind:'sandfish',wind:.6},
{title:'The river<br><i>of stars.</i>',line:'The cold returns. The sky fills.',action:'Meet the fennec',pos:v(-17,0,36),yaw:-.44,pitch:-.08,skyTop:'#060b1c',skyHor:'#16233f',fog:.0009,ink:'#f3ead9',veil:['#04081440','#060a1ae0','#04060ef7'],sun:v(-.4,.72,-.5),sunColor:'#a8bcf0',sunI:1.15,hemiI:1.0,glowAmt:.35,kind:'fennec',wind:.3}];
let chapter=0,yaw=2.75,pitch=.05,targetYaw=2.75,targetPitch=.05,night=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=performance.now(),dragged=false,down=null,encountered=false,frames=0;
function groundY(p){p.y=dune(p.x,p.z)+2.6;return p;}chapters.forEach(c=>groundY(c.pos));chapters[2].pos.y+=4.5;camera.position.copy(chapters[0].pos);
function pauseUI(){const b=$('#pause');b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'Resume ambient motion':'Pause ambient motion');b.textContent=paused?'▷':'Ⅱ';}pauseUI();
function changeChapter(n){chapter=(n+4)%4;const c=chapters[chapter];
const ca=elapsed*.03+.32,cx=caraC.x+Math.sin(ca)*caraR,cz=caraC.z+Math.cos(ca)*caraR;const subject=chapter===0?v(cx,dune(cx,cz)+1.2,cz):chapter===2?oasisC.clone().add(v(0,.35,0)):chapter===3?fennec.position.clone().add(v(0,.7,0)):null;
if(subject){const d=subject.sub(c.pos);c.yaw=Math.atan2(d.x,d.z);c.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));}
targetYaw=c.yaw;targetPitch=c.pitch;encountered=false;$('#title').innerHTML=c.title;$('#line').textContent=c.line;$('#encounter').innerHTML=c.action+' <span aria-hidden="true">↗</span>';document.querySelectorAll('[data-chapter]').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.chapter===chapter)));document.documentElement.style.setProperty('--ink',c.ink);$('.veil').style.background=`linear-gradient(${c.veil[0]},transparent 28%,transparent 43%,${c.veil[1]} 77%,${c.veil[2]})`;$('#orientation').classList.remove('show');if(matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(c.pos);yaw=targetYaw;pitch=targetPitch;}}
$('#reset').onclick=()=>{down=null;changeChapter(chapter);yaw=targetYaw;pitch=targetPitch;camera.position.copy(chapters[chapter].pos);};
const facts={caravan:['The long road.','For centuries, camel caravans crossed the Sahara between wells, carrying salt, gold and stories.'],wind:['A travelling desert.',"The Sahara is Earth's largest source of airborne dust. Some of it crosses the Atlantic and helps feed the Amazon rainforest."],sandfish:['A swimmer in sand.',"The sandfish skink doesn't burrow through loose sand - it swims through it, the way a fish moves through water."],fennec:['Ears like sails.','The fennec hunts at night. Its oversized ears shed heat and can hear prey moving under the sand.']};
function encounter(kind){const f=facts[kind];if(!f)return;encountered=true;$('#title').textContent=f[0];$('#line').textContent=f[1];$('#encounter').innerHTML='Return to the crossing <span aria-hidden="true">↙</span>';const animal=kind==='caravan'?camels[1]:kind==='sandfish'?skink:kind==='fennec'?fennec:null;if(animal){const d=animal.position.clone().sub(camera.position);targetYaw=Math.atan2(d.x,d.z);targetPitch=Math.atan2(d.y,Math.hypot(d.x,d.z));}}
$('#encounter').onclick=()=>encountered?changeChapter(chapter):encounter(chapters[chapter].kind);document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>changeChapter(+b.dataset.chapter));$('#pause').onclick=()=>{paused=!paused;pauseUI();};$('#about').onclick=()=>$('#notes').showModal();$('#close').onclick=()=>$('#notes').close();$('#notes').onclick=e=>{if(e.target===$('#notes'))$('#notes').close();};
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};dragged=false;canvas.setPointerCapture(e.pointerId);$('#orientation').classList.remove('show');});canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.lx,dy=e.clientY-down.ly;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;targetYaw-=dx*.006;targetPitch=Math.max(-.65,Math.min(.85,targetPitch+dy*.004));down.lx=e.clientX;down.ly=e.clientY;});const caster=new T.Raycaster();canvas.addEventListener('pointerup',e=>{if(down&&!dragged){caster.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);const hit=caster.intersectObjects(animals,true)[0];if(hit){let o=hit.object;while(o.parent&&!o.userData.kind)o=o.parent;encounter(o.userData.kind);}}down=null;});canvas.addEventListener('pointercancel',()=>down=null);
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')targetYaw+=.16;if(e.key==='ArrowRight')targetYaw-=.16;if(e.key==='ArrowUp')targetPitch=Math.min(.85,targetPitch+.12);if(e.key==='ArrowDown')targetPitch=Math.max(-.65,targetPitch-.12);$('#orientation').classList.remove('show');}});
let sx=0,navDown=false,navSwiped=false;const nav=$('nav');nav.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();changeChapter(chapter+(e.key==='ArrowRight'?1:-1));nav.querySelector('[aria-current=true]').focus();}});nav.addEventListener('pointerdown',e=>{sx=e.clientX;navDown=true;navSwiped=false;});nav.addEventListener('pointerup',e=>{if(!navDown)return;navDown=false;const dx=e.clientX-sx;if(Math.abs(dx)>45){navSwiped=true;changeChapter(chapter+(dx<0?1:-1));}});nav.addEventListener('click',e=>{if(navSwiped){e.preventDefault();e.stopImmediatePropagation();navSwiped=false;}},true);
let audioCtx,audioGain;$('#sound').onclick=()=>{if(!audioCtx){audioCtx=new AudioContext();const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*3,audioCtx.sampleRate),data=buffer.getChannelData(0);let b=0;for(let i=0;i<data.length;i++){b=(b+Math.random()*.02-.01)/1.015;data[i]=b*3.4;}const src=audioCtx.createBufferSource();src.buffer=buffer;src.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=300;audioGain=audioCtx.createGain();audioGain.gain.value=0;src.connect(filter).connect(audioGain).connect(audioCtx.destination);src.start();}const on=$('#sound').getAttribute('aria-pressed')!=='true';audioCtx.resume();audioGain.gain.setTargetAtTime(on?.26:0,audioCtx.currentTime,.6);$('#sound').setAttribute('aria-pressed',String(on));$('#sound').setAttribute('aria-label',on?'Turn desert sound off':'Turn desert sound on');$('#sound').textContent=on?'♫':'♪';};document.addEventListener('visibilitychange',()=>{last=performance.now();if(audioCtx){if(document.hidden)audioCtx.suspend();else if($('#sound').getAttribute('aria-pressed')==='true')audioCtx.resume();}});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const look=v(0,0,0),bg=new T.Color(),sunPos=v(0,0,0),skyTopC=new T.Color(),skyHorC=new T.Color(),sunColC=new T.Color(),glowC=new T.Color('#ffb36b');
function animate(now){requestAnimationFrame(animate);if(document.hidden)return;const dt=Math.min((now-last)/1000,.15);last=now;if(!paused&&!encountered)elapsed+=dt;const c=chapters[chapter];camera.position.lerp(c.pos,1-Math.exp(-dt*4));if(matchMedia('(prefers-reduced-motion: reduce)').matches){yaw=targetYaw;pitch=targetPitch;}else{yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*9));pitch+=(targetPitch-pitch)*(1-Math.exp(-dt*9));}look.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).add(camera.position);camera.lookAt(look);
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
for(let i=0;i<camels.length;i++){const a=elapsed*.03+i*.32,x=caraC.x+Math.sin(a)*caraR,z=caraC.z+Math.cos(a)*caraR,g=camels[i];g.position.set(x,dune(x,z),z);g.rotation.y=a+Math.PI;g.position.y+=Math.abs(Math.sin(elapsed*1.6+i*1.6))*.06;const legs=g.userData.legs;for(let l=0;l<4;l++)legs[l].rotation.x=Math.sin(elapsed*1.6+i*1.6+(l%2)*Math.PI)*.3;}
skink.position.set(skinkC.x+Math.sin(elapsed*.5)*3,0,skinkC.z+Math.cos(elapsed*.5)*2);skink.position.y=dune(skink.position.x,skink.position.z)+.25+Math.max(0,Math.sin(elapsed*1.1))*.5;skink.rotation.y=elapsed*.5+Math.PI/2;skink.rotation.z=Math.cos(elapsed*1.1)*.7;
fennec.position.y=denC.y+.25+Math.sin(elapsed*1.3)*.02;const fe=fennec.userData;fe.earL.rotation.z=Math.sin(elapsed*2.1)*.12;fe.earR.rotation.z=-Math.sin(elapsed*1.7)*.12;fennec.rotation.y=Math.sin(elapsed*.23)*.5+2.2;
for(let i=0;i<doves.length;i++){const a=elapsed*.25+i*1.26,d=doves[i];d.position.set(oasisC.x+Math.sin(a)*16,oasisC.y+11+Math.sin(elapsed*.9+i)*2,oasisC.z+Math.cos(a)*16);d.rotation.y=a+Math.PI/2;d.userData.wingL.rotation.z=Math.sin(elapsed*7+i)*.7;d.userData.wingR.rotation.z=-Math.sin(elapsed*7+i)*.7;}
const sp=streaks.geometry.attributes.position;for(let i=0;i<sp.count;i++){let x=(streakBase[i]+elapsed*c.wind*9)%140;if(x>70)x-=140;if(x<-70)x+=140;sp.setX(i,x);}sp.needsUpdate=true;streaks.position.set(camera.position.x,0,camera.position.z);streaks.material.opacity=.35*(1-night*.6);
canvas.dataset.yaw=yaw.toFixed(5);canvas.dataset.pitch=pitch.toFixed(5);canvas.dataset.entryYaw=c.yaw.toFixed(5);canvas.dataset.entryPitch=c.pitch.toFixed(5);document.body.dataset.chapter=chapter;$('#compass').textContent=['N','E','S','W'][Math.floor((((yaw*180/Math.PI)%360+360+45)%360)/90)]+' · '+String(Math.round((yaw*180/Math.PI%360+360)%360)).padStart(3,'0')+'°';renderer.render(scene,camera);if(++frames===2){$('#status').remove();}if(frames===500)$('#orientation').classList.remove('show');}
changeChapter(0);requestAnimationFrame(animate);
