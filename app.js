// app.js — Preventivo PRO (UI completa)
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

// Stato
let rows=[];
const storeKey='preventivo.pro.v1';
function save(){
  if(!pro && localStorage.getItem(storeKey)){
    alert('FREE: 1 preventivo salvato. Sblocca PRO per salvare illimitati.');
    return;
  }
  localStorage.setItem(storeKey, JSON.stringify({
    client:$('#client').value,email:$('#email').value,subject:$('#subject').value,validDays:$('#validDays').value,vat:$('#vat').value,extra:$('#extra').value,rows
  }));
  alert('Salvato.'+(pro?'':' (limite free)'));
}
function load(){
  const x=JSON.parse(localStorage.getItem(storeKey)||'null'); if(!x) return;
  $('#client').value=x.client||''; $('#email').value=x.email||''; $('#subject').value=x.subject||'';
  $('#validDays').value=x.validDays||'30'; $('#vat').value=x.vat||22; $('#extra').value=x.extra||0;
  rows=x.rows||[]; render(); calc();
}

// Righe
const tbody=$('#items');
function addRow(r={desc:'',cost:0,margin:30,price:0,qty:1,disc:0}){ rows.push(r); render(); calc(); }
function delRow(i){ rows.splice(i,1); render(); calc(); }
function render(){ tbody.innerHTML=''; rows.forEach((r,i)=>{
  const computed = +( (r.cost||0) * (1 + (r.margin||0)/100) ).toFixed(2);
  const displayPrice = (r.price && r.price>0) ? r.price : computed;
  const tr=document.createElement('tr'); tr.className='item'; tr.innerHTML=`
    <td><input data-i="${i}" data-k="desc" value="${r.desc}" placeholder="Voce"/></td>
    <td class="right"><input data-i="${i}" data-k="cost" type="number" inputmode="decimal" step="0.01" value="${r.cost}"/></td>
    <td class="right"><input data-i="${i}" data-k="margin" type="number" inputmode="decimal" step="0.1" value="${r.margin}"/></td>
    <td class="right"><input data-i="${i}" data-k="price" type="number" inputmode="decimal" step="0.01" value="${displayPrice}"/></td>
    <td class="right"><input data-i="${i}" data-k="qty" type="number" step="1" value="${r.qty}"/></td>
    <td class="right"><input data-i="${i}" data-k="disc" type="number" inputmode="decimal" step="0.1" value="${r.disc||0}"/></td>
    <td><button class="btn" data-del="${i}">×</button></td>`;
  tbody.appendChild(tr);
});}

tbody.addEventListener('input',e=>{
  const el=e.target; const i=+el.dataset.i; const k=el.dataset.k;
  if(Number.isInteger(i)){ rows[i][k]= (k==='desc')? el.value : +el.value; calc(); render(); }
});
tbody.addEventListener('click',e=>{ const i=e.target.dataset.del; if(i!==undefined){ delRow(+i); }});

// Calcoli
function calc(){
  let ricavi=0, costi=0;
  rows.forEach(r=>{
    const base = r.price>0? r.price : r.cost*(1+r.margin/100);
    const sconto = base*(r.disc||0)/100;
    const netto = (base - sconto) * (r.qty||1);
    ricavi += netto;
    costi  += (r.cost||0) * (r.qty||1);
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

// Auto-prezzo target margine%
$('#autoPrice').addEventListener('click',()=>{
  const target= (+$('#targetMargin').value||30)/100;
  let costi= rows.reduce((a,r)=> a + (r.cost||0)*(r.qty||1), 0);
  const ricaviTarget = costi / (1 - target);
  const ricaviAttuali = rows.reduce((a,r)=> a + ((r.price>0? r.price : r.cost*(1+r.margin/100)) - ((r.price>0? r.price : r.cost*(1+r.margin/100))*(r.disc||0)/100))*(r.qty||1), 0) + (+$('#extra').value||0);
  const factor = (ricaviTarget>0 && ricaviAttuali>0) ? (ricaviTarget/ricaviAttuali) : 1;
  rows = rows.map(r=> ({...r, price: +( (r.price>0? r.price : r.cost*(1+r.margin/100)) * factor ).toFixed(2)}));
  render(); calc();
});

// Import CSV (desc,cost,margin,price,qty,disc)
$('#importCsv').addEventListener('click',()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{
    const lines=String(reader.result).split(/\\r?\\n/).filter(Boolean);
    rows=[];
    lines.forEach(line=>{
      const p=line.split(/;|,/);
      rows.push({desc:p[0]||'', cost:+(p[1]||0), margin:+(p[2]||30), price:+(p[3]||0), qty:+(p[4]||1), disc:+(p[5]||0)});
    });
    render(); calc();
  }; reader.readAsText(f); };
  inp.click();
});

// Demo CSV
$('#demoCsv').addEventListener('click',()=>{
  rows=[];
  rows.push({desc:'Piattaforma sollevamento PFA50', cost:3200, margin:30, price:0, qty:1, disc:0});
  rows.push({desc:'Smontagomme FT26SN', cost:1450, margin:35, price:0, qty:1, disc:5});
  rows.push({desc:'Bilanciatrice MEC 200 Truck', cost:2800, margin:28, price:0, qty:1, disc:0});
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

// SW precache fix per sottocartelle (no-op qui, ma documentato)
// Init
load(); if(rows.length===0) addRow();
