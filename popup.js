let macros = [];
let settings = {};
let editingId = null;

function loadData() {
  chrome.storage.local.get(['macros', 'settings'], (result) => {
    macros = result.macros || [];
    settings = result.settings || { triggerChar: '/', searchTrigger: '//', separator: '==>' };
    renderMacros();
    renderExport();
  });
}

function saveMacros() {
  chrome.storage.local.set({ macros });
  renderMacros();
  renderExport();
}

// FUNÇÃO ATUALIZADA: Filtra apenas pelo gatilho e ordena colocando a melhor combinação no topo
function renderMacros(filter = '') {
  const container = document.getElementById('macros-container');
  const search = filter.toLowerCase().trim();

  // 1. Filtra buscando APENAS no gatilho (m.trigger)
  let filtered = macros.filter(m => 
    m.trigger.toLowerCase().includes(search)
  );

  // 2. Ordena para colocar no TOPO o gatilho que COMEÇA com o texto digitado
  if (search) {
    filtered.sort((a, b) => {
      const aTrigger = a.trigger.toLowerCase();
      const bTrigger = b.trigger.toLowerCase();

      const aStartsWith = aTrigger.startsWith(search);
      const bStartsWith = bTrigger.startsWith(search);

      // Prioridade 1: Quem começa com a busca vem primeiro
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // Prioridade 2: Se ambos começarem iguais, o mais curto vem primeiro
      return aTrigger.length - bTrigger.length;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhuma macro encontrada.<br>Use "Importar" para adicionar várias de uma vez.</div>`;
    return;
  }

  container.innerHTML = filtered.map(m => {
    const preview = m.text.length > 80 ? m.text.substring(0, 80) + '...' : m.text;
    return `<div class="macro-item" data-id="${m.id}">
      <div class="macro-trigger">${escapeHtml(m.trigger)}</div>
      <div class="macro-preview">${escapeHtml(preview)}</div>
    </div>`;
  }).join('');

  container.querySelectorAll('.macro-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseFloat(item.dataset.id);
      openEdit(id);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openEdit(id = null) {
  editingId = id;
  const modal = document.getElementById('modal-edit');
  const title = document.getElementById('modal-title');
  const triggerInput = document.getElementById('edit-trigger');
  const textInput = document.getElementById('edit-text');
  const btnDelete = document.getElementById('btn-delete');

  if (id) {
    const m = macros.find(x => x.id === id);
    title.textContent = 'Editar Macro';
    triggerInput.value = m.trigger;
    textInput.value = m.text;
    btnDelete.style.display = 'inline-block';
  } else {
    title.textContent = 'Nova Macro';
    triggerInput.value = settings.triggerChar || '/';
    textInput.value = '';
    btnDelete.style.display = 'none';
  }

  modal.classList.add('active');
  triggerInput.focus();
}

function closeEdit() {
  document.getElementById('modal-edit').classList.remove('active');
  editingId = null;
}

function saveEdit() {
  const trigger = document.getElementById('edit-trigger').value.trim();
  const text = document.getElementById('edit-text').value;

  if (!trigger || !text) {
    alert('Preencha o trigger e o texto.');
    return;
  }

  if (editingId) {
    const idx = macros.findIndex(m => m.id === editingId);
    if (idx !== -1) {
      macros[idx] = { ...macros[idx], trigger, text };
    }
  } else {
    macros.push({ trigger, text, id: Date.now() + Math.random() });
  }

  saveMacros();
  closeEdit();
}

function deleteMacro() {
  if (!editingId) return;
  if (!confirm('Tem certeza que deseja excluir esta macro?')) return;
  macros = macros.filter(m => m.id !== editingId);
  saveMacros();
  closeEdit();
}

function parseImport(text) {
  const lines = text.split('\n');
  const result = [];
  const sep = settings.separator || '==>';

  let lineModeCount = 0;
  let blockModeCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith(settings.triggerChar || '/') && line.includes(sep)) {
      lineModeCount++;
    } else if (line.startsWith(settings.triggerChar || '/')) {
      blockModeCount++;
    }
  }

  const useLineMode = lineModeCount >= blockModeCount;

  if (useLineMode) {
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      const idx = line.indexOf(sep);
      if (idx === -1) continue;
      const trigger = line.substring(0, idx).trim();
      const content = line.substring(idx + sep.length).trim();
      if (trigger && content) {
        result.push({ trigger, text: content, id: Date.now() + Math.random() });
      }
    }
  } else {
    let i = 0;
    while (i < lines.length) {
      let line = lines[i].trim();
      if (!line) { i++; continue; }
      if (line.startsWith(settings.triggerChar || '/')) {
        const trigger = line;
        const textLines = [];
        i++;
        while (i < lines.length) {
          const next = lines[i];
          if (next.trim() === '' && i + 1 < lines.length && lines[i+1].trim().startsWith(settings.triggerChar || '/')) {
            i++;
            break;
          }
          if (next.trim() !== '' && next.trim().startsWith(settings.triggerChar || '/')) {
            break;
          }
          textLines.push(next);
          i++;
        }
        const content = textLines.join('\n').trim();
        if (content) {
          result.push({ trigger, text: content, id: Date.now() + Math.random() });
        }
        continue;
      }
      i++;
    }
  }

  return result;
}

function doImport() {
  const area = document.getElementById('import-area');
  const resultDiv = document.getElementById('import-result');
  const text = area.value;

  if (!text.trim()) {
    resultDiv.className = 'error';
    resultDiv.textContent = 'Cole algum texto para importar.';
    return;
  }

  const imported = parseImport(text);
  if (imported.length === 0) {
    resultDiv.className = 'error';
    resultDiv.textContent = 'Nenhuma macro encontrada no texto. Verifique o formato.';
    return;
  }

  macros = [...macros, ...imported];
  saveMacros();
  area.value = '';
  resultDiv.className = 'success';
  resultDiv.textContent = `${imported.length} macro(s) importada(s) com sucesso!`;
  setTimeout(() => resultDiv.textContent = '', 3000);
}

function renderExport() {
  const sep = settings.separator || '==>';
  const lines = macros.map(m => `${m.trigger}${sep}${m.text}`);
  document.getElementById('export-area').value = lines.join('\n\n');
}

function downloadExport() {
  const blob = new Blob([document.getElementById('export-area').value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'macros-backup.txt';
  a.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

document.getElementById('btn-add').addEventListener('click', () => openEdit());
document.getElementById('btn-save').addEventListener('click', saveEdit);
document.getElementById('btn-cancel').addEventListener('click', closeEdit);
document.getElementById('btn-delete').addEventListener('click', deleteMacro);
document.getElementById('search-macros').addEventListener('input', (e) => renderMacros(e.target.value));
document.getElementById('btn-import').addEventListener('click', doImport);
document.getElementById('btn-clear-import').addEventListener('click', () => {
  document.getElementById('import-area').value = '';
  document.getElementById('import-result').textContent = '';
});
document.getElementById('btn-download').addEventListener('click', downloadExport);
document.getElementById('btn-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('modal-edit').addEventListener('click', (e) => {
  if (e.target.id === 'modal-edit') closeEdit();
});

loadData();