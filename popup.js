const toggleFaces = document.getElementById('toggle-faces');
const toggleTitles = document.getElementById('toggle-titles');
const phraseChecks = document.querySelectorAll('.phrase-check');

// Загрузка сохраненных настроек
chrome.storage.sync.get({
  facesEnabled: true,
  titlesEnabled: true,
  selectedPhrases: [
    '(и это правда страшно...)'
  ]
}, (items) => {
  toggleFaces.checked = items.facesEnabled;
  toggleTitles.checked = items.titlesEnabled;

  phraseChecks.forEach(cb => {
    cb.checked = items.selectedPhrases.includes(cb.value);
  });
});

// Сохранение настроек при любом клике
function saveSettings() {
  const selected = [];
  phraseChecks.forEach(cb => {
    if (cb.checked) selected.push(cb.value);
  });

  chrome.storage.sync.set({
    facesEnabled: toggleFaces.checked,
    titlesEnabled: toggleTitles.checked,
    selectedPhrases: selected
  });
}

toggleFaces.addEventListener('change', saveSettings);
toggleTitles.addEventListener('change', saveSettings);
phraseChecks.forEach(cb => cb.addEventListener('change', saveSettings));