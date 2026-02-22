import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

let stored: unknown = null;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Break Sheet</title>
<style>
  :root {
    --bg:#0e0f13; --surface:#16181f; --surface2:#1e2029; --border:#2a2d3a;
    --text:#e8eaf0; --muted:#6b7080; --accent:#4f7cff; --accent2:#7c5cfc;
    --on-break:#ff6b35; --on-break-bg:rgba(255,107,53,0.10);
    --done:#22c55e; --done-bg:rgba(34,197,94,0.07); --warning:#f59e0b; --kyiv:#38bdf8;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;min-height:100vh;}
  header{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;position:sticky;top:0;z-index:100;}
  .logo{font-size:18px;font-weight:800;background:linear-gradient(135deg,#4f7cff,#7c5cfc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
  .clock{font-family:monospace;font-size:20px;color:var(--kyiv);background:rgba(56,189,248,0.08);border:1.5px solid rgba(56,189,248,0.3);padding:6px 16px;border-radius:20px;}
  .main{max-width:1200px;margin:0 auto;padding:20px 16px;}
  .stats{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
  .stat{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 18px;flex:1;min-width:120px;}
  .stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:4px;}
  .stat-value{font-size:26px;font-weight:800;font-family:monospace;}
  .table{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;}
  .row{border-bottom:1px solid var(--border);padding:10px 16px;}
  .row:last-child{border-bottom:none;}
  .row.on-break{background:var(--on-break-bg);animation:pulse 2s infinite;}
  .row.finished{background:var(--done-bg);}
  @keyframes pulse{0%,100%{background:rgba(255,107,53,0.10)}50%{background:rgba(255,107,53,0.20)}}
  .row-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;}
  .row-num{font-family:monospace;font-size:11px;color:var(--muted);min-width:22px;}
  .agent-name{font-weight:700;font-size:14px;flex:1;min-width:120px;}
  .progress{display:flex;align-items:center;gap:8px;}
  .bar-bg{width:120px;height:5px;background:var(--surface2);border-radius:3px;overflow:hidden;}
  .bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#4f7cff,#7c5cfc);transition:width 0.4s;}
  .bar-fill.full{background:linear-gradient(90deg,#22c55e,#16a34a);}
  .mins{font-family:monospace;font-size:11px;color:var(--muted);}
  .mins.full{color:var(--done);}
  .slots{display:flex;flex-direction:column;gap:4px;padding-left:30px;}
  .slot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .slot-label{font-family:monospace;font-size:10px;color:var(--muted);min-width:48px;}
  select{background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:monospace;font-size:12px;padding:5px 8px;outline:none;cursor:pointer;}
  select:focus{border-color:#4f7cff;}
  .sep{color:var(--muted);font-size:12px;}
  .pill{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;}
  .pill-break{background:rgba(255,107,53,0.18);color:var(--on-break);}
  .pill-done{background:rgba(34,197,94,0.13);color:var(--done);}
  .pill-upcoming{background:rgba(79,124,255,0.13);color:#4f7cff;}
  .dot{width:5px;height:5px;border-radius:50%;background:currentColor;}
  .pill-break .dot{animation:blink 1s infinite;}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
  .btn-clear{background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;font-size:11px;padding:4px 10px;}
  .btn-clear:hover{border-color:var(--on-break);color:var(--on-break);}
  .warn-banner{background:rgba(245,158,11,0.09);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:10px 16px;font-size:13px;color:var(--warning);font-weight:600;margin-bottom:14px;display:none;}
  .warn-banner.show{display:block;}
  .sync{font-size:11px;color:var(--muted);text-align:right;margin-bottom:8px;}
  .sync span{color:#22c55e;}
</style>
</head>
<body>
<header>
  <div class="logo">⏸ Break Sheet</div>
  <div class="clock" id="clock">--:--:--</div>
</header>
<div class="main">
  <div class="stats">
    <div class="stat"><div class="stat-label">On Break Now</div><div class="stat-value" style="color:var(--on-break)" id="s-break">0</div></div>
    <div class="stat"><div class="stat-label">Finished</div><div class="stat-value" style="color:var(--done)" id="s-done">0</div></div>
    <div class="stat"><div class="stat-label">Planned</div><div class="stat-value" style="color:#7c5cfc" id="s-planned">0</div></div>
    <div class="stat"><div class="stat-label">Total Agents</div><div class="stat-value" id="s-total">29</div></div>
  </div>
  <div class="warn-banner" id="warn">⚠️ <span id="warn-msg"></span></div>
  <div class="sync">Last sync: <span id="sync-time">never</span></div>
  <div class="table" id="table"></div>
</div>
<script>
var AGENTS=["Mariam - Adeline","Stacy - Alina","Chloe - Amanda","Mason - Andrew","James - Andrian","Jacob - Artur","Dmytro - Bruce","Den - Denys","Deren - Dmytro","Mira - Elena","Grant - Giorgi","Joseph - Ihor","Giorgi - Josh","Arthur - Kostiantyn","Lucas - Levon","Cooper - Luka","Aaron - Max","Mike - Mykhailo","Nady - Naomi","Dachi - Nate","Nataly - Natia","Matthew - Samir","Jack - Sergii","Gerald - Tarlan","Lina - Tina","Iris - Tsira","Emily - Valeria","Lili - Viktoriia","Millie - Yulia"];
var MAX=60;
var data=null;
function pad(n){return String(n).padStart(2,'0');}
function kyivNow(){return new Date().toLocaleTimeString('uk-UA',{timeZone:'Europe/Kyiv',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}
function kyivMins(){var s=kyivNow().split(':').map(Number);return s[0]*60+s[1]+s[2]/60;}
function toMins(t){if(!t)return -1;var p=t.split(':').map(Number);return p[0]*60+p[1];}
function slotDur(s){if(!s.from||!s.to||s.from===s.to)return 0;var d=toMins(s.to)-toMins(s.from);if(d<0)d+=1440;return d;}
function slotStatus(s){
  if(!s.from||!s.to||s.from===s.to)return 'idle';
  var now=kyivMins(),f=toMins(s.from),t=toMins(s.to);
  if(t<f){if(now>=f||now<t)return 'break';if(now>=t)return 'done';return 'upcoming';}
  if(now>=f&&now<t)return 'break';
  if(now>=t)return 'done';
  return 'upcoming';
}
function rowUsed(row){return row.slots.reduce(function(a,s){return a+slotDur(s);},0);}
function rowDone(row){return row.slots.reduce(function(a,s){return slotStatus(s)==='done'?a+slotDur(s):a;},0);}
var TIMES=(function(){var t=[];for(var h=0;h<24;h++)for(var m=0;m<60;m+=15)t.push(pad(h)+':'+pad(m));return t;})();
function timeOpts(sel,maxBudget,fromMins){
  var s='<option value="">--:--</option>';
  TIMES.forEach(function(t){
    var tm=toMins(t);var dis=false;
    if(fromMins!==undefined){if(tm===fromMins){dis=true;}else{var d=tm-fromMins;if(d<0)d+=1440;if(d>maxBudget)dis=true;}}
    s+='<option value="'+t+'"'+(t===sel?' selected':'')+(dis?' disabled':'')+'>'+t+'</option>';
  });
  return s;
}
function initData(){return {rows:AGENTS.map(function(name){return {name:name,slots:[{from:'',to:''},{from:'',to:''},{from:'',to:''}]};});};}
async function loadData(){
  try{var r=await fetch('/data');if(r.ok){var d=await r.json();data=d||initData();}else{data=initData();}}
  catch(e){data=initData();}
  render();
}
async function saveData(){
  try{await fetch('/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}catch(e){}
}
function setFrom(ri,si,v){
  data.rows[ri].slots[si].from=v;
  var slot=data.rows[ri].slots[si];
  if(slot.to){var other=data.rows[ri].slots.reduce(function(a,s,i){return i!==si?a+slotDur(s):a;},0);var budget=Math.max(0,MAX-other);var d=toMins(slot.to)-toMins(slot.from);if(d<0)d+=1440;if(d>budget||d<=0)slot.to='';}
  saveData();render();
}
function setTo(ri,si,v){data.rows[ri].slots[si].to=v;saveData();render();}
function clearSlot(ri,si){data.rows[ri].slots[si]={from:'',to:''};saveData();render();}
function countOnBreak(){var c=0;if(!data)return 0;data.rows.forEach(function(row){row.slots.forEach(function(s){if(slotStatus(s)==='break')c++;});});return c;}
function render(){
  if(!data)return;
  var tb=document.getElementById('table');tb.innerHTML='';
  var onBreak=countOnBreak(),doneCt=0,plannedCt=0;
  data.rows.forEach(function(row,ri){
    var used=rowUsed(row);
    var anyBreak=row.slots.some(function(s){return slotStatus(s)==='break';});
    var finished=rowDone(row)>=MAX;
    if(finished)doneCt++;
    if(row.slots.some(function(s){return s.from&&s.to;}))plannedCt++;
    var pct=Math.min(100,(used/MAX)*100);
    var wrap=document.createElement('div');
    wrap.className='row'+(anyBreak?' on-break':(finished?' finished':''));
    var topHtml='<div class="row-top"><span class="row-num">'+(ri+1)+'</span><span class="agent-name">'+row.name+'</span><div class="progress"><div class="bar-bg"><div class="bar-fill'+(used>=MAX?' full':'')+'" style="width:'+pct+'%"></div></div><span class="mins'+(used>=MAX?' full':'')+' ">'+used+'/'+MAX+' min</span></div></div>';
    var slotsHtml='<div class="slots">';
    row.slots.forEach(function(slot,si){
      var status=slotStatus(slot);var dur=slotDur(slot);
      var other=row.slots.reduce(function(a,s,i){return i!==si?a+slotDur(s):a;},0);
      var budget=Math.max(0,MAX-other);
      var fromMins=slot.from?toMins(slot.from):undefined;
      var pill='';
      if(status==='break')pill='<span class="pill pill-break"><span class="dot"></span>ON BREAK</span>';
      else if(status==='done')pill='<span class="pill pill-done"><span class="dot"></span>DONE '+dur+'m</span>';
      else if(status==='upcoming'&&dur)pill='<span class="pill pill-upcoming">'+dur+'m upcoming</span>';
      slotsHtml+='<div class="slot"><span class="slot-label">Break '+(si+1)+'</span><select onchange="setFrom('+ri+','+si+',this.value)">'+timeOpts(slot.from,undefined,undefined)+'</select><span class="sep">→</span><select onchange="setTo('+ri+','+si+',this.value)">'+timeOpts(slot.to,budget,fromMins)+'</select>'+pill+'<button class="btn-clear" onclick="clearSlot('+ri+','+si+')">Clear</button></div>';
    });
    slotsHtml+='</div>';
    wrap.innerHTML=topHtml+slotsHtml;
    tb.appendChild(wrap);
  });
  document.getElementById('s-break').textContent=onBreak;
  document.getElementById('s-done').textContent=doneCt;
  document.getElementById('s-planned').textContent=plannedCt;
  document.getElementById('sync-time').textContent=kyivNow();
  var warn=document.getElementById('warn');
  if(onBreak>=2){document.getElementById('warn-msg').textContent=onBreak+' agents on break simultaneously — max 2 allowed.';warn.classList.add('show');}
  else{warn.classList.remove('show');}
}
setInterval(function(){document.getElementById('clock').textContent=kyivNow();},1000);
setInterval(loadData,8000);
loadData();
</script>
</body>
</html>`;

serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/data" && req.method === "GET") {
    return new Response(JSON.stringify(stored ?? null), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/data" && req.method === "POST") {
    stored = await req.json();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(HTML, {
    headers: { "Content-Type": "text/html" },
  });
});
