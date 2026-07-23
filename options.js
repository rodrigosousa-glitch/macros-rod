function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const s = result.settings || {};
    document.getElementById('trigger-char').value = s.triggerChar || '/';
    document.getElementById('search-trigger').value = s.searchTrigger || '//';
    document.getElementById('separator').value = s.separator || '==>';
    document.getElementById('max-suggestions').value = s.maxSuggestions || 10;
    document.getElementById('auto-space').checked = s.autoSpace !== false;
  });
}

function showStatus(msg, isError) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = isError ? 'error' : 'success';
  setTimeout(() => el.className = '', 3000);
}

document.getElementById('btn-save').addEventListener('click', () => {
  const settings = {
    triggerChar: document.getElementById('trigger-char').value || '/',
    searchTrigger: document.getElementById('search-trigger').value || '//',
    separator: document.getElementById('separator').value || '==>',
    maxSuggestions: parseInt(document.getElementById('max-suggestions').value) || 10,
    autoSpace: document.getElementById('auto-space').checked
  };
  chrome.storage.local.set({ settings }, () => {
    showStatus('Configurações salvas com sucesso!');
  });
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('ATENÇÃO: Isso apagará TODAS as macros permanentemente. Continuar?')) return;
  chrome.storage.local.set({ macros: [] }, () => {
    showStatus('Todas as macros foram apagadas.', true);
  });
});

loadSettings();
