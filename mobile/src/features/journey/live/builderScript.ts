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
  // R1.5: the cell under a Waypost being placed or dragged (green free, red taken), and the Fill an area box.
  map.addSource('hint',{type:'geojson',data:fc([])});
  map.addLayer({id:'hint-fill',type:'fill',source:'hint',paint:{'fill-color':['case',['get','taken'],'${C.wax}','#3E8E5A'],'fill-opacity':.28}});
  map.addLayer({id:'hint-line',type:'line',source:'hint',paint:{'line-color':['case',['get','taken'],'${C.wax}','#3E8E5A'],'line-width':2}});
  // R2: the default model, see-through, following the pointer while a new Landmark is placed.
  map.addSource('ghostmon',{type:'geojson',data:fc([])});
  map.addLayer({id:'ghostmon',type:'fill-extrusion',source:'ghostmon',paint:{'fill-extrusion-base':['get','base'],'fill-extrusion-height':['get','top'],'fill-extrusion-color':['get','c'],'fill-extrusion-opacity':.55}});
  map.addSource('box',{type:'geojson',data:fc([])});
  map.addLayer({id:'box-fill',type:'fill',source:'box',paint:{'fill-color':'${C.blue}','fill-opacity':.08}});
  map.addLayer({id:'box-line',type:'line',source:'box',paint:{'line-color':'${C.blue}','line-width':2,'line-dasharray':[3,2]}});
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
// R1.5: one Waypost per level-17 cell. A Waypost being moved may stay in its own cell.
function cellTaken(ll,skip){const k=cellKey(ll);if(!k)return false;const own=skip&&B.posts.find(p=>p.id===skip);if(own&&cellKey(own)===k)return false;return B.posts.some(p=>p.id!==skip&&cellKey(p)===k)}
function showCell(ll,skip){if(!window.S2||!map.getSource('hint'))return;const cell=S2.S2Cell.FromLatLng({lat:ll.lat,lng:ll.lng},17);const ring=cell.getCornerLatLngs().map(p=>[p.lng,p.lat]);ring.push(ring[0]);
  map.getSource('hint').setData(fc([{type:'Feature',properties:{taken:cellTaken(ll,skip)},geometry:{type:'Polygon',coordinates:[ring]}}]))}
const clearCell=()=>{map.getSource('hint')&&map.getSource('hint').setData(fc([]))};
// Dragging a pin: only Wayposts (the pin ids the admin screen uses start with w: or are the new draft) show their cell.
window.__tcDragMove=(id,ll)=>{if(B.dragKind==='waypost')showCell(ll,B.dragSkip)};
window.__tcDragEnd=()=>{clearCell()};
// Placing: a see-through Waypost or spot follows the pointer instead of the hand cursor.
const ghost=document.createElement('div');ghost.style.cssText='position:absolute;left:0;top:0;pointer-events:none;z-index:40;display:none;opacity:.55';
map.getContainer().appendChild(ghost);
// A Landmark: its model at the pointer and the star seal floating on top, as it will look once placed.
function ghostMonument(ll){const g=B.placing&&B.placing.monument;if(!g||!map.getSource('ghostmon'))return;const dx=ll?ll.lng-g.lng:0,dy=ll?ll.lat-g.lat:0;
  map.getSource('ghostmon').setData(ll?{type:'FeatureCollection',features:g.geo.features.map(f=>({...f,geometry:{type:'Polygon',coordinates:f.geometry.coordinates.map(r=>r.map(([x,y])=>[x+dx,y+dy]))}}))}:fc([]));
  const seal=ghost.firstChild;if(seal&&ll){const o=liftOffset(ll,g.top);seal.style.transform='translate('+o[0]+'px,'+o[1]+'px)'}}
map.on('mousemove',e=>{if(!B.placing){return}ghost.style.display='block';ghost.style.transform='translate('+e.point.x+'px,'+e.point.y+'px)';if(B.placing.kind!=='spot')showCell(e.lngLat,null);ghostMonument(e.lngLat)});
map.getCanvas().addEventListener('mouseleave',()=>{ghost.style.display='none';if(B.placing){clearCell();ghostMonument(null)}});
function setPlacing(m){B.placing=m.kind?m:null;window.__tcPlacing=!!m.kind;map.getCanvas().style.cursor=m.kind?'none':'';ghost.style.display='none';clearCell();
  map.getSource('ghostmon')&&map.getSource('ghostmon').setData(fc([]));
  ghost.innerHTML=m.kind==='landmark'?'<div class="pin landmark" style="position:absolute;left:-20px;top:-44px"><div class="pin-body"><div class="badge"><svg viewBox="0 0 24 24" fill="#fff"><path d="M12 1.5C12.8 8.2 15.8 11.2 22.5 12 15.8 12.8 12.8 15.8 12 22.5 11.2 15.8 8.2 12.8 1.5 12 8.2 11.2 11.2 8.2 12 1.5Z"/></svg></div></div></div>'
    :m.kind==='waypost'?'<div style="position:absolute;left:-13px;top:-41px;width:26px;height:41px;background:url('+m.img+') center/122px no-repeat"></div>'
    :m.kind==='spot'?'<div style="position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:${C.plum};box-shadow:0 0 0 2px #fff"></div>':''}
// Fill an area: drag a box (mouse or finger) while the map stays still.
let boxOn=false,boxFrom=null;
const boxData=(a,b)=>fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[a.lng,a.lat],[b.lng,a.lat],[b.lng,b.lat],[a.lng,b.lat],[a.lng,a.lat]]]}}]);
function boxStart(e){if(!boxOn)return;e.preventDefault&&e.preventDefault();boxFrom=e.lngLat}
function boxMove(e){if(!boxOn||!boxFrom)return;map.getSource('box').setData(boxData(boxFrom,e.lngLat))}
function boxEnd(e){if(!boxOn||!boxFrom)return;const a=boxFrom,b=e.lngLat||a;boxFrom=null;if(Math.abs(a.lat-b.lat)<1e-5||Math.abs(a.lng-b.lng)<1e-5)return;
  map.getSource('box').setData(boxData(a,b));send({type:'box',south:Math.min(a.lat,b.lat),north:Math.max(a.lat,b.lat),west:Math.min(a.lng,b.lng),east:Math.max(a.lng,b.lng)})}
map.on('mousedown',boxStart);map.on('mousemove',boxMove);map.on('mouseup',boxEnd);
map.on('touchstart',e=>{if(boxOn&&e.points&&e.points.length===1)boxStart(e)});map.on('touchmove',boxMove);map.on('touchend',boxEnd);
function setBox(on){boxOn=on;boxFrom=null;if(on){map.dragPan.disable();map.touchZoomRotate.disable();map.getCanvas().style.cursor='crosshair'}else{map.dragPan.enable();map.touchZoomRotate.enable();map.getCanvas().style.cursor=B.placing?'none':''}}
// Map builder R2: while picking a Landmark's buildings, a tap on a building sends its tile id and real height.
let pickOn=false;const pickLayers=()=>['monument-tiles','buildings'].filter(l=>map.getLayer(l));
window.__tcPick=e=>{if(!pickOn)return false;const hit=map.queryRenderedFeatures(e.point,{layers:pickLayers()})[0];
  if(hit&&hit.id!=null)send({type:'building',id:hit.id,height:+(hit.properties.height||9)});return true};
map.on('mousemove',e=>{if(pickOn)map.getCanvas().style.cursor=map.queryRenderedFeatures(e.point,{layers:pickLayers()}).length?'pointer':'crosshair'});
function builderRecv(m){
  if(m.type==='pick'){pickOn=m.on;window.__tcPickOn=m.on;map.getCanvas().style.cursor=m.on?'crosshair':''}
  if(m.type==='placing')setPlacing(m);
  if(m.type==='boxMode')setBox(m.on);
  if(m.type==='reveal'){const p=map.project([m.lng,m.lat]),c=map.getContainer(),w=c.clientWidth,h=c.clientHeight,x0=m.left||0,y1=h-(m.bottom||0)-(m.bottomShare||0)*h;
    if(p.x<x0+40||p.x>w-40||p.y<60||p.y>y1-20){const tx=(x0+w)/2,ty=y1/2;map.easeTo({center:map.unproject([w/2+p.x-tx,h/2+p.y-ty]),duration:500})}}
  if(m.type==='boxClear')map.getSource('box')&&map.getSource('box').setData(fc([]));
  if(m.type==='namesMany'){const answer=()=>send({type:'namesMany',seq:m.seq,items:m.points.map(ll=>({names:namesNear(ll,150),habitat:habitatAt(ll)}))});
    if(map.areTilesLoaded())answer();else map.once('idle',answer)}
  if(m.type==='builder'){B.border=m.border||null;B.grid=!!m.grid;B.posts=m.posts||[];B.dragKind=m.dragKind||null;B.dragSkip=m.dragSkip||null;drawBorder();drawGrid();if(m.grid&&map.getZoom()<15.5)map.easeTo({zoom:16.2,duration:500})}
  // Names come from tiles near the spot, so look there first and wait for them to load.
  if(m.type==='names'){const ll={lat:m.lat,lng:m.lng};const answer=()=>send({type:'names',seq:m.seq,names:namesNear(ll,150),area:areaAt(ll),habitat:habitatAt(ll),same:sameCell(ll,m.skip)});
    if(map.areTilesLoaded())answer();else map.once('idle',answer)}
}
`;
