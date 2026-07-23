let macros = {};
let editingTrigger = null;

document.addEventListener('DOMContentLoaded', () => {
  // Configuração das Abas
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const activeContent = document.getElementById(`tab-${target}`);
      if (activeContent) activeContent.classList.add('active');

      if (target === 'export') updateExportArea();
    });
  });

  // Filtro de Busca Jira
  const searchJira = document.getElementById('search-jira');
  if (searchJira) {
    searchJira.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const accordions = document.querySelectorAll('.jira-accordion');
      
      accordions.forEach(acc => {
        const keywords = acc.getAttribute('data-keywords') || '';
        const text = acc.innerText.toLowerCase();
        
        if (term === '' || keywords.includes(term) || text.includes(term)) {
          acc.style.display = 'block';
          if(term !== '') acc.open = true;
        } else {
          acc.style.display = 'none';
        }
      });
    });
  }

  // Carregar Macros Salvas (Busca em todas as chaves possíveis)
  loadMacros();

  // Pesquisa de Macros
  document.getElementById('search-macros').addEventListener('input', (e) => {
    renderMacros(e.target.value);
  });

  // Modal Botões
  document.getElementById('btn-add').addEventListener('click', () => openModal());
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-save').addEventListener('click', saveMacroFromModal);
  document.getElementById('btn-delete').addEventListener('click', deleteMacroFromModal);

  // Importar / Exportar
  document.getElementById('btn-import').addEventListener('click', importMacros);
  document.getElementById('btn-download').addEventListener('click', downloadExport);
});

function loadMacros() {
  // Busca por 'macros', 'userMacros' ou 'customMacros' para não errar a chave no Storage
  chrome.storage.local.get(['macros', 'userMacros', 'customMacros'], (result) => {
    let data = result.macros || result.userMacros || result.customMacros || {};

    // Se as macros estiverem salvas como Array de objetos [{trigger: '/x', text: 'y'}]
    if (Array.isArray(data)) {
      macros = {};
      data.forEach(item => {
        if (item.trigger && (item.text || item.value || item.replacement)) {
          macros[item.trigger] = item.text || item.value || item.replacement;
        }
      });
    } else {
      macros = data;
    }

    renderMacros();
  });
}

function renderMacros(filter = '') {
  const container = document.getElementById('macros-container');
  if (!container) return;
  container.innerHTML = '';

  const keys = Object.keys(macros).filter(k => 
    k.toLowerCase().includes(filter.toLowerCase()) || 
    String(macros[k]).toLowerCase().includes(filter.toLowerCase())
  );

  if (keys.length === 0) {
    container.innerHTML = '<p style="color:#888; text-align:center; margin-top:20px;">Nenhuma macro encontrada.</p>';
    return;
  }

  keys.forEach(trigger => {
    const item = document.createElement('div');
    item.className = 'macro-item';
    item.innerHTML = `
      <div class="macro-trigger">${escapeHtml(trigger)}</div>
      <div class="macro-preview">${escapeHtml(String(macros[trigger]))}</div>
    `;
    item.addEventListener('click', () => openModal(trigger));
    container.appendChild(item);
  });
}

function openModal(trigger = null) {
  editingTrigger = trigger;
  const modal = document.getElementById('modal-edit');
  const title = document.getElementById('modal-title');
  const inputTrigger = document.getElementById('edit-trigger');
  const inputText = document.getElementById('edit-text');
  const btnDelete = document.getElementById('btn-delete');

  if (trigger) {
    title.innerText = 'Editar Macro';
    inputTrigger.value = trigger;
    inputTrigger.disabled = true;
    inputText.value = macros[trigger] || '';
    btnDelete.style.display = 'block';
  } else {
    title.innerText = 'Nova Macro';
    inputTrigger.value = '';
    inputTrigger.disabled = false;
    inputText.value = '';
    btnDelete.style.display = 'none';
  }

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('modal-edit').classList.remove('active');
}

function saveMacroFromModal() {
  const trigger = document.getElementById('edit-trigger').value.trim();
  const text = document.getElementById('edit-text').value;

  if (!trigger || !text) {
    alert('Preencha a trigger e o texto!');
    return;
  }

  macros[trigger] = text;
  
  // Salva em ambos os formatos para garantir compatibilidade com o content.js
  chrome.storage.local.set({ macros: macros, userMacros: macros }, () => {
    renderMacros();
    closeModal();
  });
}

function deleteMacroFromModal() {
  if (editingTrigger && confirm(`Deseja excluir a macro "${editingTrigger}"?`)) {
    delete macros[editingTrigger];
    chrome.storage.local.set({ macros: macros, userMacros: macros }, () => {
      renderMacros();
      closeModal();
    });
  }
}

function updateExportArea() {
  const exportArea = document.getElementById('export-area');
  if (!exportArea) return;
  let text = '';
  for (const [trigger, value] of Object.entries(macros)) {
    text += `${trigger}==>${value}\n`;
  }
  exportArea.value = text;
}

function importMacros() {
  const importText = document.getElementById('import-area').value;
  if (!importText.trim()) return;

  const lines = importText.split('\n');
  lines.forEach(line => {
    if (line.includes('==>')) {
      const parts = line.split('==>');
      const trigger = parts[0].trim();
      const value = parts.slice(1).join('==>');
      if (trigger) macros[trigger] = value;
    }
  });

  chrome.storage.local.set({ macros: macros, userMacros: macros }, () => {
    alert('Macros importadas com sucesso!');
    document.getElementById('import-area').value = '';
    renderMacros();
  });
}

function downloadExport() {
  updateExportArea();
  const text = document.getElementById('export-area').value;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup_macros.txt';
  a.click();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}