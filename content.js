(function() {
  'use strict';

  if (window.__macroMasterLoaded) return;
  window.__macroMasterLoaded = true;

  let macros = [];
  let settings = { triggerChar: '/', searchTrigger: '//', separator: '==>', maxSuggestions: 10, autoSpace: true };
  let dropdown = null;
  let activeTarget = null;
  let selectedIndex = 0;
  let suggestionList = [];
  let isSearchMode = false;

  // ============ CARREGAR DADOS ============
  function loadData() {
    try {
      chrome.storage.local.get(['macros', 'settings'], (result) => {
        if (chrome.runtime.lastError) return;
        if (result.macros) macros = result.macros;
        if (result.settings) settings = { ...settings, ...result.settings };
      });
    } catch (e) {}
  }
  loadData();

  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.macros) macros = changes.macros.newValue;
      if (changes.settings) settings = { ...settings, ...changes.settings.newValue };
    });
  } catch (e) {}

  // ============ ANIMAÇÃO DE FOGOS DE ARTIFÍCIO ============
  function triggerFireworks(x, y) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      pointer-events: none; z-index: 2147483647;
    `;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 28;
    const colors = ['#1a73e8', '#34a853', '#fbbc05', '#ea4335', '#a142f4', '#ff6d01'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5);
      const speed = Math.random() * 4 + 2;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3 + 2, alpha: 1, decay: Math.random() * 0.03 + 0.015
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let stillAlive = false;

      particles.forEach(p => {
        if (p.alpha > 0) {
          stillAlive = true;
          p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.alpha -= p.decay;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      if (stillAlive) requestAnimationFrame(animate);
      else canvas.remove();
    }
    animate();
  }

  // ============ DROPDOWN ============
  function createDropdown() {
    if (dropdown) return;
    dropdown = document.createElement('div');
    dropdown.id = 'macro-master-dropdown';
    dropdown.style.cssText = `
      position: fixed; z-index: 2147483647 !important;
      background: #ffffff; border: 1px solid #ccc; border-radius: 8px;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px; min-width: 280px; max-width: 400px; max-height: 300px;
      overflow-y: auto; display: none; padding: 4px 0;
    `;
    document.body.appendChild(dropdown);
  }

  function hideDropdown() {
    if (dropdown) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }
    activeTarget = null;
    suggestionList = [];
    selectedIndex = 0;
    isSearchMode = false;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function highlightItem() {
    const items = dropdown.querySelectorAll('.mm-item');
    items.forEach((item, i) => {
      item.style.background = (i === selectedIndex) ? '#e8f0fe' : 'transparent';
    });
  }

  function showDropdown(target, query, searchMode) {
    createDropdown();
    activeTarget = target;
    isSearchMode = searchMode;

    const q = query.toLowerCase().trim();
    
    if (!searchMode && q.length === 0) {
      suggestionList = macros.slice(0, settings.maxSuggestions);
    } else {
      let filtered = macros.filter(m => {
        const t = (m.trigger || '').toLowerCase();
        const txt = (m.text || '').toLowerCase();
        return t.includes(q) || txt.includes(q);
      });

      if (q) {
        filtered.sort((a, b) => {
          const aTrig = (a.trigger || '').toLowerCase();
          const bTrig = (b.trigger || '').toLowerCase();
          const cleanATrig = aTrig.replace(/^[\/]+/, '');
          const cleanBTrig = bTrig.replace(/^[\/]+/, '');

          const aTrigStarts = cleanATrig.startsWith(q) || aTrig.startsWith(q);
          const bTrigStarts = cleanBTrig.startsWith(q) || bTrig.startsWith(q);

          if (aTrigStarts && !bTrigStarts) return -1;
          if (!aTrigStarts && bTrigStarts) return 1;

          const aInTrig = aTrig.includes(q);
          const bInTrig = bTrig.includes(q);
          if (aInTrig && !bInTrig) return -1;
          if (!aInTrig && bInTrig) return 1;

          return aTrig.length - bTrig.length;
        });
      }

      suggestionList = filtered.slice(0, settings.maxSuggestions);
    }

    if (suggestionList.length === 0) {
      dropdown.innerHTML = `<div style="padding:10px 14px;color:#888;font-style:italic;">Nenhuma macro encontrada</div>`;
    } else {
      dropdown.innerHTML = suggestionList.map((m, i) => {
        const isCoringa = (m.text.match(/\{([^}]+)\}/g) || []).length > 0;
        const tagCoringa = isCoringa ? `<span style="font-size:10px;background:#e8f0fe;color:#1a73e8;padding:2px 6px;border-radius:4px;margin-left:6px;">Coringa</span>` : '';
        const shortText = m.text.length > 60 ? m.text.substring(0, 60) + '...' : m.text;
        
        return `<div class="mm-item" data-index="${i}" style="
          padding:8px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0;
          display:flex;flex-direction:column;gap:2px;">
          <div style="font-weight:600;color:#1a73e8;display:flex;align-items:center;">${escapeHtml(m.trigger)} ${tagCoringa}</div>
          <div style="font-size:12px;color:#555;white-space:pre-wrap;">${escapeHtml(shortText)}</div>
        </div>`;
      }).join('');
    }

    dropdown.style.display = 'block';
    dropdown.style.left = '-9999px';
    dropdown.style.top = '-9999px';

    const coords = getCaretCoordinates(target);
    const dropdownHeight = dropdown.offsetHeight || 200;

    dropdown.style.left = Math.min(coords.x, window.innerWidth - 320) + 'px';
    dropdown.style.top = Math.max(10, coords.yTop - dropdownHeight - 6) + 'px';

    selectedIndex = 0;
    highlightItem();

    dropdown.querySelectorAll('.mm-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectMacro(parseInt(item.dataset.index));
      });
    });
  }

  // ============ COORDENADAS DO CURSOR ============
  function getCaretCoordinates(element) {
    const rect = element.getBoundingClientRect();

    if (element.isContentEditable) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(true);
        const rects = range.getClientRects();
        if (rects.length > 0) {
          const r = rects[0];
          return { x: r.left, yTop: r.top, yBottom: r.bottom };
        }
      }
      return { x: rect.left, yTop: rect.top, yBottom: rect.bottom };
    }

    const val = element.value || '';
    const selStart = element.selectionStart || 0;
    const style = getComputedStyle(element);
    const div = document.createElement('div');
    div.style.cssText = `
      position:absolute;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;
      font:${style.font};padding:${style.padding};border:${style.border};
      width:${rect.width}px;box-sizing:border-box;line-height:${style.lineHeight};
    `;
    const textBefore = val.substring(0, selStart);
    div.textContent = textBefore;
    const span = document.createElement('span');
    span.textContent = '|';
    div.appendChild(span);
    document.body.appendChild(div);
    const spanRect = span.getBoundingClientRect();
    const divRect = div.getBoundingClientRect();
    document.body.removeChild(div);

    const calculatedTop = rect.top + (spanRect.top - divRect.top);
    return {
      x: rect.left + (spanRect.left - divRect.left),
      yTop: calculatedTop,
      yBottom: calculatedTop + parseFloat(style.lineHeight || '20')
    };
  }

  // ============ MODAL FLUTUANTE PARA VARIÁVEIS CORINGA ============
  function promptForVariables(templateText, variables, callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.4); z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #ffffff; border-radius: 12px; padding: 20px;
      width: 320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      display: flex; flex-direction: column; gap: 12px;
    `;

    box.innerHTML = `
      <div style="font-weight:600;font-size:16px;color:#1a73e8;margin-bottom:4px;">Preencher Informações</div>
      ${variables.map(v => `
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#666;font-weight:500;text-transform:capitalize;">${escapeHtml(v)}:</label>
          <input type="text" class="mm-var-input" data-var="${escapeHtml(v)}" style="
            padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px;outline:none;" />
        </div>
      `).join('')}
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
        <button id="mm-cancel-btn" style="padding:8px 12px;background:#f1f3f4;border:none;border-radius:6px;cursor:pointer;font-size:13px;color:#3c4043;">Cancelar</button>
        <button id="mm-confirm-btn" style="padding:8px 14px;background:#1a73e8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;">Inserir</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const inputs = box.querySelectorAll('.mm-var-input');
    if (inputs.length > 0) inputs[0].focus();

    inputs.forEach((input, idx) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (idx < inputs.length - 1) {
            inputs[idx + 1].focus();
          } else {
            submit();
          }
        }
      });
    });

    function submit() {
      let resultText = templateText;
      inputs.forEach(input => {
        const v = input.dataset.var;
        const val = input.value.trim() || `[${v}]`;
        resultText = resultText.replace(new RegExp(`\\{${v}\\}`, 'g'), val);
      });
      document.body.removeChild(overlay);
      callback(resultText);
    }

    box.querySelector('#mm-confirm-btn').addEventListener('click', submit);
    box.querySelector('#mm-cancel-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }

  // ============ SELEÇÃO DA MACRO ============
  function selectMacro(index) {
    if (!activeTarget || index < 0 || index >= suggestionList.length) return;
    const macro = suggestionList[index];

    const targetEl = activeTarget;
    const coords = getCaretCoordinates(targetEl);

    // Identifica coringas no formato {variavel}
    const matches = macro.text.match(/\{([^}]+)\}/g);
    
    if (matches && matches.length > 0) {
      const uniqueVars = [...new Set(matches.map(m => m.slice(1, -1)))];
      hideDropdown();
      promptForVariables(macro.text, uniqueVars, (finalText) => {
        triggerFireworks(coords.x, coords.yTop);
        replaceTrigger(targetEl, finalText);
      });
    } else {
      triggerFireworks(coords.x, coords.yTop);
      replaceTrigger(targetEl, macro.text);
      hideDropdown();
    }
  }

  function replaceTrigger(target, replacement) {
    const searchStr = isSearchMode ? settings.searchTrigger : settings.triggerChar;
    const space = settings.autoSpace ? ' ' : '';
    const textToInsert = replacement + space;

    if (target.isContentEditable) {
      const sel = window.getSelection();
      if (sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const textNode = range.startContainer;
      if (textNode.nodeType !== Node.TEXT_NODE) return;

      const text = textNode.textContent;
      const cursorPos = range.startOffset;
      let startPos = text.lastIndexOf(searchStr, cursorPos - 1);
      if (startPos === -1) return;

      const replaceRange = document.createRange();
      replaceRange.setStart(textNode, startPos);
      replaceRange.setEnd(textNode, cursorPos);
      sel.removeAllRanges();
      sel.addRange(replaceRange);

      if (!document.execCommand('insertText', false, textToInsert)) {
        const before = text.substring(0, startPos);
        const after = text.substring(cursorPos);
        textNode.textContent = before + textToInsert + after;
        const newRange = document.createRange();
        const newPos = startPos + textToInsert.length;
        newRange.setStart(textNode, newPos);
        newRange.setEnd(textNode, newPos);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const val = target.value || '';
      const selStart = target.selectionStart || 0;
      let startPos = val.lastIndexOf(searchStr, selStart - 1);
      if (startPos === -1) return;

      target.focus();
      target.setSelectionRange(startPos, selStart);

      if (!document.execCommand('insertText', false, textToInsert)) {
        const before = val.substring(0, startPos);
        const after = val.substring(selStart);
        const newVal = before + textToInsert + after;
        const newPos = startPos + textToInsert.length;

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, "value"
        )?.set || Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, "value"
        )?.set;

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(target, newVal);
        } else {
          target.value = newVal;
        }

        target.selectionStart = target.selectionEnd = newPos;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  // ============ DETECÇÃO DO TRIGGER ============
  function getCurrentWord(target) {
    const trigger = settings.triggerChar || '/';
    const searchTrig = settings.searchTrigger || '//';

    let text = '';
    let pos = 0;

    if (target.isContentEditable) {
      const sel = window.getSelection();
      if (sel.rangeCount === 0) return '';
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return '';
      text = node.textContent;
      pos = range.startOffset;
    } else {
      text = target.value || '';
      pos = target.selectionStart || 0;
    }

    const before = text.substring(0, pos);
    const re = new RegExp('(' + escapeRegExp(searchTrig) + '|' + escapeRegExp(trigger) + ')([^\\s]*)$');
    const match = before.match(re);
    return match ? match[0] : '';
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isValidTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  // ============ EVENTOS ============
  function onInput(e) {
    const target = e.target;
    if (!isValidTarget(target)) return;

    const word = getCurrentWord(target);
    if (!word) {
      hideDropdown();
      return;
    }

    const searchTrig = settings.searchTrigger || '//';
    const trigger = settings.triggerChar || '/';

    if (word.startsWith(searchTrig)) {
      const query = word.substring(searchTrig.length);
      showDropdown(target, query, true);
    } else if (word.startsWith(trigger)) {
      const query = word.substring(trigger.length);
      showDropdown(target, query, false);
    } else {
      hideDropdown();
    }
  }

  function onKeyDown(e) {
    if (!dropdown || dropdown.style.display === 'none') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % suggestionList.length;
      highlightItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + suggestionList.length) % suggestionList.length;
      highlightItem();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      selectMacro(selectedIndex);
    } else if (e.key === 'Escape') {
      hideDropdown();
    }
  }

  function attachToElement(el) {
    if (el.__macroMasterAttached) return;
    el.__macroMasterAttached = true;
    el.addEventListener('input', onInput);
    el.addEventListener('keydown', onKeyDown, true);
  }

  function scanAndAttach(root) {
    root = root || document;
    const inputs = root.querySelectorAll('input, textarea, [contenteditable="true"], [contenteditable=""]');
    inputs.forEach(attachToElement);

    const allElements = root.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.shadowRoot) scanAndAttach(el.shadowRoot);
    });
  }

  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) shouldScan = true;
      });
    });
    if (shouldScan) scanAndAttach();
  });

  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

  document.addEventListener('input', onInput, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target)) hideDropdown();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scanAndAttach());
  } else {
    scanAndAttach();
  }

})();