// app.js — Preventivo PRO (gratuito con omaggio)
// img per riga + modalità Margine/Ricarico + fix input + auto-prezzo + PRINT VIEW (interna/cliente)

const $ = sel => document.querySelector(sel);
const money = v => (v || 0).toLocaleString('it-IT', { style:'currency', currency:'EUR' });

// ===== Link Omaggio (Il Cubo) =====
const GIFT_URL = "https://www.alessandropezzali.it/KubeApp/";

// ===== PWA install =====
let deferred;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault(); deferred = e;
  const b = $('#installBtn');
  if(b){ b.hidden = false; b.onclick = () => deferred.prompt(); }
});
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js'); }

// ===== Modalità prezzo (persistita) =====
// 'margin' = margine vero; 'markup' = ricarico
let pricingMode = localStorage.getItem('preventivo.pro.mode') || 'margin';

// Formule
function priceFromMargin(cost, marginPct){
  const m = (Number(marginPct)||0)/100;
  const denom = 1 - m;
  if(denom <= 1e-6) return Number.MAX_SAFE_INTEGER;
  return +((Number(cost)||0) / denom).toFixed(2);
}
function priceFromMarkup(cost, markupPct){
  const r = (Number(markupPct)||0)/100;
  return +((Number(cost)||0) * (1+r)).toFixed(2);
}
function basePrice(cost, pct){
  return pricingMode==='margin' ? priceFromMargin(cost, pct) : priceFromMarkup(cost, pct);
}

// ===== Image utils =====
function fileToDataURL(file){
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function resizeDataURL(dataURL, size){ // PNG cover size×size
  return new Promise((res,rej)=>{
    const img = new Image();
    img.onload = ()=>{
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      const ratio = Math.max(size/img.width, size/img.height);
      const w = img.width*ratio, h = img.height*ratio;
      const x = (size - w)/2, y = (size - h)/2;
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,size,size); // sfondo bianco per stampa
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, w, h);
      res(c.toDataURL('image/png', 0.92));
    };
    img.onerror = rej;
    img.src = dataURL;
  });
}
async function processImageFile(file){
  const data = await fileToDataURL(file);
  const png192 = await resizeDataURL(data, 192);
  const png512 = await resizeDataURL(data, 512);
  return { img192:png192, img512:png512, name:file.name };
}

// ===== Toast minimal =====
function toast(msg){
  let t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style,{
    position:'fixed',bottom:'16px',left:'50%',transform:'translateX(-50%)',
    background:'#111834',border:'1px solid #1d2a55',color:'#f1f4ff',
    padding:'10px 14px',borderRadius:'10px',zIndex:9999,boxShadow:'0 6px 22px rgba(0,0,0,.25)'
  });
  document.body.appendChild(t);
  requestAnimationFrame(()=>{ t.style.transition='opacity .25s'; });
  setTimeout(()=>{ t.style.opacity='0'; }, 1800);
  setTimeout(()=> t.remove(), 2300);
}

// ===== Stato & storage =====
let rows = [];
const storeKey = 'preventivo.pro.v1';

function save(){
  localStorage.setItem(storeKey, JSON.stringify({
    client:$('#client').value,
    email:$('#email').value,
    subject:$('#subject').value,
    validDays:$('#validDays').value,
    vat:$('#vat').value,
    extra:$('#extra').value,
    rows,
    pricingMode
  }));
  toast('Salvato');
}
function load(){
  const x = JSON.parse(localStorage.getItem(storeKey)||'null'); if(!x) return;
  $('#client').value = x.client || '';
  $('#email').value  = x.email  || '';
  $('#subject').value= x.subject|| '';
  $('#validDays').value = x.validDays || '30';
  $('#vat').value = x.vat || 22;
  $('#extra').value = x.extra || 0;
  if(x.pricingMode){ pricingMode = x.pricingMode; localStorage.setItem('preventivo.pro.mode', pricingMode); }
  rows = x.rows || [];
  render(); calc(); updateModeUI();
}

// ===== Modalità prezzo: UI (usa SOLO #modeMirror) =====
function updateModeLabel(){
  const th = document.getElementById('thMargin');
  if(th) th.textContent = (pricingMode==='margin' ? 'Margine %' : 'Ricarico %');
}
function updateModeUI(){
  updateModeLabel();
  const sel = $('#modeMirror');
  if(sel){
    sel.value = (pricingMode==='margin') ? 'Margine' : 'Ricarico';
  }
}
function hookModeMirror(){
  const sel = $('#modeMirror');
  if(!sel) return;
  sel.addEventListener('change', ()=>{
    pricingMode = (sel.value==='Ricarico') ? 'markup' : 'margin';
    localStorage.setItem('preventivo.pro.mode', pricingMode);
    updateModeUI(); render(); calc();
  });
}

// ===== Righe =====
const tbody = $('#items');

function addRow(r={desc:'',cost:0,margin:30,price:0,qty:1,disc:0,img192:null,img512:null,name:null}){
  rows.push(r); render(); calc();
}
function delRow(i){ rows.splice(i,1); render(); calc(); }

function render(){
  tbody.innerHTML = '';
  rows.forEach((r,i)=>{
    const computed = basePrice(r.cost, r.margin);
    const displayPrice = (r.price && r.price>0) ? r.price : computed;
    const cover = r.img192
      ? `<img src="${r.img192}" alt="img" class="thumb">`
      : `<div class="thumb placeholder">📷</div>`;
    const tr = document.createElement('tr');
    tr.className='item';
    tr.innerHTML = `
      <td>
        <div class="thumbwrap">
          ${cover}
          <div class="thumb-actions">
            <button class="btn btn-ghost" data-img="${i}">Carica</button>
            ${r.img192?`<button class="btn btn-ghost" data-img-del="${i}">Rimuovi</button>`:''}
          </div>
        </div>
      </td>
      <td><input data-i="${i}" data-k="desc" value="${escapeHtml(r.desc)}" placeholder="Voce"/></td>
      <td class="right"><input data-i="${i}" data-k="cost" type="number" inputmode="decimal" step="0.01" value="${r.cost}"/></td>
      <td class="right"><input data-i="${i}" data-k="margin" type="number" inputmode="decimal" step="0.1" value="${r.margin}"/></td>
      <td class="right"><input data-i="${i}" data-k="price" type="number" inputmode="decimal" step="0.01" value="${displayPrice}"/></td>
      <td class="right"><input data-i="${i}" data-k="qty" type="number" step="1" value="${r.qty}"/></td>
      <td class="right"><input data-i="${i}" data-k="disc" type="number" inputmode="decimal" step="0.1" value="${r.disc||0}"/></td>
      <td><button class="btn" data-del="${i}">×</button></td>
    `;
    tbody.appendChild(tr);
  });
  updateModeUI();
}

// Input live
tbody.addEventListener('input', e=>{
  const el=e.target; const i=+el.dataset.i; const k=el.dataset.k;
  if(!Number.isInteger(i)) return;
  rows[i][k] = (k==='desc') ? el.value : +el.value;

  if((k==='cost' || k==='margin') && !(rows[i].price>0)){
    const computed = basePrice(rows[i].cost, rows[i].margin);
    const priceInput = el.closest('tr').querySelector('input[data-k="price"]');
    if(priceInput) priceInput.value = computed;
  }
  calc();
});

// Click: delete / upload img / delete img
tbody.addEventListener('click', async e=>{
  const del = e.target.dataset.del;
  if(del!==undefined){ delRow(+del); return; }

  const up = e.target.dataset.img;
  if(up!==undefined){
    const idx=+up;
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange=async ()=>{
      const f=inp.files?.[0]; if(!f) return;
      try{
        const {img192,img512,name} = await processImageFile(f);
        Object.assign(rows[idx], {img192,img512,name});
        render(); calc();
      }catch(err){ alert('Errore immagine: '+err); }
    };
    inp.click(); return;
  }

  const drop = e.target.dataset.imgDel;
  if(drop!==undefined){
    const idx=+drop;
    Object.assign(rows[idx], {img192:null,img512:null,name:null});
    render(); calc();
  }
});

// ===== Calcoli (margine reale; sconto sul prezzo) =====
function calc(){
  let ricavi=0, costi=0;
  rows.forEach(r=>{
    const base  = r.price>0 ? r.price : basePrice(r.cost,r.margin);
    const final = base * (1 - ((r.disc||0)/100));
    const q     = (r.qty||1);
    ricavi += final * q;
    costi  += (r.cost||0) * q;
  });
  const extra = +$('#extra').value||0; ricavi += extra;

  const impon = ricavi;
  const marg  = ricavi - costi;
  const iva   = impon * ((+$('#vat').value||0)/100);
  const totale= impon + iva;

  $('#sumNetto').textContent      = money(ricavi);
  $('#sumMargin').textContent     = money(marg);
  $('#sumImponibile').textContent = money(impon);
  $('#sumTotale').textContent     = money(totale);
}

// ===== Auto-prezzo (target margine medio) =====
$('#autoPrice').addEventListener('click', ()=>{
  const target = (+$('#targetMargin').value||30)/100;
  const extra  = +$('#extra').value||0;

  const costi = rows.reduce((a,r)=> a + (r.cost||0)*(r.qty||1), 0);
  const ricaviTarget = costi / (1 - target);

  const ricaviAttualiBase = rows.reduce((a,r)=>{
    const base = (r.price>0 ? r.price : basePrice(r.cost,r.margin));
    return a + base * (1 - ((r.disc||0)/100)) * (r.qty||1);
  }, 0);

  const denom = ricaviAttualiBase || 1;
  const factor = (ricaviTarget - extra) / denom;

  rows = rows.map(r=>{
    const base = (r.price>0 ? r.price : basePrice(r.cost,r.margin));
    return {...r, price: +((base * factor).toFixed(2))};
  });

  render(); calc();
});

// Import CSV (desc,cost,margin,price,qty,disc) — immagini non via CSV
$('#importCsv').addEventListener('click',()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{
    const lines=String(reader.result).split(/\r?\n/).filter(Boolean);
    rows=[];
    lines.forEach(line=>{
      const p=line.split(/;|,/);
      rows.push({
        desc:p[0]||'', cost:+(p[1]||0), margin:+(p[2]||30), price:+(p[3]||0),
        qty:+(p[4]||1), disc:+(p[5]||0), img192:null, img512:null, name:null
      });
    });
    render(); calc();
  }; reader.readAsText(f); };
  inp.click();
});

// Demo CSV
$('#demoCsv').addEventListener('click',()=>{
  rows=[];
  rows.push({desc:'Piattaforma sollevamento PFA50', cost:9900, margin:30, price:0, qty:1, disc:0, img192:null,img512:null,name:null});
  rows.push({desc:'Smontagomme FT26SN', cost:3900, margin:35, price:0, qty:1, disc:5, img192:null,img512:null,name:null});
  rows.push({desc:'Bilanciatrice MEC 200 Truck', cost:3950, margin:28, price:0, qty:1, disc:0, img192:null,img512:null,name:null});
  render(); calc();
});

// ------- PRINT VIEW (interna/cliente) -------
function fmtDate(d=new Date()){
  return d.toLocaleDateString('it-IT',{year:'numeric',month:'2-digit',day:'2-digit'});
}
function parseNumber(s){
  if(typeof s==='number') return s;
  if(!s) return 0;
  return Number(String(s).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.'))||0;
}
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}

/**
 * buildPrintView
 * @param {'internal'|'client'} mode
 */
function buildPrintView(mode='internal'){
  const pv = $('#printView');
  if(!pv) return;

  const sumNetto = $('#sumNetto').textContent || money(0);
  const sumImpon = $('#sumImponibile').textContent || money(0);
  const sumTot   = $('#sumTotale').textContent || money(0);
  const ivaPct   = +($('#vat').value||22);
  const extra    = +($('#extra').value||0);

  // intestazione: in copia cliente nascondo "Modalità prezzo"
  const metaExtraLine = (mode==='internal')
    ? `<div><b>Modalità prezzo:</b> ${pricingMode==='margin'?'Margine':'Ricarico'}</div>`
    : '';

  // colonne tabella: client HIDE "Costi"
  const thead = (mode==='internal')
    ? `<tr>
         <th>Img</th><th>Descrizione</th><th>Costi</th><th>Prezzo netto</th>
         <th>Q.tà</th><th>Sconto %</th><th>Totale riga</th>
       </tr>`
    : `<tr>
         <th>Img</th><th>Descrizione</th><th>Prezzo netto</th>
         <th>Q.tà</th><th>Sconto %</th><th>Totale riga</th>
       </tr>`;

  const rowsHtml = rows.map((r)=>{
    const base = (r.price>0 ? r.price : basePrice(r.cost,r.margin));
    const finalUnit = base * (1 - ((r.disc||0)/100));
    const totaleRiga = finalUnit * (r.qty||1);
    const img = r.img192 ? `<img src="${r.img192}" class="pv-img" alt="">` : '';
    if(mode==='internal'){
      return `<tr>
        <td>${img}</td>
        <td>${escapeHtml(r.desc||'')}</td>
        <td class="right">${money(r.cost||0)}</td>
        <td class="right">${money(base)}</td>
        <td class="right">${r.qty||1}</td>
        <td class="right">${(r.disc||0).toLocaleString('it-IT')}%</td>
        <td class="right"><b>${money(totaleRiga)}</b></td>
      </tr>`;
    }else{
      // client: senza Costi
      return `<tr>
        <td>${img}</td>
        <td>${escapeHtml(r.desc||'')}</td>
        <td class="right">${money(base)}</td>
        <td class="right">${r.qty||1}</td>
        <td class="right">${(r.disc||0).toLocaleString('it-IT')}%</td>
        <td class="right"><b>${money(totaleRiga)}</b></td>
      </tr>`;
    }
  }).join('');

  // KPI: client HIDE "Ricavi netti"
  const kpiRicavi = (mode==='internal')
    ? `<div class="pv-kpi"><b>Ricavi netti</b><div class="val">${sumNetto}</div></div>`
    : '';

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
          ${metaExtraLine}
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
          <thead>${thead}</thead>
          <tbody>${rowsHtml || `<tr><td colspan="${mode==='internal'?7:6}" style="text-align:center;color:#666">Nessuna voce</td></tr>`}</tbody>
        </table>
      </div>

      <div class="pv-totals">
        ${kpiRicavi}
        <div class="pv-kpi"><b>Totale imponibile</b><div class="val">${sumImpon}</div></div>
        <div class="pv-kpi"><b>IVA ${ivaPct}% inclusa</b><div class="val">${money(parseNumber(sumTot) - parseNumber(sumImpon))}</div></div>
        <div class="pv-kpi"><b>Totale IVA inclusa</b><div class="val">${sumTot}</div></div>
      </div>

      <ul class="pv-notes">
        <li>Prezzi al netto di sconto riga. Consegna/trasporto/extra: inclusi in “Spese extra”.</li>
        <li>Preventivo generato con Preventivo PRO (PWA). Dati salvati localmente nel browser.</li>
      </ul>
    </div>
  `;
}

// ===== Stampa: due pulsanti + fallback scorciatoia =====
let lastPrintMode = 'internal'; // default
$('#printInternalBtn')?.addEventListener('click', ()=>{
  lastPrintMode = 'internal';
  buildPrintView('internal');
  window.print();
});
$('#printClientBtn')?.addEventListener('click', ()=>{
  lastPrintMode = 'client';
  buildPrintView('client');
  window.print();
});
// se l’utente usa direttamente Cmd/Ctrl+P:
window.addEventListener('beforeprint', ()=>{
  buildPrintView(lastPrintMode || 'internal');
});

// Pulsanti base
$('#addItem').addEventListener('click',()=>addRow());
['client','email','subject','validDays','vat','extra'].forEach(id=>{
  const el=$('#'+id); el.addEventListener('input',()=>{calc();});
});
$('#saveQuote').addEventListener('click',save);
$('#resetApp').addEventListener('click',()=>{ 
  if(confirm('Cancellare tutti i dati locali?')){ 
    localStorage.removeItem(storeKey); rows=[]; render(); calc(); 
  }
});

// Omaggio: Il Cubo
document.getElementById('giftBtn')?.addEventListener('click', ()=>{
  window.open(GIFT_URL, '_blank', 'noopener');
  toast('🎁 Buon divertimento con Il Cubo!');
});

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  hookModeMirror();
  updateModeUI();
});
load(); if(rows.length===0) addRow();
