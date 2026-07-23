let macros = {};
let activeDropdown = null;
let selectedIndex = 0; // Guarda qual item do menu está destacado

// Carrega as macros do Chrome Storage
function loadMacrosFromStorage() {
  chrome.storage.local.get(['macros', 'userMacros', 'customMacros'], (result) => {
    let data = result.macros || result.userMacros || result.customMacros || {};
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
  });
}

loadMacrosFromStorage();

// Atualiza as macros caso o usuário adicione novas no popup sem fechar a página
chrome.storage.onChanged.addListener(() => {
  loadMacrosFromStorage();
});

// Listener global de digitação
document.addEventListener('input', (e) => {
  const input = e.target;
  if (!isInputElement(input)) return;

  const text = getInputValue(input);
  const cursorPos = getCursorPosition(input);
  const textBeforeCursor = text.substring(0, cursorPos);
  
  // Captura palavras iniciadas por /
  const match = textBeforeCursor.match(/\/[\w\-]*$/);

  if (match) {
    const query = match[0];
    showDropdown(input, query, match.index);
  } else {
    removeDropdown();
  }
});

// Listener global para atalhos de teclado (Seta Cima, Seta Baixo, Enter, Tab)
document.addEventListener('keydown', (e) => {
  if (!activeDropdown) return;

  const items = activeDropdown.querySelectorAll('.macro-dropdown-item');
  if (items.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % items.length;
    updateSelection(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    updateSelection(items);
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    e.stopPropagation();
    if (items[selectedIndex]) {
      items[selectedIndex].click();
    }
  } else if (e.key === 'Escape') {
    removeDropdown();
  }
}, true);

function showDropdown(input, query, matchIndex) {
  removeDropdown();

  const matches = Object.keys(macros).filter(trigger => 
    trigger.toLowerCase().startsWith(query.toLowerCase())
  );

  if (matches.length === 0) return;

  // Cria a caixa do menu suspenso
  const dropdown = document.createElement('div');
  dropdown.className = 'macro-dropdown-menu';
  
  // Posicionamento próximo ao elemento ativo
  const rect = input.getBoundingClientRect();
  dropdown.style.position = 'absolute';
  dropdown.style.left = `${rect.left + window.scrollX}px`;
  dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
  dropdown.style.zIndex = '999999';
  dropdown.style.background = '#ffffff';
  dropdown.style.border = '1px solid #007bff';
  dropdown.style.borderRadius = '6px';
  dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  dropdown.style.maxHeight = '200px';
  dropdown.style.overflowY = 'auto';
  dropdown.style.minWidth = '220px';

  selectedIndex = 0; // O PRIMEIRO ITEM JÁ NASCE SELECIONADO!

  matches.forEach((trigger, index) => {
    const item = document.createElement('div');
    item.className = 'macro-dropdown-item';
    item.style.padding = '8px 12px';
    item.style.cursor = 'pointer';
    item.style.fontSize = '13px';
    item.style.borderBottom = '1px solid #f0f0f0';

    item.innerHTML = `
      <strong style="color: #007bff;">${escapeHtml(trigger)}</strong>
      <div style="color: #666; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">
        ${escapeHtml(String(macros[trigger]))}
      </div>
    `;

    item.addEventListener('click', () => {
      insertMacroText(input, trigger, macros[trigger], matchIndex, query.length);
      removeDropdown();
    });

    dropdown.appendChild(item);
  });

  document.body.appendChild(dropdown);
  activeDropdown = dropdown;

  const items = dropdown.querySelectorAll('.macro-dropdown-item');
  updateSelection(items);
}

function updateSelection(items) {
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.style.backgroundColor = '#007bff';
      item.style.color = '#ffffff';
      item.querySelectorAll('*').forEach(el => el.style.color = '#ffffff');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.style.backgroundColor = '#ffffff';
      item.style.color = '#333333';
      const triggerEl = item.querySelector('strong');
      const textEl = item.querySelector('div');
      if (triggerEl) triggerEl.style.color = '#007bff';
      if (textEl) textEl.style.color = '#666666';
    }
  });
}

function insertMacroText(input, trigger, text, matchIndex, queryLength) {
  const currentVal = getInputValue(input);
  const before = currentVal.substring(0, matchIndex);
  const after = currentVal.substring(matchIndex + queryLength);
  const newVal = before + text + after;

  if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
    input.value = newVal;
    const newCursorPos = matchIndex + text.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
  } else if (input.isContentEditable) {
    input.innerText = newVal;
  }

  // Dispara eventos para o Jira/React/Slack detectarem a mudança de texto
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function removeDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
}

function isInputElement(el) {
  return el && (
    el.tagName === 'INPUT' || 
    el.tagName === 'TEXTAREA' || 
    el.isContentEditable
  );
}

function getInputValue(el) {
  return el.isContentEditable ? el.innerText : el.value || '';
}

function getCursorPosition(el) {
  if (el.isContentEditable) {
    const sel = window.getSelection();
    return sel.focusOffset || 0;
  }
  return el.selectionStart || 0;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Fecha o dropdown se clicar fora
document.addEventListener('click', (e) => {
  if (activeDropdown && !activeDropdown.contains(e.target)) {
    removeDropdown();
  }
});