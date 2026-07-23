/**
 * Rodrigo Facilidades — Popup script
 * Gerencia CRUD de macros, importação/exportação e filtro de chamados Jira.
 */
(() => {
  'use strict';

  let macros = {};
  let editingTrigger = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupTabs();
    setupJiraFilter();
    setupMacrosUI();
    setupModal();
    setupImportExport();
    loadMacros();
  }

  // ---------------------------------------------------------------------
  // Abas
  // ---------------------------------------------------------------------
  function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');

        tabBtns.forEach((b) => b.classList.remove('active'));
        tabContents.forEach((c) => c.classList.remove('active'));

        btn.classList.add('active');
        const activeContent = document.getElementById(`tab-${target}`);
        if (activeContent) activeContent.classList.add('active');

        if (target === 'export') updateExportArea();
      });
    });
  }

  // ---------------------------------------------------------------------
  // Filtro de chamados Jira
  // ---------------------------------------------------------------------
  function setupJiraFilter() {
    const searchJira = document.getElementById('search-jira');
    if (!searchJira) return;

    searchJira.addEventListener('input', debounce((e) => {
      const term = e.target.value.toLowerCase().trim();
      const accordions = document.querySelectorAll('.jira-accordion');

      accordions.forEach((acc) => {
        const keywords = acc.getAttribute('data-keywords') || '';
        const text = acc.innerText.toLowerCase();

        if (term === '' || keywords.includes(term) || text.includes(term)) {
          acc.style.display = 'block';
          if (term !== '') acc.open = true;
        } else {
          acc.style.display = 'none';
        }
      });
    }, 150));
  }

  // ---------------------------------------------------------------------
  // Macros: storage
  // ---------------------------------------------------------------------
  function loadMacros() {
    chrome.storage.local.get(['macros', 'userMacros', 'customMacros'], (result) => {
      let data = result.macros || result.userMacros || result.customMacros || {};

      if (Array.isArray(data)) {
        const normalized = {};
        data.forEach((item) => {
          if (item && item.trigger && (item.text || item.value || item.replacement)) {
            normalized[item.trigger] = item.text || item.value || item.replacement;
          }
        });
        macros = normalized;
      } else {
        macros = data || {};
      }

      updateCounter();
      renderMacros();
    });
  }

  function persistMacros(callback) {
    chrome.storage.local.set({ macros, userMacros: macros }, () => {
      if (typeof callback === 'function') callback();
    });
  }

  // ---------------------------------------------------------------------
  // Macros: UI
  // ---------------------------------------------------------------------
  function setupMacrosUI() {
    document.getElementById('search-macros').addEventListener('input', debounce((e) => {
      renderMacros(e.target.value);
    }, 120));

    document.getElementById('btn-add').addEventListener('click', () => openModal());
  }

  function updateCounter() {
    const countBadge = document.getElementById('macro-count');
    if (!countBadge) return;
    const total = Object.keys(macros).length;
    countBadge.innerText = `${total} macro${total !== 1 ? 's' : ''}`;
  }

  function renderMacros(filter = '') {
    const container = document.getElementById('macros-container');
    if (!container) return;

    const term = filter.toLowerCase();
    const keys = Object.keys(macros).filter((k) =>
      k.toLowerCase().includes(term) || String(macros[k]).toLowerCase().includes(term)
    );

    container.innerHTML = '';

    if (keys.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Nenhuma macro encontrada.';
      container.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    keys.forEach((trigger) => {
      const item = document.createElement('div');
      item.className = 'macro-item';

      const triggerEl = document.createElement('div');
      triggerEl.className = 'macro-trigger';
      triggerEl.textContent = trigger;

      const previewEl = document.createElement('div');
      previewEl.className = 'macro-preview';
      previewEl.textContent = String(macros[trigger]);

      item.appendChild(triggerEl);
      item.appendChild(previewEl);
      item.addEventListener('click', () => openModal(trigger));

      fragment.appendChild(item);
    });
    container.appendChild(fragment);
  }

  // ---------------------------------------------------------------------
  // Modal (criar/editar/excluir)
  // ---------------------------------------------------------------------
  function setupModal() {
    document.getElementById('btn-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-save').addEventListener('click', saveMacroFromModal);
    document.getElementById('btn-delete').addEventListener('click', deleteMacroFromModal);

    document.getElementById('modal-edit').addEventListener('click', (e) => {
      if (e.target.id === 'modal-edit') closeModal();
    });
  }

  function openModal(trigger = null) {
    editingTrigger = trigger;
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

    document.getElementById('modal-edit').classList.add('active');
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
    if (!trigger.startsWith('/')) {
      alert('A trigger deve começar com "/" (ex: /email).');
      return;
    }

    macros[trigger] = text;
    persistMacros(() => {
      updateCounter();
      renderMacros();
      closeModal();
    });
  }

  function deleteMacroFromModal() {
    if (editingTrigger && confirm(`Deseja excluir a macro "${editingTrigger}"?`)) {
      delete macros[editingTrigger];
      persistMacros(() => {
        updateCounter();
        renderMacros();
        closeModal();
      });
    }
  }

  // ---------------------------------------------------------------------
  // Importar / Exportar
  // ---------------------------------------------------------------------
  function setupImportExport() {
    document.getElementById('btn-import').addEventListener('click', importMacros);
    document.getElementById('btn-download').addEventListener('click', downloadExport);
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

  // Importador inteligente: preserva parágrafos/textos multilinha
  function importMacros() {
    const importText = document.getElementById('import-area').value;
    if (!importText.trim()) return;

    const lines = importText.split('\n');
    let currentTrigger = null;
    let currentText = [];
    let addedCount = 0;

    const flush = () => {
      if (currentTrigger) {
        macros[currentTrigger] = currentText.join('\n');
        addedCount++;
      }
    };

    lines.forEach((line) => {
      if (line.includes('==>')) {
        flush();
        const sepIndex = line.indexOf('==>');
        currentTrigger = line.substring(0, sepIndex).trim();
        currentText = [line.substring(sepIndex + 3)];
      } else if (currentTrigger) {
        currentText.push(line);
      }
    });
    flush();

    persistMacros(() => {
      alert(`${addedCount} macros processadas e salvas!`);
      document.getElementById('import-area').value = '';
      updateCounter();
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
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------------
  function debounce(fn, wait) {
    let t = null;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
})();