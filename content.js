/**
 * Rodrigo Facilidades — Content Script
 * Suporte total a Placeholders Coringa {variavel}, Animação de Fogos e Digitação Humana no Blip Desk.
 */
(() => {
  'use strict';

  if (window.__rodrigoFacilidadesInjected) return;
  window.__rodrigoFacilidadesInjected = true;

  // ---------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------
  let macros = {};
  let activeDropdown = null;
  let selectedIndex = 0;
  let lastQueryInfo = null;

  // ---------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------
  function loadMacrosFromStorage() {
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
    });
  }

  loadMacrosFromStorage();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') loadMacrosFromStorage();
  });

  // ---------------------------------------------------------------------
  // Efeito Visual: Fogos de Artifício (Fireworks)
  // ---------------------------------------------------------------------
  function launchFireworks() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2147483647';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#ff4d4d', '#4f8cff', '#4dff88', '#ffea4d', '#ff4dff', '#00ffff'];

    // Origem dos fogos (parte inferior centralizada)
    const startX = canvas.width / 2;
    const startY = canvas.height * 0.6;

    for (let i = 0; i < 65; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.random() * 3 + 2
      });
    }

    let animationFrame;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravidade
        p.alpha -= 0.02;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.restore();
        }
      });

      if (alive) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(animationFrame);
        canvas.remove();
      }
    }

    animate();
  }

  // ---------------------------------------------------------------------
  // Helpers de Elemento
  // ---------------------------------------------------------------------
  function isInputElement(el) {
    return !!el && (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable === true
    );
  }

  function getInputValue(el) {
    return el.isContentEditable ? el.innerText : (el.value || '');
  }

  function getCursorPosition(el) {
    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return 0;
      const range = sel.getRangeAt(0);
      const preRange = range.cloneRange();
      preRange.selectNodeContents(el);
      preRange.setEnd(range.endContainer, range.endOffset);
      return preRange.toString().length;
    }
    return el.selectionStart || 0;
  }

  function debounce(fn, wait) {
    let t = null;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ---------------------------------------------------------------------
  // Simulação de Digitação para Blip Desk / React / Slate
  // ---------------------------------------------------------------------
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;

  function setNativeValue(el, value) {
    const setter = el.tagName === 'TEXTAREA' ? nativeTextareaValueSetter : nativeInputValueSetter;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
  }

  function fireKeyboardEvent(el, type, key) {
    el.dispatchEvent(new KeyboardEvent(type, {
      key,
      bubbles: true,
      cancelable: true,
      composed: true,
    }));
  }

  function fireInputEvent(el, inputType, data) {
    let evt;
    try {
      evt = new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        composed: true,
        inputType,
        data: data ?? null,
      });
    } catch (_e) {
      evt = new Event('input', { bubbles: true, cancelable: false, composed: true });
    }
    el.dispatchEvent(evt);
  }

  function fireBeforeInputEvent(el, inputType, data) {
    try {
      const evt = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType,
        data: data ?? null,
      });
      return el.dispatchEvent(evt);
    } catch (_e) {
      return true;
    }
  }

  function simulateBackspaces(el, count) {
    for (let i = 0; i < count; i++) {
      fireKeyboardEvent(el, 'keydown', 'Backspace');

      if (el.isContentEditable) {
        const handled = !fireBeforeInputEvent(el, 'deleteContentBackward', null);
        if (!handled) {
          document.execCommand('delete', false, null);
        }
        fireInputEvent(el, 'deleteContentBackward', null);
      } else {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newStart = Math.max(0, (start === end ? start - 1 : start));
        const current = el.value;
        setNativeValue(el, current.slice(0, newStart) + current.slice(end === start ? end : end));
        el.setSelectionRange(newStart, newStart);
        fireInputEvent(el, 'deleteContentBackward', null);
      }

      fireKeyboardEvent(el, 'keyup', 'Backspace');
    }
  }

  function typeTextHumanLike(el, text) {
    for (const char of text) {
      fireKeyboardEvent(el, 'keydown', char);
      fireKeyboardEvent(el, 'keypress', char);

      if (el.isContentEditable) {
        const handled = !fireBeforeInputEvent(el, 'insertText', char);
        if (!handled) {
          document.execCommand('insertText', false, char);
        }
        fireInputEvent(el, 'insertText', char);
      } else {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const current = el.value;
        setNativeValue(el, current.slice(0, start) + char + current.slice(end));
        el.setSelectionRange(start + 1, start + 1);
        fireInputEvent(el, 'insertText', char);
      }

      fireKeyboardEvent(el, 'keyup', char);
    }
  }

  // ---------------------------------------------------------------------
  // Processador do Coringa + Inserção Final
  // ---------------------------------------------------------------------
  function insertMacroText(input, trigger, rawText, queryLength) {
    if (!input || rawText == null) return;

    let processedText = rawText;

    // Procura por termos dentro de chaves {dia}, {Valor do crédito}, etc.
    const placeholders = processedText.match(/\{([^}]+)\}/g);

    if (placeholders) {
      const uniquePlaceholders = [...new Set(placeholders)];

      for (const placeholder of uniquePlaceholders) {
        const fieldName = placeholder.replace(/[{}]/g, '').trim();
        const userInput = prompt(`Informe o valor para [ ${fieldName} ]:`);

        // Se o usuário clicar em "Cancelar", aborta a inserção sem apagar nada
        if (userInput === null) {
          return;
        }

        // Substitui todas as ocorrências do placeholder
        processedText = processedText.split(placeholder).join(userInput);
      }
    }

    input.focus();

    if (input.isContentEditable) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        sel.collapseToEnd();
      }
    } else {
      const pos = input.selectionEnd ?? getInputValue(input).length;
      input.setSelectionRange(pos, pos);
    }

    // Apaga o trigger (ex: /explica)
    simulateBackspaces(input, queryLength);

    // Digita o texto processado com os coringas substituídos
    typeTextHumanLike(input, processedText);

    // Dispara a animação dos fogos
    launchFireworks();

    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    input.focus();
  }

  // ---------------------------------------------------------------------
  // Dropdown de Sugestões
  // ---------------------------------------------------------------------
  function buildDropdown(input, query) {
    const matches = Object.keys(macros).filter((trigger) =>
      trigger.toLowerCase().startsWith(query.toLowerCase())
    );
    if (matches.length === 0) return null;

    const dropdown = document.createElement('div');
    dropdown.className = 'rf-dropdown';
    dropdown.setAttribute('role', 'listbox');

    matches.forEach((trigger) => {
      const item = document.createElement('div');
      item.className = 'rf-item';
      item.setAttribute('role', 'option');
      item.setAttribute('data-trigger', trigger);

      const triggerEl = document.createElement('span');
      triggerEl.className = 'rf-item-trigger';
      triggerEl.textContent = trigger;

      const previewEl = document.createElement('span');
      previewEl.className = 'rf-item-preview';
      previewEl.textContent = String(macros[trigger]).replace(/\n+/g, ' ');

      item.appendChild(triggerEl);
      item.appendChild(previewEl);

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      item.addEventListener('mouseenter', () => {
        const items = dropdown.querySelectorAll('.rf-item');
        selectedIndex = Array.prototype.indexOf.call(items, item);
        updateSelection(items);
      });

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        commitSelection(trigger);
      });

      dropdown.appendChild(item);
    });

    return dropdown;
  }

  function positionDropdown(dropdown, input) {
    const rect = input.getBoundingClientRect();
    const estimatedHeight = Math.min(dropdown.scrollHeight || 260, 320);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    dropdown.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 340))}px`;

    if (spaceBelow < estimatedHeight + 16 && spaceAbove > spaceBelow) {
      dropdown.classList.add('rf-open-up');
      dropdown.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      dropdown.style.top = 'auto';
    } else {
      dropdown.classList.remove('rf-open-up');
      dropdown.style.top = `${rect.bottom + 8}px`;
      dropdown.style.bottom = 'auto';
    }
  }

  function showDropdown(input, query, matchIndex) {
    const dropdown = buildDropdown(input, query);

    if (!dropdown) {
      removeDropdown();
      return;
    }

    removeDropdown();

    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '2147483647';
    document.body.appendChild(dropdown);

    positionDropdown(dropdown, input);

    requestAnimationFrame(() => dropdown.classList.add('rf-visible'));

    activeDropdown = dropdown;
    lastQueryInfo = { input, matchIndex, queryLength: query.length };
    selectedIndex = 0;

    updateSelection(dropdown.querySelectorAll('.rf-item'));
  }

  function updateSelection(items) {
    items.forEach((item, index) => {
      item.classList.toggle('rf-selected', index === selectedIndex);
      if (index === selectedIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function commitSelection(trigger) {
    if (!lastQueryInfo) return;
    const { input, queryLength } = lastQueryInfo;
    const text = macros[trigger];
    removeDropdown();
    insertMacroText(input, trigger, text, queryLength);
  }

  function removeDropdown() {
    if (!activeDropdown) return;
    const el = activeDropdown;
    activeDropdown = null;
    lastQueryInfo = null;
    el.classList.remove('rf-visible');
    setTimeout(() => el.remove(), 160);
  }

  // ---------------------------------------------------------------------
  // Event Listeners
  // ---------------------------------------------------------------------
  const handleInput = debounce((e) => {
    const input = e.target;
    if (!isInputElement(input)) return;

    const text = getInputValue(input);
    const cursorPos = getCursorPosition(input);
    const textBeforeCursor = text.substring(0, cursorPos);
    const match = textBeforeCursor.match(/\/[\wÀ-ú\-]*$/);

    if (match) {
      showDropdown(input, match[0], match.index);
    } else {
      removeDropdown();
    }
  }, 30);

  document.addEventListener('input', handleInput, true);

  document.addEventListener('keydown', (e) => {
    if (!activeDropdown) return;

    const items = activeDropdown.querySelectorAll('.rf-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelection(items);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const chosen = items[selectedIndex];
      if (chosen) {
        commitSelection(chosen.getAttribute('data-trigger'));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      removeDropdown();
    }
  }, true);

  document.addEventListener('click', (e) => {
    if (activeDropdown && !activeDropdown.contains(e.target)) {
      removeDropdown();
    }
  }, true);

  window.addEventListener('scroll', () => removeDropdown(), true);
  window.addEventListener('resize', debounce(() => removeDropdown(), 100));
})();