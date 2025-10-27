import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// === Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyA-LeQHKV4NfJrTKQCGjG-VQGhfWxtPk70",
  authDomain: "vsemmebel-90d48.firebaseapp.com",
  projectId: "vsemmebel-90d48",
  storageBucket: "vsemmebel-90d48.firebasestorage.app",
  messagingSenderId: "958123504041",
  appId: "1:958123504041:web:1f14f4561d6bb6628494b8"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === DOM ===
const adminPanel = document.getElementById('adminPanel');
const addImageBtn = document.getElementById('addImageBtn');
const addFacadeBtn = document.getElementById('addFacadeBtn');
const addColorBtn = document.getElementById('addColorBtn');
const addPriceBtn = document.getElementById('addPriceBtn');
const offersList = document.getElementById('offers-list');
const form = document.getElementById('addOfferForm');
const statusMessage = document.getElementById('statusMessage');

// Показ панели
adminPanel.classList.remove('hidden');

// === Функции добавления полей ===
function addImageField(value = "") {
  const container = document.getElementById('images-container');
  const div = document.createElement('div');
  div.className = 'flex items-center gap-2 mb-2';
  div.innerHTML = `
    <input type="text" placeholder="URL картинки" class="w-full p-2 border rounded-lg" value="${value}">
    <button type="button" class="text-red-600 font-bold px-2">✕</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  container.appendChild(div);
}
addImageBtn.addEventListener('click', () => addImageField());

function addFacadeField(value = "") {
  const container = document.getElementById('facades-container');
  const div = document.createElement('div');
  div.className = 'flex items-center gap-2 mb-2';
  div.innerHTML = `
    <input type="text" placeholder="Название фасада" class="w-full p-2 border rounded-lg" value="${value}">
    <button type="button" class="text-red-600 font-bold px-2">✕</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  container.appendChild(div);
}
addFacadeBtn.addEventListener('click', () => addFacadeField());

function addColorField(name = "", color = "#ffffff") {
  const container = document.getElementById('colors-container');
  const div = document.createElement('div');
  div.className = 'flex items-center gap-2 mb-2';
  div.innerHTML = `
    <input type="text" placeholder="Название цвета" class="flex-1 p-2 border rounded-lg" value="${name}">
    <input type="color" class="w-10 h-10 border rounded" value="${color}">
    <button type="button" class="text-red-600 font-bold px-2">✕</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  container.appendChild(div);
}
addColorBtn.addEventListener('click', () => addColorField());

function addPriceField(facade = "", color = "", price = "") {
  const container = document.getElementById('prices-container');
  const div = document.createElement('div');
  div.className = 'flex items-center gap-2 mb-2';
  div.innerHTML = `
    <input type="text" placeholder="Фасад" class="p-2 border rounded-lg" value="${facade}">
    <input type="text" placeholder="Цвет" class="p-2 border rounded-lg" value="${color}">
    <input type="number" placeholder="Цена" class="w-28 p-2 border rounded-lg" value="${price}">
    <button type="button" class="text-red-600 font-bold px-2">✕</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  container.appendChild(div);
}
addPriceBtn.addEventListener('click', () => addPriceField());

// === Сохранение нового товара ===
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newOffer = {
    title: document.getElementById('title').value,
    category: document.getElementById('category').value,
    discount: Number(document.getElementById('discount').value || 0),
    description: document.getElementById('description').value,
    images: Array.from(document.querySelectorAll('#images-container input')).map(i => i.value),
    facades: Array.from(document.querySelectorAll('#facades-container input')).map(i => i.value),
    colors: Array.from(document.querySelectorAll('#colors-container div')).map(div => ({
      name: div.querySelector('input[type=text]').value,
      color: div.querySelector('input[type=color]').value
    })),
    prices: Array.from(document.querySelectorAll('#prices-container div')).map(div => ({
      facade: div.querySelectorAll('input')[0].value,
      color: div.querySelectorAll('input')[1].value,
      price: Number(div.querySelectorAll('input')[2].value)
    })),
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, 'offers'), newOffer);
    statusMessage.textContent = '✅ Добавлено!';
    statusMessage.className = 'text-green-600 text-center';
    loadOffers();
  } catch (err) {
    console.error(err);
    statusMessage.textContent = '❌ Ошибка';
  }
});

// === Загрузка существующих товаров ===
async function loadOffers() {
  offersList.innerHTML = '<p class="text-gray-500">Загрузка...</p>';
  const snapshot = await getDocs(collection(db, 'offers'));
  offersList.innerHTML = "";
  snapshot.forEach(docSnap => {
    const offer = docSnap.data();
    const div = document.createElement('div');
    div.className = 'p-4 border rounded-lg bg-gray-50 flex justify-between items-center';
    div.innerHTML = `
      <div>
        <h3 class="font-semibold text-lg">${offer.title}</h3>
        <p class="text-sm text-gray-500">${offer.category}</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-primary text-white px-3 py-1 rounded" data-id="${docSnap.id}" data-action="edit">Редактировать</button>
        <button class="btn-danger text-white px-3 py-1 rounded" data-id="${docSnap.id}" data-action="delete">Удалить</button>
      </div>
    `;
    offersList.appendChild(div);
  });

  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Точно удалить этот товар?")) {
        await deleteDoc(doc(db, 'offers', btn.dataset.id));
        loadOffers();
      }
    };
  });

  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const snap = snapshot.docs.find(d => d.id === id);
      if (!snap) return;
      const data = snap.data();
      alert(`Редактирование товара "${data.title}" можно реализовать — загрузим поля в форму`);
      // при желании можно загрузить данные в форму для редактирования
    };
  });
}

loadOffers();
