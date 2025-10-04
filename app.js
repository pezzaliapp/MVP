// app.js — Preventivo PRO (gratuito con omaggio)
// img per riga + modalità Margine/Ricarico + auto-prezzo + PRINT VIEW (interna/cliente) + CATALOGO con ricerca

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

// ===== Extra (numero o testo) =====
// Estrae il PRIMO importo presente nel testo, accettando:
// - separatori migliaia con punti o spazi (anche NBSP)
// - decimali con virgola o punto
// - simboli valuta sparsi
// Se non trova numeri => amount = 0. label resta il testo originale.
function getExtra(){
  const raw = ($('#extra')?.value ?? '').trim();
  if (!raw) return { amount: 0, label: '0' };

  // match robusto tipo EUR: "1.200,50" | "1200.50" | "1 200,50" | "-75,5" | "120"
  const m = raw.match(/[-+]?\d{1,3}(?:[.\s\u00A0]\d{3})*(?:[.,]\d+)?|[-+]?\d+(?:[.,]\d+)?/);

  let amount = 0;
  if (m) {
    let s = m[0];

    // Tieni solo cifre, segni e separatori , .
    s = s.replace(/[^\d.,\-+]/g, '');

    // Caso con sia . che , => in EU di solito . = migliaia, , = decimali
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.'); // "1.234,56" -> "1234.56"
    } else if (s.includes(',')) {
      // Solo virgola => trattala come decimale
      s = s.replace(',', '.'); // "75,5" -> "75.5"
    } else {
      // Solo punto o solo cifre -> già OK (il punto può essere decimale o migliaia senza virgola: accettiamo come decimale)
      // Se volessi forzare il punto come migliaia (raro), potresti rimuovere i punti quando non ci sono decimali.
    }

    const n = parseFloat(s);
    amount = Number.isFinite(n) ? n : 0;
  }

  return {
    amount,       // usato nei conteggi
    label: raw    // mostrato in stampa così com’è
  };
}
// ===== Formule =====
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
function resizeDataURL(dataURL, size){
  return new Promise((res,rej)=>{
    const img = new Image();
    img.onload = ()=>{
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      const ratio = Math.max(size/img.width, size/img.height);
      const w = img.width*ratio, h = img.height*ratio;
      const x = (size - w)/2, y = (size - h)/2;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0,0,size,size);
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
let catalog = []; // <- CATALOGO ricercabile

const storeKey = 'preventivo.pro.v1';
const catalogKey = 'preventivo.pro.catalog.v1';

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
  if(catalog?.length){
    localStorage.setItem(catalogKey, JSON.stringify(catalog));
  }
  toast('Salvato');
}
function load(){
  const x = JSON.parse(localStorage.getItem(storeKey)||'null'); 
  if(x){
    $('#client').value = x.client || '';
    $('#email').value  = x.email  || '';
    $('#subject').value= x.subject|| '';
    $('#validDays').value = x.validDays || '30';
    $('#vat').value = x.vat || 22;
    $('#extra').value = x.extra || 0;
    if(x.pricingMode){ pricingMode = x.pricingMode; localStorage.setItem('preventivo.pro.mode', pricingMode); }
    rows = (x.rows||[]).map(r => ({...r}));
  }
  catalog = JSON.parse(localStorage.getItem(catalogKey)||'[]');
  render(); calc(); updateModeUI();
}

// ===== Modalità prezzo: UI =====
function updateModeLabel(){
  const th = document.getElementById('thMargin');
  if(th) th.textContent = (pricingMode==='margin' ? 'Margine %' : 'Ricarico %');
}
function updateModeUI(){
  updateModeLabel();
  const sel = $('#modeMirror');
  if(sel){ sel.value = (pricingMode==='margin') ? 'Margine' : 'Ricarico'; }
}
function hookModeMirror(){
  const sel = $('#modeMirror');
  if(!sel) return;
  sel.addEventListener('change', ()=>{
    pricingMode = (sel.value==='Ricarico') ? 'markup' : 'margin';
    localStorage.setItem('preventivo.pro.mode', pricingMode);
    updateModeUI();
    // ricalcola righe non forzate (price==0)
    rows = rows.map(r => (Number(r.price)>0) ? r : {...r, price:0});
    render(); calc();
  });
}

// ===== Righe =====
const tbody = $('#items');

function addRow(r={desc:'',cost:0,margin:0,price:0,qty:1,disc:0,img192:null,img512:null,name:null}){
  rows.push(r); render(); calc();
  setTimeout(()=>{
    const last = tbody.querySelector('tr.item:last-child input[data-k="desc"]');
    last?.focus();
  },0);
}
function delRow(i){ rows.splice(i,1); render(); calc(); }

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}

// ===== Autocomplete (catalogo) =====
let acBox; let acIndex = -1; let acFor; // input attivo
function ensureACStyles(){
  if($('#ac-style')) return;
  const st = document.createElement('style'); st.id='ac-style';
  st.textContent = `
    .ac-box{position:absolute;z-index:9999;background:#0f1836;border:1px solid #1d2a55;border-radius:10px;box-shadow:0 6px 22px rgba(0,0,0,.25);max-height:260px;overflow:auto;min-width:240px}
    .ac-item{padding:8px 10px;cursor:pointer;display:flex;gap:8px;align-items:center}
    .ac-item:hover,.ac-item.on{background:#12204b}
    .ac-code{font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#9fb0d9}
    .ac-desc{font-size:13px}
    .ac-price{margin-left:auto;font-size:12px;color:#9fb0d9}
  `;
  document.head.appendChild(st);
}
function closeAC(){ acBox?.remove(); acBox=null; acIndex=-1; acFor=null; }

function openACFor(input, i){
  ensureACStyles();
  acFor = { input, rowIndex:i };
  if(!acBox){ acBox = document.createElement('div'); acBox.className='ac-box'; document.body.appendChild(acBox); }
  positionAC();
  updateACList(input.value.trim());
}
function positionAC(){
  if(!acBox || !acFor) return;
  const r = acFor.input.getBoundingClientRect();
  acBox.style.left = (window.scrollX + r.left) + 'px';
  acBox.style.top  = (window.scrollY + r.bottom + 4) + 'px';
  acBox.style.width= r.width + 'px';
}
window.addEventListener('scroll', positionAC, true);
window.addEventListener('resize', positionAC);

function updateACList(query){
  if(!acBox) return;
  const q = query.toLowerCase();
  const list = (!q ? [] : catalog.filter(it =>
    (it.desc||'').toLowerCase().includes(q) || (it.code||'').toLowerCase().includes(q)
  ).slice(0,20));

  if(list.length===0){ acBox.innerHTML = `<div class="ac-item" style="color:#9fb0d9;cursor:default">Nessun risultato…</div>`; return; }

  acBox.innerHTML = list.map((it,idx)=>`
    <div class="ac-item" data-idx="${idx}">
      <span class="ac-code">${escapeHtml(it.code || '—')}</span>
      <span class="ac-desc">${escapeHtml(it.desc || '')}</span>
      <span class="ac-price">${money(+it.cost || 0)}</span>
    </div>
  `).join('');

  Array.from(acBox.querySelectorAll('.ac-item')).forEach(el=>{
    el.addEventListener('mouseenter', ()=>{ acIndex = +el.dataset.idx; markAC(); });
    el.addEventListener('mousedown', (ev)=>{ ev.preventDefault(); selectAC(+el.dataset.idx); });
  });

  acBox._data = list; // risultati correnti
  acIndex = 0; markAC();
}
function markAC(){
  if(!acBox) return;
  Array.from(acBox.children).forEach((c,idx)=> c.classList.toggle('on', idx===acIndex));
}
function selectAC(idx){
  if(!acBox || !acFor) return;
  const item = acBox._data?.[idx]; if(!item) return;
  const i = acFor.rowIndex;

  // Scrive la DESCRIZIONE nel campo giusto, non il costo
  rows[i].desc   = item.desc || rows[i].desc;
  rows[i].cost   = Number(item.cost)   || 0;
  rows[i].margin = Number(item.margin) || (rows[i].margin || 0);
  rows[i].price  = 0; // lasciare 0 per ricalcolo automatico con la modalità corrente

  // aggiorna inputs della riga già in DOM
  const tr = acFor.input.closest('tr');
  tr.querySelector('input[data-k="desc"]').value   = rows[i].desc;
  tr.querySelector('input[data-k="cost"]').value   = rows[i].cost;
  tr.querySelector('input[data-k="margin"]').value = rows[i].margin;
  tr.querySelector('input[data-k="price"]').value  = basePrice(rows[i].cost, rows[i].margin);

  closeAC(); calc();
}

function attachAutocomplete(input, i){
  input.addEventListener('focus', ()=> openACFor(input,i));
  input.addEventListener('input', ()=> updateACList(input.value));
  input.addEventListener('keydown', (e)=>{
    if(!acBox) return;
    if(e.key==='ArrowDown'){ acIndex=Math.min(acIndex+1, acBox.children.length-1); markAC(); e.preventDefault(); }
    else if(e.key==='ArrowUp'){ acIndex=Math.max(acIndex-1, 0); markAC(); e.preventDefault(); }
    else if(e.key==='Enter'){ selectAC(acIndex); e.preventDefault(); }
    else if(e.key==='Escape'){ closeAC(); }
  });
  document.addEventListener('click', (ev)=>{
    if(!acBox) return;
    if(ev.target!==input && !acBox.contains(ev.target)) closeAC();
  }, {capture:true});
}

// ===== Render =====
function render(){
  tbody.innerHTML = '';
  rows.forEach((r,i)=>{
    const computed = basePrice(Number(r.cost)||0, Number(r.margin)||0);
    const displayPrice = (Number(r.price)>0) ? Number(r.price) : computed;

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
      <td><input data-i="${i}" data-k="desc" value="${escapeHtml(r.desc)}" placeholder="Voce o cerca nel catalogo…"></td>
      <td class="right"><input data-i="${i}" data-k="cost" type="number" inputmode="decimal" step="0.01" value="${Number(r.cost)||0}"></td>
      <td class="right"><input data-i="${i}" data-k="margin" type="number" inputmode="decimal" step="0.1" value="${Number(r.margin)||0}"></td>
      <td class="right"><input data-i="${i}" data-k="price" type="number" inputmode="decimal" step="0.01" value="${displayPrice}"></td>
      <td class="right"><input data-i="${i}" data-k="qty" type="number" step="1" value="${Number(r.qty)||1}"></td>
      <td class="right"><input data-i="${i}" data-k="disc" type="number" inputmode="decimal" step="0.1" value="${Number(r.disc)||0}"></td>
      <td><button class="btn" data-del="${i}">×</button></td>
    `;
    tbody.appendChild(tr);

    // attacca l’autocomplete alla descrizione
    attachAutocomplete(tr.querySelector('input[data-k="desc"]'), i);
  });
  updateModeUI();
}

// ===== Input live =====
tbody.addEventListener('input', e=>{
  const el = e.target;
  const i  = Number(el.dataset.i);
  const k  = el.dataset.k;
  if(!Number.isFinite(i) || !rows[i]) return;

  if(k === 'desc'){
    rows[i].desc = el.value;
  }else{
    const val = el.value === '' ? 0 : Number(String(el.value).replace(',', '.'));
    rows[i][k] = Number.isFinite(val) ? val : 0;
  }

  if((k==='cost' || k==='margin') && !(Number(rows[i].price)>0)){
    const priceInput = el.closest('tr').querySelector('input[data-k="price"]');
    if(priceInput) priceInput.value = basePrice(Number(rows[i].cost)||0, Number(rows[i].margin)||0);
  }
  calc();
});

// ===== Click: delete / upload img / delete img =====
tbody.addEventListener('click', async e=>{
  const del = e.target.dataset.del;
  if(del!==undefined){ delRow(Number(del)); return; }

  const up = e.target.dataset.img;
  if(up!==undefined){
    const idx = Number(up);
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='image/*';
    inp.onchange = async ()=>{
      const f = inp.files?.[0]; if(!f) return;
      try{
        const {img192,img512,name} = await processImageFile(f);
        Object.assign(rows[idx], {img192,img512,name});
        render(); calc();
      }catch(err){ alert('Errore immagine: '+err); }
    };
    inp.click();
    return;
  }

  const drop = e.target.dataset.imgDel;
  if(drop!==undefined){
    const idx = Number(drop);
    Object.assign(rows[idx], {img192:null,img512:null,name:null});
    render(); calc();
  }
});

// ===== Calcoli =====
function calc(){
  let ricavi=0, costi=0;
  rows.forEach(r=>{
    const base  = (Number(r.price)>0 ? Number(r.price) : basePrice(Number(r.cost)||0, Number(r.margin)||0));
    const final = base * (1 - ((Number(r.disc)||0)/100));
    const q     = (Number(r.qty)||1);
    ricavi += final * q;
    costi  += (Number(r.cost)||0) * q;
  });
  const extra = getExtra().amount;
  ricavi += extra;

  const impon = ricavi;
  const marg  = ricavi - costi;
  const iva   = impon * ((Number($('#vat')?.value)||0)/100);
  const totale= impon + iva;

  $('#sumNetto').textContent      = money(ricavi);
  $('#sumMargin').textContent     = money(marg);
  $('#sumImponibile').textContent = money(impon);
  $('#sumTotale').textContent     = money(totale);
}

// ===== Auto-prezzo =====
$('#autoPrice')?.addEventListener('click', ()=>{
  const target = (Number($('#targetMargin')?.value)||30)/100;
  const extra  = getExtra().amount;

  const costi = rows.reduce((a,r)=> a + (Number(r.cost)||0)*(Number(r.qty)||1), 0);
  const ricaviTarget = costi / Math.max(1 - target, 0.0001);

  const ricaviAttualiBase = rows.reduce((a,r)=>{
    const base = (Number(r.price)>0 ? Number(r.price) : basePrice(Number(r.cost)||0, Number(r.margin)||0));
    return a + base * (1 - ((Number(r.disc)||0)/100)) * (Number(r.qty)||1);
  }, 0);

  const denom = ricaviAttualiBase || 1;
  const factor = (ricaviTarget - extra) / denom;

  rows = rows.map(r=>{
    const base = (Number(r.price)>0 ? Number(r.price) : basePrice(Number(r.cost)||0, Number(r.margin)||0));
    return {...r, price: +((base * factor).toFixed(2))};
  });

  render(); calc();
});

// ===== Import CSV -> CATALOGO =====
$('#importCsv')?.addEventListener('click',()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv';
  inp.onchange=()=>{
    const f=inp.files?.[0]; if(!f) return;
    const reader=new FileReader();
    reader.onload=()=>{
      const lines=String(reader.result).split(/\r?\n/).filter(Boolean);
      const out=[];
      // salta eventuale intestazione se contiene lettere
      const start= (lines[0] && /[a-zA-Z]/.test(lines[0])) ? 1 : 0;
      for(let li=start; li<lines.length; li++){
        const raw = lines[li].trim();
        if(!raw) continue;
        const p = raw.split(/;|,/).map(s=>s.replace(/^"(.*)"$/,'$1'));
        // mapping flessibile (default margin=0)
        let code='', desc='', cost=0, margin=0, price=0;
        if(p.length>=5){ [code,desc,cost,margin,price] = [p[0],p[1],+p[2]||0,+p[3]||0,+p[4]||0]; }
        else if(p.length===4){ [desc,cost,margin,price] = [p[0],+p[1]||0,+p[2]||0,+p[3]||0]; }
        else if(p.length===3){ [desc,cost,margin] = [p[0],+p[1]||0,+p[2]||0]; }
        else { continue; }
        out.push({code, desc, cost, margin, price});
      }
      catalog = out;
      localStorage.setItem(catalogKey, JSON.stringify(catalog));
      toast(`Catalogo importato: ${catalog.length} articoli`);
    };
    reader.readAsText(f);
  };
  inp.click();
});

// ===== Demo righe (facoltativo) =====
$('#demoCsv')?.addEventListener('click',()=>{
  rows=[];
  rows.push({desc:'Piattaforma sollevamento PFA50', cost:9900, margin:0, price:0, qty:1, disc:0, img192:null,img512:null,name:null});
  rows.push({desc:'Smontagomme FT26SN',         cost:3900, margin:0, price:0, qty:1, disc:5, img192:null,img512:null,name:null});
  rows.push({desc:'Bilanciatrice MEC 200 Truck', cost:3950, margin:0, price:0, qty:1, disc:0, img192:null,img512:null,name:null});
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

/**
 * buildPrintView
 * @param {'internal'|'client'} mode
 */
function buildPrintView(mode='internal'){
  const pv = $('#printView');
  if(!pv) return;

  const sumNetto = $('#sumNetto')?.textContent || money(0);
  const sumImpon = $('#sumImponibile')?.textContent || money(0);
  const sumTot   = $('#sumTotale')?.textContent || money(0);
  const ivaPct   = +( $('#vat')?.value || 22 );
  const extraInfo= getExtra();
  const extraShown = (/^-?\d+(?:[.,]\d+)?$/.test(extraInfo.label))
    ? money(extraInfo.amount)
    : escapeHtml(extraInfo.label);

  const metaExtraLine = (mode==='internal')
    ? `<div><b>Modalità prezzo:</b> ${pricingMode==='margin'?'Margine':'Ricarico'}</div>`
    : '';

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
    const base = (Number(r.price)>0 ? Number(r.price) : basePrice(Number(r.cost)||0, Number(r.margin)||0));
    const finalUnit = base * (1 - ((Number(r.disc)||0)/100));
    const totaleRiga = finalUnit * (Number(r.qty)||1);
    const img = r.img192 ? `<img src="${r.img192}" class="pv-img" alt="">` : '';
    if(mode==='internal'){
      return `<tr>
        <td>${img}</td>
        <td>${escapeHtml(r.desc||'')}</td>
        <td class="right">${money(Number(r.cost)||0)}</td>
        <td class="right">${money(base)}</td>
        <td class="right">${Number(r.qty)||1}</td>
        <td class="right">${(Number(r.disc)||0).toLocaleString('it-IT')}%</td>
        <td class="right"><b>${money(totaleRiga)}</b></td>
      </tr>`;
    }else{
      return `<tr>
        <td>${img}</td>
        <td>${escapeHtml(r.desc||'')}</td>
        <td class="right">${money(base)}</td>
        <td class="right">${Number(r.qty)||1}</td>
        <td class="right">${(Number(r.disc)||0).toLocaleString('it-IT')}%</td>
        <td class="right"><b>${money(totaleRiga)}</b></td>
      </tr>`;
    }
  }).join('');

  const kpiRicavi = (mode==='internal')
    ? `<div class="pv-kpi"><b>Ricavi netti</b><div class="val">${sumNetto}</div></div>`
    : '';

  $('#printView').innerHTML = `
    <div class="pv-wrap">
      <div class="pv-head">
        <div class="pv-brand">
          <h1>Preventivo PRO</h1>
          <small>PWA — pezzaliAPP</small>
        </div>
        <div class="pv-meta">
          <div><b>Data:</b> ${fmtDate()}</div>
          <div><b>Validità:</b> ${$('#validDays')?.value||'—'} giorni</div>
          ${metaExtraLine}
        </div>
      </div>

      <div class="pv-card">
        <h2>Dati cliente & preventivo</h2>
        <div class="pv-grid">
          <div class="pv-field"><b>Cliente</b><span>${escapeHtml($('#client')?.value||'')}</span></div>
          <div class="pv-field"><b>Email</b><span>${escapeHtml($('#email')?.value||'')}</span></div>
          <div class="pv-field"><b>Oggetto</b><span>${escapeHtml($('#subject')?.value||'')}</span></div>
          <div class="pv-field"><b>Spese (trasporto, installazione)</b><span>${extraShown}</span></div>
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
        <li>Preventivo generato con Preventivo PRO (PWA). Dati salvati localmente nel browser.</li>
      </ul>
    </div>
  `;
}

// ===== Stampa =====
let lastPrintMode = 'internal';
$('#printInternalBtn')?.addEventListener('click', ()=>{ lastPrintMode='internal'; buildPrintView('internal'); window.print(); });
$('#printClientBtn')?.addEventListener('click', ()=>{ lastPrintMode='client';  buildPrintView('client');  window.print(); });
window.addEventListener('beforeprint', ()=>{ buildPrintView(lastPrintMode || 'internal'); });

// ===== Pulsanti base =====
$('#addItem')?.addEventListener('click',()=>addRow());
['client','email','subject','validDays','vat','extra'].forEach(id=>{
  const el=$('#'+id); el?.addEventListener('input',()=>{calc();});
});
$('#saveQuote')?.addEventListener('click',save);
$('#resetApp')?.addEventListener('click',()=>{ 
  if(confirm('Cancellare tutti i dati locali?')){ 
    localStorage.removeItem(storeKey); localStorage.removeItem(catalogKey);
    rows=[]; catalog=[]; render(); calc(); 
  }
});

// ===== Omaggio: Il Cubo =====
document.getElementById('giftBtn')?.addEventListener('click', ()=>{
  window.open(GIFT_URL, '_blank', 'noopener');
  toast('🎁 Buon divertimento con Il Cubo!');
});

// ===== Init =====
document.addEventListener('DOMContentLoaded', ()=>{
  hookModeMirror();
  updateModeUI();
});
load(); if(rows.length===0) addRow();
