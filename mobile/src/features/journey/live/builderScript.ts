// The admin map builder's part of the live map page (docs/design/map-builder.md, release R1). Only the admin
// city map turns it on. It draws the city border with a grey veil outside it, the S2 level-17 grid as a soft
// guide, and answers "what does the map call this spot" from the tiles' own names (OpenStreetMap, free to keep).
import { C } from "../../../theme";

export const S2_GEOMETRY = "https://cdn.jsdelivr.net/npm/s2-geometry@1.2.10/src/s2geometry.js";

/** Invisible layers so the tiles' place names and land use can be asked about (MapLibre only keeps what a layer uses). */
export const BUILDER_LAYERS = [
  { id: "q-pois", type: "circle", source: "base", "source-layer": "pois", paint: { "circle-radius": 1, "circle-opacity": 0 } },
  { id: "q-landuse", type: "fill", source: "base", "source-layer": "landuse", paint: { "fill-opacity": 0 } },
];

/** Runs inside init() after the map exists: needs `map`, `send` and `circle` from the page. */
export const BUILDER_JS = `
const B={border:null,grid:false,posts:[]};
const fc=f=>({type:'FeatureCollection',features:f});
const dist=(a,b)=>{const R=6371000,r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
const inRing=(x,y,ring)=>{let o=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const[xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)o=!o}return o};
const inPoly=(x,y,g)=>g.type==='Polygon'?inRing(x,y,g.coordinates[0])&&!g.coordinates.slice(1).some(h=>inRing(x,y,h)):g.type==='MultiPolygon'?g.coordinates.some(p=>inPoly(x,y,{type:'Polygon',coordinates:p})):false;
const cellKey=p=>window.S2?S2.S2Cell.FromLatLng({lat:p.lat,lng:p.lng},17).toHilbertQuadkey():null;
const metresOff=(c,dx,dy)=>[c.lng+dx/(111320*Math.cos(c.lat*Math.PI/180)),c.lat+dy/110540];
function builderLayers(){
  const before=map.getLayer('buildings')?'buildings':undefined;
  map.addSource('veil',{type:'geojson',data:fc([])});
  map.addLayer({id:'veil',type:'fill',source:'veil',paint:{'fill-color':'#C9CFD8','fill-opacity':.55}},before);
  map.addSource('grid',{type:'geojson',data:fc([])});
  map.addLayer({id:'grid-fill',type:'fill',source:'grid',filter:['==',['get','used'],1],paint:{'fill-color':'${C.blue}','fill-opacity':.1}},before);
  map.addLayer({id:'grid',type:'line',source:'grid',paint:{'line-color':'${C.blue}','line-opacity':.45,'line-width':1}},before);
  map.addSource('border',{type:'geojson',data:fc([])});
  map.addLayer({id:'border',type:'line',source:'border',paint:{'line-color':'${C.blue}','line-width':2.5,'line-dasharray':[2,1.5]}});
}
function drawBorder(){
  const g=B.border;if(!map.getSource('veil'))return;
  if(!g){map.getSource('veil').setData(fc([]));map.getSource('border').setData(fc([]));return}
  const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  // The whole world with the city cut out, so everything outside the border is greyed.
  map.getSource('veil').setData(fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[-179,-85],[179,-85],[179,85],[-179,85],[-179,-85]],...polys.map(p=>p[0].slice().reverse())]}}]));
  map.getSource('border').setData(fc(polys.map(p=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:p[0]}}))));
}
function drawGrid(){
  if(!map.getSource('grid'))return;
  if(!B.grid||!window.S2||map.getZoom()<15){map.getSource('grid').setData(fc([]));return}
  const c=map.getCenter(),used=new Set(B.posts.map(cellKey)),seen=new Map();
  const [w,s]=metresOff({lat:c.lat,lng:c.lng},-500,-500),[e,n]=metresOff({lat:c.lat,lng:c.lng},500,500);
  const stepLat=30/110540,stepLng=30/(111320*Math.cos(c.lat*Math.PI/180));let k=0;
  for(let lat=s;lat<=n&&k<3000;lat+=stepLat)for(let lng=w;lng<=e&&k<3000;lng+=stepLng){
    k++;const cell=S2.S2Cell.FromLatLng({lat,lng},17),key=cell.toHilbertQuadkey();if(seen.has(key))continue;
    const ring=cell.getCornerLatLngs().map(p=>[p.lng,p.lat]);ring.push(ring[0]);
    seen.set(key,{type:'Feature',properties:{used:used.has(key)?1:0},geometry:{type:'Polygon',coordinates:[ring]}});
  }
  map.getSource('grid').setData(fc([...seen.values()]));
}
map.on('moveend',()=>{if(B.grid)drawGrid()});
const SKIP=new Set(['administrative','bus_stop','atm','toilets','station','bicycle_rental','taxi','car','car_rental','fuel','charging_station']);
const PREFER=new Set(['park','garden','plaza','attraction','artwork','monument','arts_centre','museum','fountain','pier','memorial','sculpture']);
const cjk=x=>/[\\u3400-\\u9fff]/.test(x||'');
function namesNear(ll,radius){
  const seen=new Map();
  for(const f of map.querySourceFeatures('base',{sourceLayer:'pois'})){
    const p=f.properties||{},kind=String(p.kind||'');if(!p.name||SKIP.has(kind)||kind.startsWith('parking')||f.geometry.type!=='Point')continue;
    const[lng,lat]=f.geometry.coordinates,d=dist(ll,{lat,lng});if(d>radius)continue;
    const zh=p['name:zh-Hant']||(cjk(p.name)?p.name:''),en=p['name:en']||(!cjk(p.name)?p.name:'');
    const key=zh+'|'+en;if(!seen.has(key)||seen.get(key).meters>d)seen.set(key,{zh,en,kind,meters:Math.round(d)});
  }
  const list=[...seen.values()].sort((a,b)=>(a.meters-(PREFER.has(a.kind)?60:0))-(b.meters-(PREFER.has(b.kind)?60:0))).slice(0,6);
  if(!list.length&&map.getLayer('places')){const f=map.queryRenderedFeatures({layers:['places']})[0];if(f)list.push({zh:f.properties['name:zh-Hant']||(cjk(f.properties.name)?f.properties.name:''),en:f.properties['name:en']||'',kind:'neighbourhood',meters:999})}
  return list;
}
const AREAS=['school','kindergarten','university','college','hospital','cemetery','military'];
function areaAt(ll){for(const f of map.querySourceFeatures('base',{sourceLayer:'landuse'}))if(AREAS.includes(f.properties&&f.properties.kind)&&inPoly(ll.lng,ll.lat,f.geometry))return f.properties.kind;return null}
// A spawn spot's habitat from the tiles: in or within 40 m of water is waterside, on park-like land is a park,
// anything else is a square. Vessels with a habitat rule only spawn at matching spots.
const PARKISH=['park','garden','grass','wood','forest','recreation_ground','nature_reserve','playground','dog_park'];
const rings=g=>g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():[];
function nearRing(ll,ring,m){for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];
  const kx=111320*Math.cos(ll.lat*Math.PI/180),ky=110540,ax=(a[0]-ll.lng)*kx,ay=(a[1]-ll.lat)*ky,bx=(b[0]-ll.lng)*kx,by=(b[1]-ll.lat)*ky;
  const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/((dx*dx+dy*dy)||1))),x=ax+t*dx,y=ay+t*dy;if(x*x+y*y<=m*m)return true}return false}
function habitatAt(ll){
  for(const f of map.querySourceFeatures('base',{sourceLayer:'water'})){const g=f.geometry;if(inPoly(ll.lng,ll.lat,g)||rings(g).some(r=>nearRing(ll,r,40)))return 'water'}
  for(const f of map.querySourceFeatures('base',{sourceLayer:'landuse'}))if(PARKISH.includes(f.properties&&f.properties.kind)&&inPoly(ll.lng,ll.lat,f.geometry))return 'park';
  return 'square';
}
function sameCell(ll,skip){const k=cellKey(ll);if(!k)return[];return B.posts.filter(p=>p.id!==skip&&cellKey(p)===k).map(p=>({id:p.id,meters:Math.round(dist(ll,p))}))}
function builderRecv(m){
  if(m.type==='builder'){B.border=m.border||null;B.grid=!!m.grid;B.posts=m.posts||[];drawBorder();drawGrid();if(m.grid&&map.getZoom()<15.5)map.easeTo({zoom:16.2,duration:500})}
  // Names come from tiles near the spot, so look there first and wait for them to load.
  if(m.type==='names'){const ll={lat:m.lat,lng:m.lng};const answer=()=>send({type:'names',seq:m.seq,names:namesNear(ll,150),area:areaAt(ll),habitat:habitatAt(ll),same:sameCell(ll,m.skip)});
    if(map.areTilesLoaded())answer();else map.once('idle',answer)}
}
`;
