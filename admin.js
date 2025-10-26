document.addEventListener('DOMContentLoaded', () => {
  const adminPanel = document.getElementById('adminPanel');
  const addImageBtn = document.getElementById('addImageBtn');
  const addFacadeBtn = document.getElementById('addFacadeBtn');
  const addColorBtn = document.getElementById('addColorBtn');
  const addPriceBtn = document.getElementById('addPriceBtn');

  // показать панель (пока без авторизации)
  adminPanel.classList.remove('hidden');

  // === Добавление картинок ===
  addImageBtn.addEventListener('click', () => {
    const container = document.getElementById('images-container');
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 mb-2';
    div.innerHTML = `
      <input type="text" placeholder="URL картинки" class="w-full p-2 border rounded-lg">
      <button type="button" class="text-red-600 font-bold px-2">✕</button>
    `;
    div.querySelector('button').addEventListener('click', () => div.remove());
    container.appendChild(div);
  });

  // === Добавление фасадов ===
  addFacadeBtn.addEventListener('click', () => {
    const container = document.getElementById('facades-container');
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 mb-2';
    div.innerHTML = `
      <input type="text" placeholder="Название фасада" class="w-full p-2 border rounded-lg">
      <button type="button" class="text-red-600 font-bold px-2">✕</button>
    `;
    div.querySelector('button').addEventListener('click', () => div.remove());
    container.appendChild(div);
  });

  // === Добавление цветов ===
  addColorBtn.addEventListener('click', () => {
    const container = document.getElementById('colors-container');
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 mb-2';
    div.innerHTML = `
      <input type="text" placeholder="Название цвета" class="flex-1 p-2 border rounded-lg">
      <input type="color" value="#ffffff" class="w-10 h-10 border rounded">
      <button type="button" class="text-red-600 font-bold px-2">✕</button>
    `;
    div.querySelector('button').addEventListener('click', () => div.remove());
    container.appendChild(div);
  });

  // === Добавление цены ===
  addPriceBtn.addEventListener('click', () => {
    const container = document.getElementById('prices-container');

    // Сбор фасадов и цветов для выпадающих списков
    const facades = Array.from(document.querySelectorAll('#facades-container input')).map(i => i.value || 'Без названия');
    const colors = Array.from(document.querySelectorAll('#colors-container input[type=text]')).map(i => i.value || 'Без цвета');

    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 mb-2';
    div.innerHTML = `
      <select class="p-2 border rounded-lg">
        ${facades.map(f => `<option value="${f}">${f}</option>`).join('')}
      </select>
      <select class="p-2 border rounded-lg">
        ${colors.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <input type="number" placeholder="Цена" class="w-28 p-2 border rounded-lg">
      <button type="button" class="text-red-600 font-bold px-2">✕</button>
    `;
    div.querySelector('button').addEventListener('click', () => div.remove());
    container.appendChild(div);
  });
});
