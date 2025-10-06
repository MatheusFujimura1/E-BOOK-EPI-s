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
        // handle CRLF by looking ahead
        if (cur!=='' || row.length>0) row.push(cur);
        if (row.length>0){ rows.push(row); }
        row = []; cur='';
        // skip an immediate LF after CR
        if (ch === '\r' && nxt === '\n'){ i++; }
      }
    } else { cur += ch; }
  }
  // last value
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

function createCard(item){
  const tpl = document.getElementById('card-template');
  const node = tpl.content.cloneNode(true);
  node.querySelector('.thumb img').src = item.imagem || '';
  node.querySelector('.thumb img').alt = item.descricao || item.codigo || 'EPI';
  node.querySelector('.code').textContent = item.codigo || '';
  node.querySelector('.desc').textContent = item.descricao || '';
  node.querySelector('.subcode').textContent = '';
  const chk = node.querySelector('.chk');
  chk.addEventListener('change', e => {
    // visual feedback if checked
    node.querySelector('.card')?.classList.toggle('selected', e.target.checked);
  });
  const infoBtn = node.querySelector('.btn-info');
  infoBtn.addEventListener('click', () => {
    alert((item.codigo ? item.codigo + '\\n' : '') + (item.descricao || ''));
  });
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

function applyFilter(q){
  const ql = q.trim().toLowerCase();
  if (!ql) return renderList(allItems);
  const filtered = allItems.filter(it => {
    return (it.codigo || '').toLowerCase().includes(ql) ||
           (it.descricao || '').toLowerCase().includes(ql);
  });
  renderList(filtered);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    allItems = await loadCSV('epis.csv');
    renderList(allItems);
  } catch (err){
    console.error(err);
    document.getElementById('list').innerHTML = '<div style="color:#fff;font-weight:700;padding:18px">Erro ao carregar catálogo.</div>';
  }

  const search = document.getElementById('search');
  search.addEventListener('input', e => applyFilter(e.target.value));
  document.getElementById('clear').addEventListener('click', () => { search.value=''; applyFilter(''); });
});