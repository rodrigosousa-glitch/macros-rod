chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['macros', 'settings'], (result) => {
    if (!result.macros) {
      chrome.storage.local.set({
        macros: [
          { trigger: '/teste', text: 'Funcionou! Esta é uma macro de teste.', id: Date.now() },
          { trigger: '/email', text: 'seuemail@exemplo.com', id: Date.now()+1 }
        ]
      });
    }
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          triggerChar: '/',
          searchTrigger: '//',
          separator: '==>',
          maxSuggestions: 10,
          autoSpace: true
        }
      });
    }
  });
});
