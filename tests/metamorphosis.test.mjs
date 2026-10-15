import test from 'node:test';
import assert from 'node:assert/strict';
import scene from '../scene-metamorphosis.mjs';
import { organism, createGeometry, petalPoint, projectPoint } from '../metamorphosis-geometry.mjs';
import { presetSnapshot } from '../session.mjs';
import { continuousDevelopment } from '../worlds.mjs';

test('Unfolding Garden preserves all look names, seeds, schema and continuous identity', () => {
  assert.deepEqual(scene.presets.map(p=>[p.name,p.seed]),[
    ['First Filaments',112],['Pearl Membranes',112],['Open Blossom',112],
    ['Wandering Threads',847],['Silver Canopy',847],['Evening Blossom',2451],
  ]);
  assert.deepEqual(scene.schema.map(p=>p.key),['development','sway','speed','light']);
  assert.deepEqual(continuousDevelopment([0,1,2].map(i=>({snapshot:presetSnapshot(scene,i)})),scene),{
    key:'development',min:0,max:2,positions:[0,1,2],
  });
  for(const p of scene.presets)for(const f of scene.schema)
    assert.ok(p.params[f.key]>=f.min&&p.params[f.key]<=f.max);
  const a=createGeometry(112),b=createGeometry(112);
  assert.deepEqual(a,b);
  assert.ok(a.length/8<150000,'bounded static tessellation pays for perspective/materials');
  assert.equal(a.length%24,0);
  for(let i=0;i<a.length;i+=8){assert.ok(Number.isFinite(a[i]));assert.equal(a[i+7],Math.floor(a[i+7]));}
  assert.match(scene.geometry.vertex,/depth\*1\.0168067-\.20168067,depth/);
});

test('filaments fill adjacent sectors into one membrane and reverse without changing ancestry', () => {
  for(const node of organism(112))for(let p=0;p<node.petals;p++)for(const t of [.1,.4,.8,1]) {
    const right=petalPoint(node,p,t,1,1,{sway:0});
    const left=petalPoint(node,(p+1)%node.petals,t,-1,1,{sway:0});
    assert.ok(Math.hypot(...right.map((x,i)=>x-left[i]))<1e-12,'adjacent membrane seams meet');
    for(const d of [0,.25,.75,1,1.25,1.75,2]) {
      const args=[node,p,t,.3,d,{phase:120,sway:2}];
      const before=petalPoint(...args);
      petalPoint(node,p,t,.3,2-d,{phase:120,sway:2});
      assert.deepEqual(petalPoint(...args),before,'no hysteresis or seed reset');
      const after=petalPoint(node,p,t,.3,d+1e-5,{phase:120,sway:2});
      assert.ok(before.every(Number.isFinite));
      assert.ok(Math.hypot(...after.map((x,i)=>x-before[i]))<1e-4);
    }
  }
});

test('the top blossom is larger than its membrane and the hero fits landscape and portrait', () => {
  for(const seed of [112,847,2451]) {
    const hero=organism(seed)[1];
    const root=petalPoint(hero,0,0,0,0,{sway:0});
    const membrane=petalPoint(hero,0,1,0,1,{sway:0});
    const blossom=petalPoint(hero,0,1,0,2,{sway:0});
    assert.ok(Math.hypot(...blossom.map((x,i)=>x-root[i]))>Math.hypot(...membrane.map((x,i)=>x-root[i]))*1.3);
    for(const time of [0,30,120,1000,43200])for(const aspect of [16/9,9/16])
      for(const d of [0,.5,1,1.5,2])for(let p=0;p<hero.petals;p++)for(const t of [.2,.5,.8,1])for(const v of [-1,0,1]) {
        const q=petalPoint(hero,p,t,v,d,{phase:time%150,sway:2,edgeGesture:1});
        const [x,y,z]=projectPoint(q,time,aspect,1);
        assert.ok(z>.1&&z<12);
        assert.ok(Math.abs(x)<.99&&Math.abs(y)<.99,`cropped hero seed=${seed} d=${d} t=${time}: ${x},${y}`);
      }
  }
});
