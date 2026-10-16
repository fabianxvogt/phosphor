import { familyEffect } from "./family-rhythm.mjs";
import { lateClockGlsl } from "./scene-time.mjs";

// Air / soap / air, including the phase reversal at the first interface.
// Wavelength and thickness share units (nanometres). Unpolarised Airy film.
export function filmReflectance(thickness, cosine, wavelength, index = 1.333) {
  const c = Math.max(0.0001, Math.min(1, Math.abs(cosine)));
  const ct = Math.sqrt(1 - (1 - c * c) / (index * index));
  const rs = ((c - index * ct) / (c + index * ct)) ** 2;
  const rp = ((index * c - ct) / (index * c + ct)) ** 2;
  const phase = (4 * Math.PI * index * thickness * ct) / wavelength;
  const airy = (r) =>
    (2 * r * (1 - Math.cos(phase))) / (1 + r * r - 2 * r * Math.cos(phase));
  return (airy(rs) + airy(rp)) / 2;
}
// CPU reference for the normalised, seam-free thickness chart below.
// `q` is the cell-local position after the shared slow chart rotation.
export function filmThickness(
  q,
  {
    thickness = 640,
    drainage = 0.65,
    flow = 0,
    drain = 0,
    id = 0,
    rhythm = 0,
  } = {},
) {
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const [x, y, z] = q;
  const vx = x - 0.17,
    vy = y + 0.12;
  const angle =
    2.8 * Math.exp(-(vx * vx + vy * vy) * 2.4) + 0.3 * Math.sin(flow);
  const v = [
    Math.cos(angle) * vx + Math.sin(angle) * vy,
    -Math.sin(angle) * vx + Math.cos(angle) * vy,
  ];
  const curl =
    Math.sin(4.8 * v[0] + 1.5 * Math.sin(2.7 * z + flow)) +
    Math.sin(3.1 * z - flow + Math.sin(v[1] * 3));
  const height =
    y +
    0.28 * curl +
    0.035 * Math.sin(23 * v[0] + curl * 3 + Math.sin(8 * y + flow));
  const reservoir = 0.82 - 0.75 * height + 0.055 * Math.sin(drain + id * 0.71);
  const cap = 1 - smooth(0.48 - 0.25 * drainage, 0.86, y + 0.045 * curl);
  const d = Math.max(
    6,
    thickness *
      (reservoir + 0.075 * Math.sin(12 * height + flow)) *
      (0.015 + 0.985 * cap),
  );
  return d * (1 + 0.075 * rhythm * Math.exp(-(((y - 0.25) / 0.8) ** 2)));
}
export function filmPalettePosition(thickness, cosine) {
  const mu = Math.min(1, Math.abs(cosine));
  const ct = Math.sqrt(1 - (1 - mu * mu) / 1.333 ** 2);
  const fringe =
    0.5 + 0.5 * Math.sin((4 * Math.PI * 1.333 * thickness * ct) / 550);
  return 0.02 + 0.79 * fringe + 0.17 * fringe ** 12;
}
export const PLATEAU_SITES = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
].map((p) => p.map((x) => x / Math.sqrt(8)));
export const PLATEAU_BORDER_ANGLE = Math.acos(-1 / 3);
const base = {
  thickness: 640,
  flow: 0.8,
  orbit: 0.55,
  drainage: 0.65,
  borders: 0.6,
  chamber: 1,
  elevation: 0.45,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});
const schema = [
  {
    key: "development",
    label: "Development · bubble / cluster / foam",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "thickness",
    label: "Film thickness",
    min: 220,
    max: 1100,
    step: 1,
    default: 640,
  },
  {
    key: "flow",
    label: "Marangoni flow",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0.8,
  },
  {
    key: "orbit",
    label: "Bubble drift",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.55,
  },
  {
    key: "drainage",
    label: "Film drainage",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.65,
  },
  {
    key: "borders",
    label: "Plateau borders",
    min: 0.2,
    max: 1.2,
    step: 0.01,
    default: 0.6,
  },
  {
    key: "chamber",
    label: "Cathedral span",
    min: 0.7,
    max: 1.3,
    step: 0.01,
    default: 1,
  },
  {
    key: "elevation",
    label: "Floating viewpoint",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
  },
];
const fragment = `${lateClockGlsl}
vec3 soapC[4];
float soapR[4];
float flowPhase, cameraPhase, drainPhase, form, cathedral, pixel;
vec3 radiance, filmCentre;
float opticalDepth, filmScale, focusDistance;
float soapDefocus(float t) { return abs(t-focusDistance)*cathedral*.006; }
mat2 soapTurn;
const vec3 tetra[4] = vec3[4](vec3(1,1,1),vec3(1,-1,-1),vec3(-1,1,-1),vec3(-1,-1,1));

vec2 soapSpan(vec3 ro, vec3 rd, vec3 centre, float radius) {
 vec3 q=ro-centre;float b=dot(q,rd),h=b*b-dot(q,q)+radius*radius;
 return h>0.0?vec2(-b-sqrt(h),-b+sqrt(h)):vec2(1000.0,-1000.0);
}
vec3 soapAiry(float thickness,float mu) {
 float c=max(abs(mu),0.0001),n=1.333;
 float ct=sqrt(1.0-(1.0-c*c)/(n*n));
 float rs=sq((c-n*ct)/(c+n*ct)),rp=sq((n*c-ct)/(n*c+ct));
 vec3 phase=4.0*PI*n*thickness*ct/vec3(460.0,550.0,650.0);
 vec3 cp=cos(phase),s=1.0-cp;
 return .5*(2.0*rs*s/(1.0+rs*rs-2.0*rs*cp)+2.0*rp*s/(1.0+rp*rp-2.0*rp*cp));
}
// Projected studio cards curve in the reflected direction, including the
// crossbar of the key window. The film reflects a room, not painted stripes.
float soapBox(vec3 r,vec3 direction,vec2 size,float mullion) {
 vec3 z=normalize(direction),x=normalize(cross(vec3(0,1,0),z)),y=cross(z,x);
 float facing=dot(r,z);
 vec2 uv=vec2(dot(r,x),dot(r,y))/max(facing,.001);
 vec2 edge=abs(uv)-size;
 float panel=(1.0-smoothstep(-.035,.035,max(edge.x,edge.y)))*step(0.0,facing);
 float bars=mix(1.0,.35,mullion*(1.0-smoothstep(.012,.022,min(abs(uv.x),abs(uv.y)))));
 return panel*bars;
}
vec3 soapRoom(vec3 r) {
 vec3 pale=mix(u_secondary,vec3(1.0),.85);
 float key=soapBox(r,vec3(-.55,.65,.65),vec2(.26,.47),1.0);
 float strip=soapBox(r,vec3(.85,.15,.4),vec2(.04,.65),0.0);
 float fill=pow(max(dot(r,normalize(vec3(-.6,.6,-.5))),0.0),6.0);
 float lamp=pow(max(dot(r,normalize(vec3(.5,-.3,-.8))),0.0),85.0);
 return pale*(.018+7.0*key+.16*fill)+mix(u_primary,vec3(1.0),.2)*strip*3.4+palette(.73)*lamp*1.8;
}
void soapFilm(vec3 p,vec3 n,vec3 rd,float distance,float id,float edge,float coverage) {
 if(coverage<=0.0||distance<.03)return;
 vec3 q=(p-filmCentre)/filmScale; q.xz=soapTurn*q.xz;
 float mu=clamp(abs(dot(n,rd)),0.0,1.0);
 // A smooth, cell-local thickness field: gravity drains the top, while
 // a compact vortex bends the draining layers into a whorl.
 // Cartesian rotation has no atan chart seam or singular vortex centre.
 vec2 vortex=q.xy-vec2(.17,-.12);
 vortex=rot2(2.8*exp(-dot(vortex,vortex)*2.4)+.3*sin(flowPhase))*vortex;
 float curl=sin(4.8*vortex.x+1.5*sin(2.7*q.z+flowPhase))+sin(3.1*q.z-flowPhase+sin(vortex.y*3.0));
 // The phase advances downwards: gravity carries fine folded contours
 // into the thicker lower reservoir. A continuously renewed black cap
 // is optically thin, not an opaque dark patch painted on the sphere.
 float height=q.y+.28*curl+.035*sin(23.0*vortex.x+curl*3.0+sin(8.0*q.y+flowPhase));
 float drain=.82-.75*height+.055*sin(drainPhase+id*.71);
 float blackCap=1.0-smoothstep(.48-.25*u_params[4],.86,q.y+.045*curl);
 float thickness=max(6.0,u_params[1]*(drain+.075*sin(12.0*height+flowPhase))*(.015+.985*blackCap));
 thickness*=1.0+.075*u_rhythm.x*exp(-sq((q.y-.25)/.8));
 vec3 orders=soapAiry(thickness,mu);
 float coherence=exp(-sq(soapDefocus(distance)*13.0));
 float fringe=.5+.5*coherence*sin(4.0*PI*1.333*thickness*sqrt(1.0-(1.0-mu*mu)/sq(1.333))/550.0);
 // Optical order indexes the user's palette, never an RGB spectral rainbow.
 vec3 iridescence=palette(.02+.79*fringe+.17*pow(fringe,12.0));
 vec3 reflected=soapRoom(reflect(rd,n));
 float fresnel=.02+.98*pow(1.0-mu,3.5);
 float response=dot(orders,vec3(1.0/3.0));
 float grazing=pow(1.0-mu,12.0);
 float rim=exp(-edge/max(.006*u_params[5],distance*pixel*.85+soapDefocus(distance)*.3));
 float localPulse=1.0+.22*u_kick+.28*u_rhythm.y*exp(-sq(q.y-.5));
 float band=pow(fringe,3.0);
 vec3 colour=iridescence*(.008+(6.1+.8*band)*response+.10*grazing)*(.65+.35*max(dot(n,normalize(vec3(-.5,.7,.4))),0.0));
 // The room lights have radiance above one: a 4% film reflection must
 // still carry a readable curved softbox, without an opaque diffuse coat.
 colour+=reflected*(.10+.85*fresnel)*(.2+4.5*response);
 colour+=mix(iridescence,vec3(1.0),.40)*(grazing*.38+pow(1.0-mu,38.0)*1.5);
 colour+=mix(u_secondary,vec3(1.0),.72)*rim*2.7*localPulse;
 float rare=pow(fringe,22.0)*pow(max(dot(n,normalize(vec3(.2,.9,.3))),0.0),8.0);
 colour+=u_accent*rare*.65*(1.0+u_rhythm.z);
 float fog=exp(-distance*mix(.025,.075,cathedral));
 radiance+=(colour*fog+palette(.23)*.008*(1.0-fog))*coverage;
 opticalDepth+=(.04+.25*response+.1*fresnel)*coverage*fog;
}
// A cell is a spherical envelope clipped to its equal-pressure Voronoi
// region. Shared faces are emitted once. Equilateral triples have 120°
// films; the four regular-tetrahedral borders meet at acos(-1/3).
void soapGroup(vec3 ro,vec3 rd,vec3 centre,float radius,float growth,float groupId) {
 if(growth<.001)return;
 float size=radius*growth;
 filmCentre=centre;filmScale=max(size,.001);
 vec2 bound=soapSpan(ro,rd,centre,size*1.7);
 if(bound.x>bound.y||bound.y<0.0)return;
 for(int j=0;j<4;j++) {
  float g=j==0?1.0:form;
  vec3 off=(tetra[j]-tetra[0]*(1.0-form))*.3535533905932738*size*form;
  off.xy=rot2(groupId*.73)*off.xy;
  off.yz=rot2(groupId*1.13)*off.yz;
  off.xz=soapTurn*off.xz;
  soapC[j]=centre+off;
  soapR[j]=size*g;
 }
 // Every tetrahedral centre distance is size*form, including during
 // growth. Reuse this exact norm instead of taking per-candidate roots.
 float planeNorm=max(size*form,.0001);
 for(int j=0;j<4;j++) {
  if(soapR[j]<.001)continue;
  vec3 rayOffset=ro-soapC[j];float tc=-dot(rayOffset,rd);
  float impact=sqrt(max(dot(rayOffset,rayOffset)-tc*tc,0.0));
  float footprint=max(tc*pixel/1.85,.0001)+soapDefocus(tc);
  float cover=1.0-smoothstep(soapR[j]-footprint,soapR[j]+footprint,impact);
  if(cover<=0.0)continue;
  float halfChord=sqrt(max(sq(soapR[j])-impact*impact,0.0));
  vec2 span=vec2(tc-halfChord,tc+halfChord);
  for(int side=0;side<2;side++) {
   // At full foam rear films have zero weight. Reject before clipping,
   // not after all four power planes have already been evaluated.
   float attenuation=side==0?1.0:.12*(1.0-cathedral);
   if(attenuation<.001)continue;
   float t=side==0?span.x:span.y;
   if(t<.03)continue;
   vec3 p=ro+rd*t;float clip=100.0;
   for(int k=0;k<4;k++) {
    if(j==k||soapR[k]<.001)continue;
    vec3 d=soapC[k]-soapC[j];
    float plane=(dot(soapC[k]+soapC[j],d)+sq(soapR[j])-sq(soapR[k]))*.5;
    clip=min(clip,(plane-dot(p,d))/planeNorm);
   }
   float aa=max(t*pixel, .0005)+soapDefocus(t);
   soapFilm(p,normalize(p-soapC[j]),rd,t,groupId*4.0+float(j),abs(clip),cover*attenuation*smoothstep(-aa,aa,clip));
  }
 }
 for(int j=0;j<4;j++)for(int k=0;k<4;k++) {
  if(k<=j||soapR[k]<.001||soapR[j]<.001)continue;
  vec3 d=soapC[k]-soapC[j];
  vec3 n=d/planeNorm;
  float plane=(dot(soapC[k]+soapC[j],d)+sq(soapR[j])-sq(soapR[k]))*.5;
  float denom=dot(rd,n);if(abs(denom)<.0001)continue;
  float t=(plane/planeNorm-dot(ro,n))/denom;if(t<.03)continue;
  vec3 p=ro+rd*t;
  float aa=max(t*pixel,.0005)+soapDefocus(t);
  float clip=soapR[j]-length(p-soapC[j]);
  if(clip < -aa)continue; // Conservative disc rejection includes the AA fringe.
  for(int m=0;m<4;m++) {
   if(m==j||m==k||soapR[m]<.001)continue;
   vec3 dm=soapC[m]-soapC[j];
   float pl=(dot(soapC[m]+soapC[j],dm)+sq(soapR[j])-sq(soapR[m]))*.5;
   clip=min(clip,(pl-dot(p,dm))/planeNorm);
  }
  soapFilm(p,dot(n,rd)>0.0?-n:n,rd,t,groupId*4.0+float(j+k)*.5,abs(clip),.45*smoothstep(-aa,aa,clip));
 }
}
void main(){
 float dev=clamp(u_params[0],0.0,2.0);form=smoothstep(0.0,1.0,dev);cathedral=smoothstep(1.0,2.0,dev);
#ifdef PHOSPHOR_LATE
 flowPhase=u_clock[0];cameraPhase=u_clock[1];drainPhase=u_clock[2];
#else
 flowPhase=u_time*u_params[2]*.19;cameraPhase=u_time*u_params[3]*.035;drainPhase=u_time*.085;
#endif
 pixel=1.0/min(u_resolution.x,u_resolution.y);
 float seedAngle=float(u_seedBits%997u)*.006302;
 soapTurn=rot2(.16*sin(cameraPhase)+seedAngle);
 vec2 uv=aspectUV()/min(u_resolution.x/u_resolution.y,1.0);
 float az=(.13+.10*cathedral)*sin(cameraPhase),h=(u_params[7]-.5)*1.2;
 vec3 target=vec3(0,h*.2,-4.2*cathedral);
 vec3 ro=vec3(sin(az)*(5.4+3.0*form),h+.18*sin(cameraPhase*2.0)+.16*cathedral*sin(cameraPhase),5.4+3.0*form-2.9*cathedral);
 focusDistance=length(target-ro);
 vec3 fw=normalize(target-ro),right=normalize(cross(fw,vec3(0,1,0))),up=cross(right,fw);
 vec3 rd=normalize(fw*1.85*(1.0+.018*u_kick)+uv.x*right+uv.y*up);
 radiance=vec3(0);opticalDepth=0.0;
 vec3 centre=vec3(.07*sin(flowPhase),.06*cos(flowPhase),-4.2*cathedral);
 soapGroup(ro,rd,centre,1.0+.45*cathedral,1.0,0.0);
 // Persistent buttresses grow out along a nave, not a switched scene.
 for(int i=0;i<6;i++){
  float id=float(i),side=mod(id,2.0)*2.0-1.0;
  float row=floor(id*.5),vault=step(1.5,row);
  vec3 c=vec3(side*mix(3.5,1.85,vault),mix(-.6,2.5,vault),mix(.3-row*4.5,-8.0,vault));
  c=mix(centre,c*u_params[6],cathedral);
  float growth=cathedral*cathedral*(.8+.2*smoothstep(0.0,.9,u_level));
  soapGroup(ro,rd,c,mix(1.2,.95,vault)*(1.0+.1*sin(id*4.7+seedAngle)),growth,id+1.0);
 }
 // Smaller, seeded cells suspended beneath the vault give the giant films
 // a human scale. Their identities and closed drift paths never regenerate.
 for(int i=0;i<9;i++){
  float id=float(i),a=id*2.39996323+seedAngle;
  vec3 c=vec3(cos(a)*(2.15+.12*sin(id)),sin(a)*2.2,-5.3+.35*sin(id*3.0+flowPhase));
  float radius=(.14+.18*fract(id*.6180339)) * cathedral*cathedral;
  vec3 delta=ro-c;float tc=-dot(delta,rd),impact=sqrt(max(dot(delta,delta)-tc*tc,0.0));
  float aa=max(tc*pixel/1.85,.0001),cover=1.0-smoothstep(radius-aa,radius+aa,impact);
  if(radius>.001&&tc>0.0&&cover>0.0){
   float t=tc-sqrt(max(radius*radius-impact*impact,0.0));vec3 p=ro+rd*t;
   filmCentre=c;filmScale=radius;
   soapFilm(p,normalize(p-c),rd,t,id+40.0,100.0,.7*cover);
  }
 }
 // Dark photographic studio: defocused palette practicals recede behind
 // the films. Positions are world-space so the camera produces parallax.
 vec3 background=u_secondary*(.006+.012*exp(-sq(rd.y+.13)*14.0));
 background+=mix(u_primary,u_secondary,.6)*.009*exp(-dot(uv,uv)*2.0);
 for(int i=0;i<5;i++){
  float id=float(i),side=mod(id,2.0)*2.0-1.0;
  vec3 lightPos=vec3(side*(3.2+id*.8),sin(id*3.7)*2.8,-5.0-id*3.0);
  vec3 delta=lightPos-ro;float t=dot(delta,rd);
  float d=length(delta-rd*t)/max(t,.001);
  float radius=.012+.004*id;
  float disc=1.0-smoothstep(radius*.45,radius*1.65,d);
  float halo=exp(-sq(d/(radius*2.8)))*.12;
  background+=palette(.2+id*.15)*(disc+halo)*.20*step(0.0,t);
 }
 // A restrained light pool beneath the suspended nave is a scale cue.
 if(rd.y<-.0001){
  float t=(-2.9-ro.y)/rd.y;vec3 p=ro+rd*t;
  float pool=exp(-sq(p.x/3.5)-sq((p.z+2.0)/6.0));
  background+=mix(u_secondary,u_primary,.35)*pool*.035*cathedral*exp(-t*.04);
 }
 vec3 col=background*exp(-opticalDepth)+radiance/(1.0+.32*opticalDepth);
 col*=1.0-.12*smoothstep(.5,1.2,length(uv));
 outColor=vec4(max(col,vec3(0)),1.0);
}
`;
export default {
  id: "soap",
  number: 113,
  name: "Soap Cathedral",
  description:
    "One iridescent bubble gathers draining films and Plateau junctions, then grows into a vaulted cathedral of luminous foam.",
  development: "development",
  schema,
  presets: [
    look("Bubble", 11301, 0),
    look("Cluster", 11301, 1),
    look("Foam", 11301, 2),
    look("Pearl Vessel", 11302, 0.2, {
      thickness: 390,
      flow: 0.45,
      elevation: 0.7,
    }),
    look("Tidal Glass", 11303, 0.9, {
      thickness: 920,
      drainage: 0.9,
      orbit: 0.3,
    }),
    look("Quiet Junction", 11304, 1.2, {
      thickness: 480,
      borders: 1.05,
      elevation: 0.2,
      flow: 0.5,
    }),
    look("Opal Nave", 11305, 2, {
      thickness: 780,
      chamber: 1.25,
      elevation: 0.7,
      orbit: 0.4,
    }),
    look("Black Pearl", 11306, 1.8, {
      thickness: 270,
      chamber: 0.8,
      drainage: 0.3,
      borders: 0.35,
    }),
  ],
  stage: ["thickness", "drainage", "borders"],
  type: { key: "development", values: [0, 1, 2] },
  energy: { flow: { mul: [0.65, 1.35] }, orbit: { mul: [0.75, 1.3] } },
  beat: { punch: 0.07, pulse: 0.08 },
  clocks: [
    { rate: (p) => p[2] * 0.19, period: 2 * Math.PI },
    { rate: (p) => p[3] * 0.035, period: 2 * Math.PI },
    { rate: () => 0.085, period: 2 * Math.PI },
  ],
  rhythmStyles: { restrained: "Thin silence", driving: "Opal breathing", accented: "Iridescent bells" },
  rhythm: [
    familyEffect(
      "fringe-order",
      0,
      "Fringe order",
      "A local thickness wave travels through the existing interference bands.",
      { period: 4, strength: 0.55, duration: 1.5, steps: "X...", styles: {
        restrained: { steps: "X....... | .....x.. | ...X.... | ....x...", division: 2, strength: 0.48, duration: 1.4 },
        driving: { steps: "X...x..X | ..x...X.", division: 2, strength: 0.72, duration: 0.8 },
        accented: { steps: "X..x...X..x...X..x..", division: 4, strength: 0.86, duration: 0.5 },
      } },
    ),
    familyEffect(
      "border-breath",
      1,
      "Border breath",
      "The draining Plateau borders catch a bounded grazing-light breath.",
      { period: 8, strength: 0.5, duration: 2.5, steps: "X.......", styles: {
        restrained: { steps: "..x..... | .......X | ........ | ....x...", division: 2, strength: 0.45, duration: 1.6 },
        driving: { steps: "...X.... | ......x. | .X...... | .......x", division: 2, strength: 0.68, duration: 1.2 },
        accented: { steps: ".....X..x....X.. | ..x....X..x.....", division: 4, strength: 0.82, duration: 0.5 },
      } },
    ),
    familyEffect(
      "opal-window",
      2,
      "Opal window",
      "A rare highlight crosses the upper interference order of the same films.",
      { period: 16, strength: 0.6, duration: 3, steps: "X...............", styles: {
        restrained: { steps: "........ | ........ | ......X. | ........", division: 2, strength: 0.5, duration: 2.5 },
        driving: { steps: "........ | .......x | ........ | .....X..", division: 2, strength: 0.74, duration: 1.8 },
        accented: { steps: ".............x.. | .........X...x.. | ..............X.", division: 4, strength: 0.9, duration: 0.75 },
      } },
    ),
  ],
  fragment,
};
