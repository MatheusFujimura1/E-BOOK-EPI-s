// Simple CSV parser that handles quoted fields
function parseCSV(text){
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i=0;i<text.length;i++){
    const ch = text[i];
    const nxt = text[i+1] || '';
    if (ch === '"' ){
      if (inQuotes && nxt === '"'){ cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (ch === ',' || ch === '\n' || ch === '\r')){
      if (ch === ','){ row.push(cur); cur=''; }
      else if (ch === '\n' || ch === '\r'){
        if (cur!=='' || row.length>0) row.push(cur);
        if (row.length>0){ rows.push(row); }
        row = []; cur='';
        if (ch === '\r' && nxt === '\n'){ i++; }
      }
    } else { cur += ch; }
  }
  if (cur !== '' || row.length>0) row.push(cur);
  if (row.length>0) rows.push(row);
  return rows;
}

async function loadCSV(url){
  const r = await fetch(url);
  if (!r.ok) throw new Error('Falha ao carregar ' + url);
  const txt = await r.text();
  const rows = parseCSV(txt);
  const headers = rows.shift().map(h => h.trim().toLowerCase());
  return rows.map(r => {
    const obj = {};
    for (let i=0;i<headers.length;i++) obj[headers[i]] = r[i] ? r[i].trim() : '';
    return obj;
  });
}

function saveSelected(ids){ localStorage.setItem('selectedEpis', JSON.stringify(Array.from(ids))); }
function loadSelected(){ try { return new Set(JSON.parse(localStorage.getItem('selectedEpis')||'[]')); } catch(e){ return new Set(); } }

function createCard(item){
  const tpl = document.getElementById('card-template');
  const node = tpl.content.cloneNode(true);
  const imgEl = node.querySelector('.thumb img');
  imgEl.src = item.imagem || '';
  imgEl.alt = item.descricao || item.codigo || 'EPI';
  node.querySelector('.code').textContent = item.codigo || '';
  node.querySelector('.desc').textContent = item.descricao || '';
  node.querySelector('.subcode').textContent = '';
  const chk = node.querySelector('.chk');
  chk.dataset.codigo = item.codigo || '';
  const infoBtn = node.querySelector('.btn-info');

  // set checked state if in selected set
  if (selectedSet.has(item.codigo)) chk.checked = true;
  chk.addEventListener('change', e => {
    const code = e.target.dataset.codigo;
    if (e.target.checked) selectedSet.add(code);
    else selectedSet.delete(code);
    saveSelected(selectedSet);
    refreshFloatingButton();
  });

  infoBtn.addEventListener('click', () => openDetail(item));
  return node;
}

function renderList(items){
  const list = document.getElementById('list');
  list.innerHTML = '';
  if (!items.length){ list.innerHTML = '<div style="color:#fff;font-weight:700;padding:18px">Nenhum item encontrado.</div>'; return; }
  for (const it of items){
    const card = createCard(it);
    list.appendChild(card);
  }
}

let allItems = [];
let selectedSet = loadSelected();

function applyFilter(q){
  const ql = q.trim().toLowerCase();
  if (!ql) return renderList(allItems);
  const filtered = allItems.filter(it => {
    return (it.codigo || '').toLowerCase().includes(ql) ||
           (it.descricao || '').toLowerCase().includes(ql);
  });
  renderList(filtered);
}

// ----- Detail modal -----
function openDetail(item){
  const modal = document.getElementById('detail-modal');
  document.getElementById('detail-img').src = item.imagem || '';
  document.getElementById('detail-code').value = item.codigo || '';
  document.getElementById('detail-desc').value = item.descricao || '';
  modal.setAttribute('aria-hidden', 'false');
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeDetail(){ document.getElementById('detail-modal').setAttribute('aria-hidden','true'); }

// ----- Selected modal -----
function refreshFloatingButton(){
  const btn = document.getElementById('view-selected');
  const count = selectedSet.size;
  document.getElementById('selected-count').textContent = count;
  btn.style.display = count > 0 ? 'inline-flex' : 'none';
}
function openSelectedModal(){
  const modal = document.getElementById('selected-modal');
  const list = document.getElementById('selected-list');
  list.innerHTML = '';
  const selectedArray = allItems.filter(i => selectedSet.has(i.codigo));
  if (selectedArray.length === 0) list.innerHTML = '<div style="padding:12px;color:#fff">Nenhum EPI selecionado.</div>';
  else {
    for (const it of selectedArray){
      const div = document.createElement('div');
      div.className = 'selected-item';
      div.innerHTML = `<img src="${it.imagem||''}" alt=""><div><div style="font-weight:700">${it.codigo||''}</div><div style="font-size:13px;opacity:0.95">${it.descricao||''}</div></div>`;
      list.appendChild(div);
    }
  }
  modal.setAttribute('aria-hidden','false');
}
function closeSelectedModal(){ document.getElementById('selected-modal').setAttribute('aria-hidden','true'); }

function confirmSelection(){
  selectedSet.clear();
  saveSelected(selectedSet);
  closeSelectedModal();
  renderList(allItems);
  refreshFloatingButton();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    allItems = await loadCSV('epis.csv');
    renderList(allItems);
    refreshFloatingButton();
  } catch (err){
    console.error(err);
    document.getElementById('list').innerHTML = '<div style="color:#fff;font-weight:700;padding:18px">Erro ao carregar catálogo.</div>';
  }

  const search = document.getElementById('search');
  search.addEventListener('input', e => applyFilter(e.target.value));
  document.getElementById('clear').addEventListener('click', () => { search.value=''; applyFilter(''); });

  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('view-selected').addEventListener('click', openSelectedModal);
  document.getElementById('cancel-selection').addEventListener('click', closeSelectedModal);
  document.getElementById('confirm-selection').addEventListener('click', confirmSelection);

  document.getElementById('detail-modal').addEventListener('click', (e)=>{ if(e.target.id==='detail-modal') closeDetail(); });
  document.getElementById('selected-modal').addEventListener('click', (e)=>{ if(e.target.id==='selected-modal') closeSelectedModal(); });
});

window.addEventListener('load', refreshFloatingButton);
