// app.js — Preventivo PRO (immagini riga, margine/ricarico, auto-prezzo, PRINT VIEW, donazioni)
const $ = sel => document.querySelector(sel);
const money = v => (v||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});

// PWA install
let deferred;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferred=e;
  const b=$('#installBtn'); if(b){ b.hidden=false; b.onclick=()=>deferred.prompt(); }
});
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js'); }

// --- Donazioni PayPal ---
const DONATE_LINK = 'https://paypal.me/pezzalialessandro/5';
$('#donateBtn')?.addEventListener('click',()=>{ window.open(DONATE_LINK,'_blank','noopener'); });

// --- Stato PRO: rimosso il paywall, lasciamo solo la classe "free" per watermark di stampa se vuoi tenerlo ---
document.body.classList.remove('free');

// ---- Modalità prezzo: "margin" (margine vero) | "markup" (ricarico) ----
let pricingMode = localStorage.getItem('preventivo.pro.mode') || 'margin';

// Helpers
function priceFromMargin(cost, marginPct){
  const m=(Number(marginPct)||0)/100, d=1-m;
  if(d<=0.000001) return Number.MAX_SAFE_INTEGER;
  return +((Number(cost)||0)/d).toFixed(2);
}
function priceFromMarkup(cost, markupPct){
  const r=(Number(markupPct)||0)/100;
  return +((Number(cost)||0)*(1+r)).toFixed(2);
}
function basePrice(cost, pct){ return pricingMode==='margin' ? priceFromMargin(cost,pct) : priceFromMarkup(cost,pct); }

// ---------- Image utils ----------
function fileToDataURL(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
}
function resizeDataURL(dataURL,size){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas'); c.width=size; c.height=size;
      const ctx=c.getContext('2d');
      const ratio=Math.max(size/img.width,size/img.height);
      const w=img.width*ratio, h=img.height*ratio;
      const x=(size-w)/2, y=(size-h)/2;
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,size,size);
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,x,y,w,h);
      res(c.toDataURL('image/png',0.92));
    };
    img.onerror=rej; img.src=dataURL;
  });
}
async function processImageFile(file){
  const data=await fileToDataURL(file);
  const png192=await resizeDataURL(data,192);
  const png512=await resizeDataURL(data,512);
  return {img192:png192,img512:png512,name:file.name};
}

// Stato
let rows=[];
const storeKey='preventivo.pro.v1';

function save(){
  localStorage.setItem(storeKey, JSON.stringify({
    client:$('#client').value,email:$('#email').value,subject:$('#subject').value,
    validDays:$('#validDays').value,vat:$('#vat').value,extra:$('#extra').value,rows,pricingMode
  }));
  alert('Salvato 👍');
}
function load(){
  const x=JSON.parse(localStorage.getItem(storeKey)||'null'); if(!x) return;
  $('#client').value=x.client||''; $('#email').value=x.email||''; $('#subject').value=x.subject||'';
  $('#validDays').value=x.validDays||'30'; $('#vat').value=x.vat||22; $('#extra').value=x.extra||0;
  if(x.pricingMode){ pricingMode=x.pricingMode; localStorage.setItem('preventivo.pro.mode',pricingMode); }
  rows=x.rows||[]; render(); calc(); updateModeLabel();
}

// UI: selettore modalità (quello “buono” nel pannello a destra)
function ensureModeSelector(){
  if($('#modeSelect')) return;
  const aside=document.querySelector('aside.card .section'); if(!aside) return;
  const wrap=document.createElement('div');
  wrap.className='pill'; wrap.style.marginTop='8px';
  wrap.innerHTML = `
    <span style="margin-right:8px">Modalità prezzo:</span>
    <select id="modeSelect" style="background:#0f1836;border:1px solid var(--line);color:var(--ink);padding:6px 10px;border-radius:8px">
      <option value="margin">Margine</option>
      <option value="markup">Ricarico</option>
    </select>`;
  aside.appendChild(wrap);
  $('#modeSelect').value=pricingMode;
  $('#modeSelect').addEventListener('change',()=>{
    pricingMode=$('#modeSelect').value;
    localStorage.setItem('preventivo.pro.mode',pricingMode);
    updateModeLabel(); render(); calc();
  });
}
function updateModeLabel(){
  const th=$('#thMargin'); if(th) th.textContent = (pricingMode==='margin'?'Margine %':'Ricarico %');
}

document.addEventListener('DOMContentLoaded',()=>{ ensureModeSelector(); updateModeLabel(); });

// Righe
const tbody=$('#items');
function addRow(r={desc:'',cost:0,margin:30,price:0,qty:1,disc:0,img192:null,img512:null,name:null}){ rows.push(r); render(); calc(); }
function delRow(i){ rows.splice(i,1); render(); calc(); }

function render(){
  tbody.innerHTML='';
  rows.forEach((r,i)=>{
    const computed=basePrice(r.cost,r.margin);
    const displayPrice=(r.price&&r.price>0)?r.price:computed;
    const cover=r.img192?`<img src="${r.img192}" alt="img" class="thumb">`:`<div class="thumb placeholder">📷</div>`;
    const tr=document.createElement('tr'); tr.className='item'; tr.innerHTML=`
      <td>
        <div class="thumbwrap">
          ${cover}
          <div class="thumb-actions">
            <button class="btn btn-ghost" data-img="${i}">Carica</button>
            ${r.img192?`<button class="btn btn-ghost" data-img-del="${i}">Rimuovi</button>`:''}
          </div>
        </div>
      </td>
      <td><input data-i="${i}" data-k="desc" value="${r.desc||''}" placeholder="Voce"></td>
      <td class="right"><input data-i="${i}" data-k="cost" type="number" inputmode="decimal" step="0.01" value="${r.cost}"></td>
      <td class="right"><input data-i="${i}" data-k="margin" type="number" inputmode="decimal" step="0.1" value="${r.margin}"></td>
      <td class="right"><input data-i="${i}" data-k="price" type="number" inputmode="decimal" step="0.01" value="${displayPrice}"></td>
      <td class="right"><input data-i="${i}" data-k="qty" type="number" step="1" value="${r.qty}"></td>
      <td class="right"><input data-i="${i}" data-k="disc" type="number" inputmode="decimal" step="0.1" value="${r.disc||0}"></td>
      <td><button class="btn" data-del="${i}">×</button></td>`;
    tbody.appendChild(tr);
  });
  ensureModeSelector(); updateModeLabel();
  buildPrintView(); // sempre aggiornato
}

// Input
tbody.addEventListener('input',e=>{
  const el=e.target, i=+el.dataset.i, k=el.dataset.k;
  if(!Number.isInteger(i)) return;
  rows[i][k]=(k==='desc')?el.value:+el.value;
  if((k==='cost'||k==='margin') && !(rows[i].price>0)){
    const computed=basePrice(rows[i].cost,rows[i].margin);
    const priceInput=el.closest('tr').querySelector('input[data-k="price"]'); if(priceInput) priceInput.value=computed;
  }
  calc();
});

// Click su righe
tbody.addEventListener('click',async e=>{
  const iDel=e.target.dataset.del; if(iDel!==undefined){ delRow(+iDel); return; }
  const iUp=e.target.dataset.img;
  if(iUp!==undefined){
    const idx=+iUp;
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange=async ()=>{ const f=inp.files?.[0]; if(!f) return;
      try{
        const {img192,img512,name}=await processImageFile(f);
        Object.assign(rows[idx],{img192,img512,name}); render(); calc();
      }catch(err){ alert('Errore immagine: '+err); }
    };
    inp.click(); return;
  }
  const iDrop=e.target.dataset.imgDel;
  if(iDrop!==undefined){ const idx=+iDrop; Object.assign(rows[idx],{img192:null,img512:null,name:null}); render(); calc(); }
});

// Calcoli
function calc(){
  let ricavi=0,costi=0;
  rows.forEach(r=>{
    const base=r.price>0?r.price:basePrice(r.cost,r.margin);
    const final=base*(1-((r.disc||0)/100));
    const q=(r.qty||1);
    ricavi+=final*q; costi+=(r.cost||0)*q;
  });
  const extra= +$('#extra').value||0; ricavi+=extra;
  const impon=ricavi;
  const iva=impon*((+$('#vat').value||0)/100);
  const totale=impon+iva;
  const marg=ricavi-costi;
  $('#sumNetto').textContent=money(ricavi);
  $('#sumMargin').textContent=money(marg);
  $('#sumImponibile').textContent=money(impon);
  $('#sumTotale').textContent=money(totale);
  buildPrintView(); // rigenera anche qui
}

// Auto-prezzo su target margine medio
$('#autoPrice').addEventListener('click',()=>{
  const target=(+$('#targetMargin').value||30)/100;
  const extra= +$('#extra').value||0;
  const costi=rows.reduce((a,r)=>a+(r.cost||0)*(r.qty||1),0);
  const ricaviTarget=costi/(1-target);
  const ricaviAttualiBase=rows.reduce((a,r)=>{
    const base=(r.price>0?r.price:basePrice(r.cost,r.margin));
    return a+base*(1-((r.disc||0)/100))*(r.qty||1);
  },0);
  const denom=ricaviAttualiBase||1;
  const factor=(ricaviTarget-extra)/denom;
  rows=rows.map(r=>{
    const base=(r.price>0?r.price:basePrice(r.cost,r.margin));
    return {...r,price:+(base*factor).toFixed(2)};
  });
  render(); calc();
});

// Import/CSV demo
$('#importCsv').addEventListener('click',()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return; const reader=new FileReader();
    reader.onload=()=>{
      const lines=String(reader.result).split(/\r?\n/).filter(Boolean); rows=[];
      lines.forEach(line=>{
        const p=line.split(/;|,/);
        rows.push({desc:p[0]||'',cost:+(p[1]||0),margin:+(p[2]||30),price:+(p[3]||0),qty:+(p[4]||1),disc:+(p[5]||0),img192:null,img512:null,name:null});
      });
      render(); calc();
    }; reader.readAsText(f);
  };
  inp.click();
});
$('#demoCsv').addEventListener('click',()=>{
  rows=[
    {desc:'Piattaforma sollevamento PFA50',cost:1000,margin:30,price:0,qty:1,disc:0,img192:null,img512:null,name:null},
    {desc:'Smontagomme FT26SN',cost:1450,margin:35,price:0,qty:1,disc:5,img192:null,img512:null,name:null},
    {desc:'Bilanciatrice MEC 200 Truck',cost:2800,margin:28,price:0,qty:1,disc:0,img192:null,img512:null,name:null},
  ];
  render(); calc();
});

// ------- PRINT VIEW -------
function fmtDate(d=new Date()){ return d.toLocaleDateString('it-IT',{year:'numeric',month:'2-digit',day:'2-digit'}); }
function parseNumber(s){
  if(typeof s==='number') return s; if(!s) return 0;
  return Number(String(s).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'))||0;
}
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function buildPrintView(){
  const pv=$('#printView'); if(!pv) return;
  const sumNetto=$('#sumNetto').textContent||money(0);
  const sumImpon=$('#sumImponibile').textContent||money(0);
  const sumTot=$('#sumTotale').textContent||money(0);
  const ivaPct=+( $('#vat').value||22 );
  const extra=+( $('#extra').value||0 );

  const rowsHtml=rows.map(r=>{
    const base=(r.price>0?r.price:basePrice(r.cost,r.margin));
    const finalUnit=base*(1-((r.disc||0)/100));
    const tot=finalUnit*(r.qty||1);
    const img=r.img192?`<img src="${r.img192}" class="pv-img" alt="">`:'';
    return `<tr>
      <td>${img}</td>
      <td>${escapeHtml(r.desc||'')}</td>
      <td class="right">${money(r.cost||0)}</td>
      <td class="right">${money(base)}</td>
      <td class="right">${r.qty||1}</td>
      <td class="right">${(r.disc||0).toLocaleString('it-IT')}%</td>
      <td class="right"><b>${money(tot)}</b></td>
    </tr>`;
  }).join('');

  pv.innerHTML = `
    <div class="pv-wrap">
      <div class="pv-head">
        <div class="pv-brand">
          <h1>Preventivo PRO</h1>
          <small>PWA — pezzaliAPP</small>
        </div>
        <div class="pv-meta">
          <div><b>Data:</b> ${fmtDate()}</div>
          <div><b>Validità:</b> ${$('#validDays').value||'—'} giorni</div>
          <div><b>Modalità prezzo:</b> ${pricingMode==='margin'?'Margine':'Ricarico'}</div>
        </div>
      </div>

      <div class="pv-card">
        <h2>Dati cliente & preventivo</h2>
        <div class="pv-grid">
          <div class="pv-field"><b>Cliente</b><span>${escapeHtml($('#client').value||'')}</span></div>
          <div class="pv-field"><b>Email</b><span>${escapeHtml($('#email').value||'')}</span></div>
          <div class="pv-field"><b>Oggetto</b><span>${escapeHtml($('#subject').value||'')}</span></div>
          <div class="pv-field"><b>Spese extra</b><span>${money(extra)}</span></div>
        </div>
      </div>

      <div class="pv-card">
        <h2>Voci di preventivo</h2>
        <table class="pv-table">
          <thead><tr>
            <th>Img</th><th>Descrizione</th><th>Costi</th><th>Prezzo netto</th><th>Q.tà</th><th>Sconto %</th><th>Totale riga</th>
          </tr></thead>
          <tbody>${rowsHtml || `<tr><td colspan="7" style="text-align:center;color:#666">Nessuna voce</td></tr>`}</tbody>
        </table>
      </div>

      <div class="pv-totals">
        <div class="pv-kpi"><b>Ricavi netti</b><div class="val">${sumNetto}</div></div>
        <div class="pv-kpi"><b>Totale imponibile</b><div class="val">${sumImpon}</div></div>
        <div class="pv-kpi"><b>IVA ${ivaPct}%</b><div class="val">${money(parseNumber(sumTot)-parseNumber(sumImpon))}</div></div>
        <div class="pv-kpi"><b>Totale IVA inclusa</b><div class="val">${sumTot}</div></div>
      </div>

      <ul class="pv-notes">
        <li>Prezzi netti dopo eventuali sconti riga. Extra inclusi in “Spese extra”.</li>
        <li>Documento generato con Preventivo PRO (dati salvati localmente nel tuo browser).</li>
      </ul>
    </div>`;
}

// Fallback stampa per Safari/iOS e co.
if('onbeforeprint' in window){ window.addEventListener('beforeprint', buildPrintView); }
const mql = window.matchMedia && window.matchMedia('print');
if(mql && mql.addEventListener){ mql.addEventListener('change', e=>{ if(e.matches) buildPrintView(); }); }
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') buildPrintView(); });

// UI listeners
$('#addItem').addEventListener('click',()=>addRow());
['client','email','subject','validDays','vat','extra'].forEach(id=>{ $('#'+id)?.addEventListener('input',()=>{ calc(); }); });
$('#saveQuote').addEventListener('click',save);
$('#resetApp').addEventListener('click',()=>{ if(confirm('Cancellare tutti i dati locali?')){ localStorage.removeItem(storeKey); rows=[]; render(); calc(); }});

// Bottone stampa: rigenera e poi stampa (piccolo delay per immagini)
$('#printBtn').addEventListener('click',()=>{ buildPrintView(); setTimeout(()=>window.print(), 100); });

// Init
document.addEventListener('DOMContentLoaded', ()=>{ ensureModeSelector(); updateModeLabel(); });
load(); if(rows.length===0) addRow();
