// admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Конфиг Firebase ---
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
const auth = getAuth(app);

// --- DOM элементы ---
const adminPanel = document.getElementById('adminPanel');
const accessDenied = document.getElementById('accessDenied');
const form = document.getElementById('addOfferForm');
const statusMessage = document.getElementById('statusMessage');
const logoutBtn = document.getElementById('logoutBtn');

// Контейнеры для динамических полей
const imagesContainer = document.getElementById('images-container');
const facadesContainer = document.getElementById('facades-container');
const colorsContainer = document.getElementById('colors-container');
const pricesContainer = document.getElementById('prices-container');

// --- Проверка авторизации ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (accessDenied) accessDenied.classList.remove('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
    return;
  }
  try {
    const token = await user.getIdTokenResult();
    const isAdmin = token.claims?.admin || user.email === 'admin@example.com';
    if (!isAdmin) {
      if (accessDenied) accessDenied.classList.remove('hidden');
      if (adminPanel) adminPanel.classList.add('hidden');
      await signOut(auth);
      return;
    }
    if (adminPanel) adminPanel.classList.remove('hidden');
    if (accessDenied) accessDenied.classList.add('hidden');
  } catch (err) {
    console.error(err);
    if (accessDenied) accessDenied.classList.remove('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
  }
});

// --- Функции добавления полей ---
function addImageField(value = "") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";
  div.innerHTML = `
    <input type="url" placeholder="URL изображения" class="w-full p-2 border rounded" value="${value}" required>
    <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  imagesContainer.appendChild(div);
}

function addFacadeField(value = "") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";
  div.innerHTML = `
    <input type="text" placeholder="Название фасада" class="w-full p-2 border rounded" value="${value}" required>
    <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  facadesContainer.appendChild(div);
}

function addColorField(name = "", image = "") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";
  div.innerHTML = `
    <input type="text" placeholder="Название цвета" class="p-2 border rounded" value="${name}" required>
    <input type="url" placeholder="URL изображения цвета" class="p-2 border rounded" value="${image}" required>
    <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  colorsContainer.appendChild(div);
}

function addPriceField(facade = "", color = "", price = "") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";
  div.innerHTML = `
    <input type="text" placeholder="Фасад" class="p-2 border rounded" value="${facade}" required>
    <input type="text" placeholder="Цвет" class="p-2 border rounded" value="${color}" required>
    <input type="number" placeholder="Цена" class="p-2 border rounded" value="${price}" required>
    <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  pricesContainer.appendChild(div);
}

// --- Событие отправки формы ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newOffer = {
    title: document.getElementById('title').value.trim(),
    category: document.getElementById('category').value,
    discount: Number(document.getElementById('discount').value),
    description: document.getElementById('description').value.trim(),
    images: Array.from(imagesContainer.querySelectorAll('input[type="url"]')).map(i => i.value.trim()),
    facades: Array.from(facadesContainer.querySelectorAll('input[type="text"]')).map(i => i.value.trim()),
    colors: Array.from(colorsContainer.querySelectorAll('div')).map(div => ({
      name: div.querySelector('input[type="text"]').value.trim(),
      image: div.querySelectorAll('input[type="url"]')[0].value.trim()
    })),
    prices: Array.from(pricesContainer.querySelectorAll('div')).map(div => ({
      facade: div.querySelectorAll('input')[0].value.trim(),
      color: div.querySelectorAll('input')[1].value.trim(),
      price: Number(div.querySelectorAll('input')[2].value)
    })),
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, 'offers'), newOffer);
    statusMessage.textContent = '✅ Предложение успешно добавлено!';
    statusMessage.className = 'status-success text-center py-2 rounded-lg font-medium';
    statusMessage.classList.remove('hidden');
    form.reset();
    imagesContainer.innerHTML = "";
    facadesContainer.innerHTML = "";
    colorsContainer.innerHTML = "";
    pricesContainer.innerHTML = "";
  } catch (err) {
    console.error(err);
    statusMessage.textContent = '❌ Ошибка: ' + err.message;
    statusMessage.className = 'status-error text-center py-2 rounded-lg font-medium';
    statusMessage.classList.remove('hidden');
  }
});

// --- Выход ---
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/';
});

// --- Инициализация одного поля для начала ---
addImageField();
addFacadeField();
addColorField();
addPriceField();
