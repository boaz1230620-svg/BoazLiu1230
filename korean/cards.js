// 單字卡、句子卡、手寫筆順練習
(function(){
const KEY='ko-cards-known';
function loadKnown(){try{return new Set(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch(e){return new Set();}}
function saveKnown(s){try{localStorage.setItem(KEY,JSON.stringify([...s]));}catch(e){}}
let known=loadKnown();

const lvName=lv=>lv==='ch'?'召會生活':lv==='tp'?'專題':LEVELS[lv][0];
const lvHref=lv=>lv==='ch'?'#church':lv==='tp'?'#topics':'#lv'+lv;
const unitName=(lv,n)=>lv==='ch'?(window.CHURCH[n-1]||{}).t:lv==='tp'?((window.TOPICS[n-1]||{}).zh||''):`第 ${n} 堂`;
function deck(lv,kind){
  const out=[],seen=new Set();
  if(lv==='tp'){(window.TOPICS||[]).forEach((t,ti)=>{
      const add=(ko,zh,pr,rom)=>{if(seen.has(ko))return;seen.add(ko);out.push({ko,zh,pr,rom,n:ti+1});};
      if(kind==='s'){t.pat.forEach(r=>add(r[0],r[1],'',r[2]));t.b.forEach(b=>b.s.forEach(r=>add(r[0],r[1],'',r[2])));}
      else t.b.forEach(b=>b.w.forEach(w=>add(w[1],w[0]+' '+w[2],w[3],w[4])));
    });return out;}
  if(lv==='ch'){(window.CHURCH||[]).forEach((g,gi)=>g.items.forEach(it=>{
      if(kind==='s'){if(!seen.has(it.ko)){seen.add(it.ko);out.push({ko:it.ko,zh:it.zh,pr:it.pr,rom:it.rom,n:gi+1});}}
      else it.w.forEach(w=>{if(seen.has(w[0]))return;seen.add(w[0]);out.push({ko:w[0],zh:w[1],pr:'',rom:'',n:gi+1});});
    }));return out;}
  for(let i=lv*PER;i<lv*PER+PER;i++){const L=LESSONS[i];if(!L)continue;
    const rows=kind==='w'?L.v:L.s;
    rows.forEach(r=>{const k=r[0];if(seen.has(k))return;seen.add(k);
      out.push(kind==='w'?{ko:r[0],zh:r[1],pr:r[2],rom:r[3],n:i+1}:{ko:r[0],zh:r[1],pr:'',rom:r[2],n:i+1});});
  }
  return out;
}
window.deckSize=(lv,kind)=>deck(lv,kind).length;

// ---------- 字卡 ----------
let st=null;
window.cardsView=function(lv,kind,lessonNo){
  const all=deck(lv,kind);
  st={lv,kind,all,lessonNo:lessonNo||0,front:'ko',auto:false,onlyNew:false,order:null,idx:0,flip:false};
  build();render();
};
function current(){
  let a=st.all.filter(c=>!st.lessonNo||c.n===st.lessonNo);
  if(st.onlyNew)a=a.filter(c=>!known.has(c.ko));
  if(st.order){const pos=new Map(st.order.map((k,i)=>[k,i]));a=a.slice().sort((x,y)=>(pos.get(x.ko)??0)-(pos.get(y.ko)??0));}
  return a;
}
function build(){
  const lvN=lvName(st.lv),kName=st.kind==='w'?'單字卡':(st.lv==='ch'?'句子卡（整句）':'句子卡');
  const opts=[`<option value="0">${st.lv==='ch'?'全部分類':st.lv==='tp'?'全部專題':'全部 '+PER+' 堂'}</option>`];
  if(st.lv==='tp')TOPICS.forEach((t,i)=>opts.push(`<option value="${i+1}" ${i+1===st.lessonNo?'selected':''}>${t.icon} ${t.zh}</option>`));
  else if(st.lv==='ch')CHURCH.forEach((g,i)=>opts.push(`<option value="${i+1}" ${i+1===st.lessonNo?'selected':''}>${g.t}</option>`));
  else for(let i=st.lv*PER+1;i<=st.lv*PER+PER;i++)opts.push(`<option value="${i}" ${i===st.lessonNo?'selected':''}>第 ${i} 堂</option>`);
  app.innerHTML=`<p><a class="back" href="${lvHref(st.lv)}">← 回${lvN}</a></p>
  <h2>${lvN}　${kName}</h2>
  <div class="cardbar">
    <select id="fl">${opts.join('')}</select>
    <button class="chip" id="bShuf">🔀 洗牌</button>
    <button class="chip" id="bFront">正面：韓文</button>
    <button class="chip" id="bAuto">🔊 自動發音：關</button>
    <button class="chip" id="bNew">只練不熟：關</button>
  </div>
  <div id="fc"></div>
  <p class="hint">點卡片或按空白鍵翻面；← → 鍵或左右滑動換卡。「會了」的卡片會記在這台裝置上。</p>`;
  document.getElementById('fl').onchange=e=>{st.lessonNo=+e.target.value;st.idx=0;st.flip=false;render();};
  document.getElementById('bShuf').onclick=()=>{const k=st.all.map(c=>c.ko);for(let i=k.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[k[i],k[j]]=[k[j],k[i]];}st.order=k;st.idx=0;st.flip=false;render();toast('已洗牌');};
  document.getElementById('bFront').onclick=e=>{st.front=st.front==='ko'?'zh':'ko';e.target.textContent='正面：'+(st.front==='ko'?'韓文':'中文');st.flip=false;render();};
  document.getElementById('bAuto').onclick=e=>{st.auto=!st.auto;e.target.textContent='🔊 自動發音：'+(st.auto?'開':'關');e.target.classList.toggle('on',st.auto);if(st.auto)sayCur();};
  document.getElementById('bNew').onclick=e=>{st.onlyNew=!st.onlyNew;e.target.textContent='只練不熟：'+(st.onlyNew?'開':'關');e.target.classList.toggle('on',st.onlyNew);st.idx=0;st.flip=false;render();};
}
function sayCur(){const c=current()[st.idx];if(c)speak(c.ko);}
function render(){
  const list=current(),box=document.getElementById('fc');if(!box)return;
  const total=st.all.filter(c=>!st.lessonNo||c.n===st.lessonNo);
  const kn=total.filter(c=>known.has(c.ko)).length;
  if(!list.length){box.innerHTML=`<div class="box" style="text-align:center">🎉 這個範圍的卡片都標記為「會了」！<br><button class="btn" id="bReset" style="margin-top:10px">重設這個範圍的記錄</button></div>`;
    document.getElementById('bReset').onclick=()=>{total.forEach(c=>known.delete(c.ko));saveKnown(known);render();};return;}
  if(st.idx>=list.length)st.idx=list.length-1;
  const c=list[st.idx],isK=known.has(c.ko),sent=st.kind==='s';
  const koFace=`<div class="fk ${sent?'fs':''}">${esc(c.ko)}</div>`;
  const zhFace=`<div class="fz">${esc(c.zh)}</div>`;
  const detail=`<div class="fk ${sent?'fs':''}" style="font-size:${sent?'22px':'34px'}">${esc(c.ko)}</div><div class="fz" style="font-size:22px;margin:8px 0">${esc(c.zh)}</div>${sent?(window.scanHTML?scanHTML(c.ko):''):(window.hintHTML?'<div>'+hintHTML(c.ko)+'</div>':'')}
    ${c.pr?`<div class="fd">實際發音 <b>${esc(c.pr)}</b></div>`:''}${c.rom?`<div class="fd rom">${esc(c.rom)}</div>`:''}`;
  const front=st.front==='ko'?koFace:zhFace;
  box.innerHTML=`<div class="prog"><span>${st.idx+1} / ${list.length}</span><span>${unitName(st.lv,c.n)}</span><span>已會 ${kn} / ${total.length}</span></div>
  <div class="bar"><i style="width:${total.length?kn/total.length*100:0}%"></i></div>
  <div class="flash${st.flip?' flipped':''}" id="flash"><div class="inner">
    <div class="face front">${isK?'<span class="badge">✓ 會了</span>':''}${front}<div class="tap">點一下翻面</div></div>
    <div class="face back">${detail}</div>
  </div></div>
  <div class="fbtns">
    <button class="btn" id="bPrev">← 上一張</button>
    <button class="btn" id="bSay">🔊 發音</button>
    <button class="btn" id="bWrite">✍️ 寫寫看</button>
    <button class="btn" id="bNext">下一張 →</button>
  </div>
  <div class="fbtns">
    <button class="btn no" id="bNo">✗ 還不熟</button>
    <button class="btn yes" id="bYes">✓ 會了</button>
  </div>`;
  const f=document.getElementById('flash');
  f.onclick=()=>{st.flip=!st.flip;f.classList.toggle('flipped',st.flip);};
  document.getElementById('bPrev').onclick=()=>move(-1);
  document.getElementById('bNext').onclick=()=>move(1);
  document.getElementById('bSay').onclick=()=>speak(c.ko);
  document.getElementById('bWrite').onclick=()=>go('#wr'+st.lv+'/'+encodeURIComponent(c.ko));
  document.getElementById('bYes').onclick=()=>{known.add(c.ko);saveKnown(known);if(!st.onlyNew)st.idx++;st.flip=false;if(st.idx>=current().length&&current().length){st.idx=current().length-1;toast('這是最後一張了');}render();if(st.auto)sayCur();};
  document.getElementById('bNo').onclick=()=>{known.delete(c.ko);saveKnown(known);move(1);};
  let sx=null;f.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});
  f.addEventListener('touchend',e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>50){e.preventDefault();move(dx<0?1:-1);}});
}
function move(d){const n=current().length;if(!n)return;st.idx=(st.idx+d+n)%n;st.flip=false;render();if(st.auto)sayCur();}
document.addEventListener('keydown',e=>{
  if(!st||!document.getElementById('flash')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(e.key==='ArrowRight')move(1);else if(e.key==='ArrowLeft')move(-1);
  else if(e.key===' '){e.preventDefault();document.getElementById('flash').click();}
});
window.addEventListener('hashchange',()=>{if(!/^#c[ws]/.test(location.hash))st=null;});

// ---------- 手寫筆順 ----------
let W=null;
window.writerView=function(lv,text){
  st=null;
  const words=deck(lv,'w');
  const lvN=lvName(lv);
  W={lv,text:text||(lv===0?'ㄱ':words[0].ko),chars:[],ci:0,anim:0,guide:true};
  app.innerHTML=`<p><a class="back" href="${lvHref(lv)}">← 回${lvN}</a></p>
  <h2>${lvN}　手寫練習</h2>
  <div class="wgrid">
    <div>
      <div class="winfo" id="winfo"></div>
      <div class="pad" id="pad"><canvas id="cg"></canvas><canvas id="ci"></canvas></div>
      <div class="sylls" id="sylls"></div>
      <div class="fbtns">
        <button class="btn" id="wDemo">▶ 示範筆順</button>
        <button class="btn" id="wGuide">描紅：開</button>
        <button class="btn" id="wClear">🧽 清除</button>
        <button class="btn" id="wSay">🔊</button>
      </div>
      <div class="fbtns"><button class="btn" id="wPrev">← 上一字</button><button class="btn" id="wNext">下一字 →</button></div>
    </div>
    <div>
      ${lv===0?`<h3 style="margin-top:0">韓文字母（40 個）</h3><div class="chips">${HANGUL.LETTERS.map(j=>`<button class="chip" data-w="${j}">${j}</button>`).join('')}</div>`:''}
      ${lv==='ch'||lv==='tp'?`<h3 style="margin-top:0">${lv==='tp'?'專題句子':'召會生活整句'}（${deck(lv,'s').length} 句）</h3><div class="chips" style="max-height:200px">${deck(lv,'s').map(w=>`<button class="chip" data-w="${esc(w.ko)}" title="${esc(w.zh)}">${esc(w.ko)}</button>`).join('')}</div>`:''}
      <h3 ${lv===0||lv==='ch'||lv==='tp'?'':'style="margin-top:0"'}>${lv==='ch'?'重點單字':lv==='tp'?'專題單字':'本級單字'}（${words.length} 個）</h3>
      <input id="wq" placeholder="搜尋韓文或中文…" class="wq">
      <div class="chips" id="wlist">${words.map(w=>`<button class="chip" data-w="${esc(w.ko)}" title="${esc(w.zh)}">${esc(w.ko)}</button>`).join('')}</div>
      <h3>自己輸入</h3>
      <div style="display:flex;gap:8px"><input id="wown" class="wq" placeholder="輸入任何韓文，例如 사랑해요"><button class="btn" id="wGo" style="white-space:nowrap">練習</button></div>
    </div>
  </div>
  <p class="hint">灰色是描紅字形，紅色數字是筆順。用手指、觸控筆或滑鼠在格子裡書寫；按「示範筆順」看一筆一筆的寫法。筆畫依韓國標準筆順，字形為示意，正式字體請參考上方的印刷字。</p>`;
  document.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{setText(b.dataset.w);window.scrollTo({top:0,behavior:'smooth'});});
  document.getElementById('wq').oninput=e=>{const q=e.target.value.trim();document.querySelectorAll('#wlist .chip').forEach(b=>{b.style.display=!q||b.dataset.w.includes(q)||b.title.includes(q)?'':'none';});};
  document.getElementById('wGo').onclick=()=>{const v=document.getElementById('wown').value.trim();if(!v)return;if(![...v].some(HANGUL.isHangul)){toast('請輸入韓文');return;}setText(v);};
  document.getElementById('wDemo').onclick=demo;
  document.getElementById('wGuide').onclick=e=>{W.guide=!W.guide;e.target.textContent='描紅：'+(W.guide?'開':'關');drawGuide();};
  document.getElementById('wClear').onclick=clearInk;
  document.getElementById('wSay').onclick=()=>speak(W.chars[W.ci]&&W.text.length<=1?W.chars[W.ci]:W.text);
  document.getElementById('wPrev').onclick=()=>{if(W.ci>0){W.ci--;showChar();}};
  document.getElementById('wNext').onclick=()=>{if(W.ci<W.chars.length-1){W.ci++;showChar();}else toast('這個詞寫完了，換一個吧！');};
  setupPad();setText(W.text);
};
function setText(t){
  W.text=t;W.chars=[...t].filter(HANGUL.isHangul);W.ci=0;
  const w=deck(W.lv,'w').concat(deck(W.lv,'s')).find(x=>x.ko===t);
  document.getElementById('winfo').innerHTML=`${ko(t)}${w?`<span class="sub">${esc(w.zh)}${w.pr?'　'+esc(w.pr):''}${w.rom?'　'+esc(w.rom):''}</span>`:''}`;
  showChar();
}
function showChar(){
  cancelAnimationFrame(W.anim);W.animTok=(W.animTok||0)+1;
  document.getElementById('sylls').innerHTML=W.chars.map((c,i)=>`<span class="${i===W.ci?'on':''}" data-i="${i}">${c}</span>`).join('');
  document.querySelectorAll('#sylls span').forEach(s=>s.onclick=()=>{W.ci=+s.dataset.i;showChar();});
  clearInk();drawGuide();
}
function setupPad(){
  const pad=document.getElementById('pad'),cg=document.getElementById('cg'),ci=document.getElementById('ci');
  const S=Math.min(380,pad.parentElement.clientWidth||380),r=window.devicePixelRatio||1;
  W.S=S;pad.style.width=pad.style.height=S+'px';
  [cg,ci].forEach(c=>{c.width=S*r;c.height=S*r;c.style.width=c.style.height=S+'px';c.getContext('2d').setTransform(r,0,0,r,0,0);});
  const x=ci.getContext('2d');let drawing=false,last=null;
  const pos=e=>{const b=ci.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top];};
  ci.onpointerdown=e=>{drawing=true;last=pos(e);try{ci.setPointerCapture(e.pointerId);}catch(_){}x.beginPath();x.arc(last[0],last[1],S*0.022,0,7);x.fillStyle='#1d3b8a';x.fill();};
  ci.onpointermove=e=>{if(!drawing)return;const p=pos(e);x.strokeStyle='#1d3b8a';x.lineWidth=S*(e.pressure&&e.pointerType==='pen'?0.03+e.pressure*0.03:0.045);x.lineCap='round';x.lineJoin='round';x.beginPath();x.moveTo(last[0],last[1]);x.lineTo(p[0],p[1]);x.stroke();last=p;};
  ci.onpointerup=ci.onpointercancel=()=>{drawing=false;};
}
function clearInk(){const c=document.getElementById('ci');if(c)c.getContext('2d').clearRect(0,0,W.S,W.S);}
const P=(p)=>[W.S*0.08+p[0]*W.S*0.84/100,W.S*0.08+p[1]*W.S*0.84/100];
function grid(x){
  const S=W.S;x.clearRect(0,0,S,S);x.fillStyle='#fff';x.fillRect(0,0,S,S);
  x.strokeStyle='#E8B84B';x.lineWidth=2;x.setLineDash([]);x.strokeRect(1,1,S-2,S-2);
  x.strokeStyle='#f0dca8';x.lineWidth=1;x.setLineDash([6,6]);
  x.beginPath();x.moveTo(S/2,0);x.lineTo(S/2,S);x.moveTo(0,S/2);x.lineTo(S,S/2);x.moveTo(0,0);x.lineTo(S,S);x.moveTo(S,0);x.lineTo(0,S);x.stroke();x.setLineDash([]);
}
function path(x,s,upto){ // upto: 0–1 of length
  const pts=s.map(P);let tot=0;const seg=[];for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);tot+=d;}
  let rem=tot*upto;x.beginPath();x.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++){if(rem>=seg[i-1]){x.lineTo(pts[i][0],pts[i][1]);rem-=seg[i-1];}else{const t=seg[i-1]?rem/seg[i-1]:0;x.lineTo(pts[i-1][0]+(pts[i][0]-pts[i-1][0])*t,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*t);break;}}
  x.stroke();return tot;
}
function num(x,s,i){const p=P(s[0]);x.fillStyle='#c0392b';x.beginPath();x.arc(p[0],p[1],W.S*0.032,0,7);x.fill();x.fillStyle='#fff';x.font=`bold ${Math.round(W.S*0.04)}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(i+1,p[0],p[1]+1);}
function strokesNow(){const ch=W.chars[W.ci];return ch?HANGUL.strokes(ch)||[]:[];}
function drawGuide(){
  const x=document.getElementById('cg').getContext('2d');grid(x);
  const ss=strokesNow(),ch=W.chars[W.ci];
  x.lineCap='round';x.lineJoin='round';
  if(W.guide){x.strokeStyle='#e9dfcc';x.lineWidth=W.S*0.06;ss.forEach(s=>path(x,s,1));ss.forEach((s,i)=>num(x,s,i));}
  x.fillStyle='#86641A';x.font=`${Math.round(W.S*0.1)}px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif`;x.textAlign='right';x.textBaseline='top';
  if(ch)x.fillText(ch,W.S-8,6);
  x.font=`${Math.round(W.S*0.038)}px sans-serif`;x.textAlign='left';x.fillText(`共 ${ss.length} 畫`,8,8);
}
function demo(){
  cancelAnimationFrame(W.anim);const tok=W.animTok=(W.animTok||0)+1;
  clearInk();const x=document.getElementById('cg').getContext('2d'),ss=strokesNow();
  let i=0,t0=null;
  const frame=ts=>{
    if(tok!==W.animTok)return;
    if(t0===null)t0=ts;
    drawGuide();x.strokeStyle='#c0392b';x.lineWidth=W.S*0.05;x.lineCap='round';x.lineJoin='round';
    for(let k=0;k<i;k++)path(x,ss[k],1);
    if(i<ss.length){const dur=450+path(x,ss[i],0)*3.2;const p=Math.max(0,Math.min(1,(ts-t0)/dur));path(x,ss[i],p);num(x,ss[i],i);
      if(p>=1){i++;t0=ts+250;}}
    for(let k=0;k<Math.min(i,ss.length);k++)num(x,ss[k],k);
    if(i<ss.length||ts<t0)W.anim=requestAnimationFrame(frame);
  };
  W.anim=requestAnimationFrame(frame);
}
})();
