import test from 'node:test';
import assert from 'node:assert/strict';
import { rotate4, hopfPoint, cubeVertices, cubeEdges, mobius, geodesicPoint, juliaSample, advancedDefaults, drawAdvanced } from '../advanced.mjs';
import { topologyLoopPoint, drivenRegimeFieldStep, drivenRegimeTarget } from '../core.mjs';
import { validateEffects } from '../effects.mjs';
const norm = v => Math.hypot(...v);

test('tesseract graph and double rotations preserve 4D geometry', () => {
  assert.equal(cubeVertices.length, 16); assert.equal(cubeEdges.length, 32);
  for (let i = 0; i < 16; i++) assert.equal(cubeEdges.filter(edge => edge.includes(i)).length, 4);
  for (let i = 0; i < 200; i++) {
    const a = i * .071, b = -i * .11;
    const rotated = cubeVertices.map(v => rotate4(v, a, b));
    rotated.forEach(v => assert.ok(Math.abs(norm(v) - 1) < 1e-12));
    for (const [u, v] of cubeEdges) assert.ok(Math.abs(norm(rotated[u].map((x, d) => x - rotated[v][d])) - 1) < 1e-12);
  }
});
test('Hopf fibers remain on S3 and map to a single S2 point', () => {
  const hopf = ([x,y,z,w]) => [2 * (x*z+y*w), 2 * (y*z-x*w), x*x+y*y-z*z-w*w];
  for (const theta of [.1, .7, 1.4, 2.9]) for (const phi of [0, 1, 2]) {
    const origin = hopf(hopfPoint(theta, phi, 0));
    for (let i = 0; i <= 100; i++) { const point = hopfPoint(theta, phi, i / 100 * Math.PI * 2); assert.ok(Math.abs(norm(point) - 1) < 1e-12); assert.ok(norm(hopf(point).map((x,d) => x-origin[d])) < 1e-12); }
  }
});
test('Poincare paths meet boundary orthogonally and disk isometries preserve distances', () => {
  const distance = (u,v) => Math.acosh(1+2*norm(u.map((x,d)=>x-v[d]))**2/((1-norm(u)**2)*(1-norm(v)**2)));
  for (const separation of [.18,.4,1.3]) {
    const end = geodesicPoint(.7, separation, 0), adjacent = geodesicPoint(.7, separation, 1e-6);
    assert.ok(Math.abs(norm(end)-1)<1e-12);
    const tangent = adjacent.map((x,d)=>x-end[d]);
    assert.ok(Math.abs(tangent[0]*end[1]-tangent[1]*end[0])/norm(tangent)<1e-5);
    for (let j=1;j<100;j++) assert.ok(norm(geodesicPoint(.7,separation,j/100))<1);
  }
  const a=[.6,.2], u=[.1,.3], v=[-.4,.2];
  assert.ok(Math.abs(distance(u,v)-distance(mobius(u,a),mobius(v,a)))<1e-12);
});
test('Julia samples distinguish known bounded and escaped orbits without nonfinite colors', () => {
  assert.equal(juliaSample(0,0,0,0,80).escaped,false);
  assert.equal(juliaSample(2,0,0,0,80).escaped,true);
  for(let i=0;i<100;i++){ const s=juliaSample(Math.sin(i)*2,Math.cos(i)*2,-.745,.186,112); assert.ok(Number.isFinite(s.smooth)); assert.ok(s.trap>=0&&s.trap<=1); }
});
test('topology camera and time change the whole curve, not just the starting sample', () => {
  function cloud(f,c,p){return Array.from({length:180},(_,i)=>topologyLoopPoint(f,i/180,.6,c,p));}
  function displacement(a,b){return a.reduce((sum,v)=>sum+Math.min(...b.map(w=>norm(v.map((x,d)=>x-w[d])))),0)/a.length;}
  for(let f=0;f<4;f++){ const base=cloud(f,.25,0); assert.ok(displacement(base,cloud(f,.25,1))>.015); assert.ok(displacement(base,cloud(f,.5,0))>.015); }
});
test('all driven regimes keep spatial contrast after ten seconds', () => {
  const width=32,height=20;
  for(let regime=0;regime<6;regime++) {
    let values=new Float64Array(width*height).fill(.5),next=new Float64Array(width*height);
    for(let frame=0;frame<300;frame++) {
      for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
        const i=y*width+x, neighbor=(values[y*width+(x+1)%width]+values[y*width+(x+width-1)%width]+values[((y+1)%height)*width+x]+values[((y+height-1)%height)*width+x])/4;
        next[i]=drivenRegimeFieldStep(values[i],neighbor,drivenRegimeTarget(x/width-.5,y/height-.5,frame/30,regime,.5,.4),.64,.58,1/30);
      } [values,next]=[next,values];
    }
    const mean=values.reduce((a,b)=>a+b)/values.length, sd=Math.sqrt(values.reduce((sum,x)=>sum+(x-mean)**2,0)/values.length);
    assert.ok(sd>.04, `regime ${regime} has contrast ${sd}`); assert.ok(values.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
  }
});
test('advanced paused turns and Hopf projection visibly change draw commands', () => {
  function commands(params) {const result=[]; const ctx={canvas:{width:960,height:600},fillRect(){},save(){},restore(){},translate(){},beginPath(){},stroke(){},fill(){},moveTo(...p){result.push(p)},lineTo(...p){result.push(p)},arc(...p){result.push(p)}};drawAdvanced(ctx,null,'fourspace',params,0,{primary:'#ffffff',secondary:'#ff0000',accent:'#0000ff'},false);return result;}
  const p=advancedDefaults.fourspace; assert.notDeepEqual(commands(p),commands({...p,rotation:.7})); assert.notDeepEqual(commands({...p,shape:1}),commands({...p,shape:1,perspective:0}));
});
test('effect stacks reject hostile or nonfinite strengths and support older sessions',()=>{
  assert.deepEqual(validateEffects(undefined),{symmetry:0,echo:0,chroma:0,glow:0});
  for(const bad of [null,[],{symmetry:NaN,echo:0,chroma:0,glow:0},{symmetry:0,echo:2,chroma:0,glow:0},{symmetry:0,echo:0,chroma:0,glow:0,unknown:1}]) assert.throws(()=>validateEffects(bad));
});
