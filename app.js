// app.js — Preventivo PRO (img per riga + margine VERO / ricarico + fix input + auto-prezzo)
const $=sel=>document.querySelector(sel);
const money=v=> (v||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});

// PWA install
let deferred; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e; const b=$('#installBtn'); if(b){b.hidden=false; b.onclick=()=>deferred.prompt();}});
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js');}

// PRO flag (demo): ?pro=1 abilita; persistito
const urlParams = new URLSearchParams(location.search);
let pro = urlParams.get('pro')==='1' || localStorage.getItem('preventivo.pro.pro')==='1';
if(!pro){ document.body.classList.add('free'); } else { document.body.classList.remove('free'); }
function setPro(v){ pro = !!v; localStorage.setItem('preventivo.pro.pro', pro?'1':'0'); if(!pro){document.body.classList.add('free');} else {document.body.classList.remove('free');} }

// ---- Modalità prezzo: "margin" (margine vero) oppure "markup" (ricarico) ----
let pricingMode = localStorage.getItem('preventivo.pro.mode') || 'margin'; // 'margin' | 'markup'

// Helpers formule
// margine% = (P−C)/P  =>  P = C / (1 − margine)
function priceFromMargin(cost, marginPct){
  const m = (Number(marginPct)||0)/100;
  const denom = 1 - m;
  if (denom <= 0.000001) return Number.MAX_SAFE_INTEGER;
  return +((Number(cost)||0) / denom).toFixed(2);
}
// ricarico% => P = C × (1 + ricarico)
function priceFromMarkup(cost, markupPct){
  const r = (Number(markupPct)||0)/100;
  return +((Number(cost)||0) * (1+r)).toFixed(2);
}
// base price in base alla modalità
function basePrice(cost, pct){
  return pricingMode==='margin' ? priceFromMargin(cost, pct) : priceFromMarkup(cost, pct);
}

// ---------- Image utils ----------
function fileToDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
function resizeDataURL(dataURL, size){ // ritorna PNG dataURL size×size (cover)
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      canvas.width=size; canvas.height=size;
      const ctx=canvas.getContext('2d');
      const ratio = Math.max(size/img.width, size/img.height);
      const w = img.width*ratio, h = img.height*ratio;
      const x = (size - w)/2, y = (size - h)/2;
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,size,size); // sfondo bianco per stampa
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(img, x, y, w, h);
      res(canvas.toDataURL('image/png', 0.92));
    };
    img.onerror=rej; img.src=dataURL;
  });
}
async function processImageFile(file){
  const data = await fileToDataURL(file);
  const png192 = await resizeDataURL(data, 192);
  const png512 = await resizeDataURL(data, 512);
  return {img192: png192, img512: png512, name: file.name};
}

// Stato
let rows=[];
const storeKey='preventivo.pro.v1';
function save(){
  if(!pro && localStorage.getItem(storeKey)){
    alert('FREE: 1 preventivo salvato. Sblocca PRO per salvare illimitati.');
    return;
  }
  localStorage.setItem(storeKey, JSON.stringify({
    client:$('#client').value,email:$('#email').value,subject:$('#subject').value,
    validDays:$('#validDays').value,vat:$('#vat').value,extra:$('#extra').value,rows,pricingMode
  }));
  alert('Salvato.'+(pro?'':' (limite free)'));
}
function load(){
  const x=JSON.parse(localStorage.getItem(storeKey)||'null'); if(!x) return;
  $('#client').value=x.client||''; $('#email').value=x.email||''; $('#subject').value=x.subject||'';
  $('#validDays').value=x.validDays||'30'; $('#vat').value=x.vat||22; $('#extra').value=x.extra||0;
  if(x.pricingMode){ pricingMode = x.pricingMode; localStorage.setItem('preventivo.pro.mode', pricingMode); }
  rows=x.rows||[]; render(); calc(); updateModeLabel();
}

// UI: selettore modalità vicino al target margine
function ensureModeSelector(){
  if ($('#modeSelect')) return;
  const aside = document.querySelector('aside.card .section');
  if(!aside) return;
  const wrap = document.createElement('div');
  wrap.className = 'pill';
  wrap.style.marginTop = '8px';
  wrap.innerHTML = `
    <span style="margin-right:8px">Modalità prezzo:</span>
    <select id="modeSelect" style="background:#0f1836;border:1px solid var(--line);color:var(--ink);padding:6px 10px;border-radius:8px">
      <option value="margin">Margine</option>
      <option value="markup">Ricarico</option>
    </select>
  `;
  aside.appendChild(wrap);
  $('#modeSelect').value = pricingMode;
  $('#modeSelect').addEventListener('change',()=>{
    pricingMode = $('#modeSelect').value;
    localStorage.setItem('preventivo.pro.mode', pricingMode);
    updateModeLabel();
    render(); calc();
  });
}
// Aggiorna intestazione colonna (Margine % / Ricarico %)
function updateModeLabel(){
  const th = document.getElementById('thMargin');
  if(th) th.textContent = (pricingMode==='margin' ? 'Margine %' : 'Ricarico %');
}

document.addEventListener('DOMContentLoaded', ()=>{ ensureModeSelector(); updateModeLabel(); });

// Righe
const tbody=$('#items');
function addRow(r={desc:'',cost:0,margin:30,price:0,qty:1,disc:0,img192:null,img512:null,name:null}){ rows.push(r); render(); calc(); }
function delRow(i){ rows.splice(i,1); render(); calc(); }

function render(){ 
  tbody.innerHTML='';
  rows.forEach((r,i)=>{
    const computed = basePrice(r.cost, r.margin); // in base alla modalità
    const displayPrice = (r.price && r.price>0) ? r.price : computed;
    const cover = r.img192 ? `<img src="${r.img192}" alt="img" class="thumb">` : `<div class="thumb placeholder">📷</div>`;
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
      <td><input data-i="${i}" data-k="desc" value="${r.desc}" placeholder="Voce"/></td>
      <td class="right"><input data-i="${i}" data-k="cost" type="number" inputmode="decimal" step="0.01" value="${r.cost}"/></td>
      <td class="right"><input data-i="${i}" data-k="margin" type="number" inputmode="decimal" step="0.1" value="${r.margin}"/></td>
      <td class="right"><input data-i="${i}" data-k="price" type="number" inputmode="decimal" step="0.01" value="${displayPrice}"/></td>
      <td class="right"><input data-i="${i}" data-k="qty" type="number" step="1" value="${r.qty}"/></td>
      <td class="right"><input data-i="${i}" data-k="disc" type="number" inputmode="decimal" step="0.1" value="${r.disc||0}"/></td>
      <td><button class="btn" data-del="${i}">×</button></td>`;
    tbody.appendChild(tr);
  });
  ensureModeSelector(); updateModeLabel();
}

// 🔧 FIX input: aggiorna stato + (se prezzo non impostato) aggiorna prezzo calcolato
tbody.addEventListener('input',e=>{
  const el=e.target; const i=+el.dataset.i; const k=el.dataset.k;
  if(!Number.isInteger(i)) return;

  rows[i][k]= (k==='desc')? el.value : +el.value;

  if ((k==='cost' || k==='margin') && !(rows[i].price>0)) {
    const computed = basePrice(rows[i].cost, rows[i].margin);
    const priceInput = el.closest('tr').querySelector('input[data-k="price"]');
    if (priceInput) priceInput.value = computed;
  }

  calc();
});

// Click: cancella riga / upload img / delete img
tbody.addEventListener('click',async e=>{
  const iDel = e.target.dataset.del;
  if(iDel!==undefined){ delRow(+iDel); return; }

  const iUp = e.target.dataset.img;
  if(iUp!==undefined){
    const idx=+iUp;
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange=async ()=>{ const f=inp.files?.[0]; if(!f) return;
      try{
        const {img192,img512,name} = await processImageFile(f);
        rows[idx].img192=img192; rows[idx].img512=img512; rows[idx].name=name;
        render(); calc();
      }catch(err){ alert('Errore immagine: '+err); }
    };
    inp.click();
    return;
  }

  const iDrop = e.target.dataset.imgDel;
  if(iDrop!==undefined){
    const idx=+iDrop;
    rows[idx].img192=null; rows[idx].img512=null; rows[idx].name=null;
    render(); calc();
  }
});

// Calcoli (sempre margine reale nei totali; sconto applicato sul prezzo)
function calc(){
  let ricavi=0, costi=0;
  rows.forEach(r=>{
    const base   = r.price>0 ? r.price : basePrice(r.cost,r.margin);
    const final  = base * (1 - ((r.disc||0)/100));   // prezzo finale dopo sconto
    const q      = (r.qty||1);
    ricavi += final * q;
    costi  += (r.cost||0) * q;
  });
  const extra= +$('#extra').value||0; ricavi+=extra;
  const marg= ricavi - costi;
  const impon= ricavi;
  const iva = impon * ((+$('#vat').value||0)/100);
  const totale= impon + iva;
  $('#sumNetto').textContent=money(ricavi);
  $('#sumMargin').textContent=money(marg);
  $('#sumImponibile').textContent=money(impon);
  $('#sumTotale').textContent=money(totale);
}

// Auto-prezzo: mira SEMPRE al target di **margine medio** (dopo sconti), anche in modalità "ricarico"
$('#autoPrice').addEventListener('click',()=>{
  const target= (+$('#targetMargin').value||30)/100;
  const extra= +$('#extra').value||0;

  const costi= rows.reduce((a,r)=> a + (r.cost||0)*(r.qty||1), 0);
  const ricaviTarget = costi / (1 - target);

  const ricaviAttualiBase = rows.reduce((a,r)=>{
    const base = (r.price>0 ? r.price : basePrice(r.cost,r.margin));
    return a + base * (1 - ((r.disc||0)/100)) * (r.qty||1);
  }, 0);

  const denom = ricaviAttualiBase || 1;
  const factor = (ricaviTarget - extra) / denom;

  rows = rows.map(r=>{
    const base = (r.price>0 ? r.price : basePrice(r.cost,r.margin));
    return {...r, price: +( (base * factor).toFixed(2) )};
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
      rows.push({desc:p[0]||'', cost:+(p[1]||0), margin:+(p[2]||30), price:+(p[3]||0), qty:+(p[4]||1), disc:+(p[5]||0), img192:null, img512:null, name:null});
    });
    render(); calc();
  }; reader.readAsText(f); };
  inp.click();
});

// Demo CSV
$('#demoCsv').addEventListener('click',()=>{
  rows=[];
  rows.push({desc:'Piattaforma sollevamento PFA50', cost:1000, margin:30, price:0, qty:1, disc:0, img192:null,img512:null,name:null});
  rows.push({desc:'Smontagomme FT26SN', cost:1450, margin:35, price:0, qty:1, disc:5, img192:null,img512:null,name:null});
  rows.push({desc:'Bilanciatrice MEC 200 Truck', cost:2800, margin:28, price:0, qty:1, disc:0, img192:null,img512:null,name:null});
  render(); calc();
});

// UI listeners
$('#addItem').addEventListener('click',()=>addRow());
['client','email','subject','validDays','vat','extra'].forEach(id=>{
  const el=$('#'+id); el.addEventListener('input',()=>{calc();});
});
$('#saveQuote').addEventListener('click',save);
$('#resetApp').addEventListener('click',()=>{ if(confirm('Cancellare tutti i dati locali?')){ localStorage.removeItem(storeKey); rows=[]; render(); calc(); }});
$('#printBtn').addEventListener('click',()=>{ window.print(); });
$('#unlockPro').addEventListener('click',()=>{ window.location.href='https://buy.stripe.com/test_1234567890abcdef'; });

// Init
document.addEventListener('DOMContentLoaded', ()=>{ ensureModeSelector(); updateModeLabel(); });
load(); if(rows.length===0) addRow();
