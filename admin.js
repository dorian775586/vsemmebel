import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const offersList = document.getElementById('offers-list');

const imagesContainer = document.getElementById('images-container');
const facadesContainer = document.getElementById('facades-container');
const colorsContainer = document.getElementById('colors-container');
const pricesContainer = document.getElementById('prices-container');

let editingId = null; // ID редактируемого товара

// --- Проверка авторизации ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    accessDenied.classList.remove('hidden');
    adminPanel.classList.add('hidden');
    return;
  }
  adminPanel.classList.remove('hidden');
  accessDenied.classList.add('hidden');
  loadOffers();
});

// --- Динамические поля ---
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

function addColorField(name = "", hex = "#ffffff") {
  const div = document.createElement('div');
  div.className = "flex items-center gap-2 mb-2";
  div.innerHTML = `
    <input type="text" placeholder="Название цвета" class="p-2 border rounded w-1/2" value="${name}" required>
    <input type="color" class="w-10 h-10 border rounded" value="${hex}">
    <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  colorsContainer.appendChild(div);
}

function addPriceField(facade = "", color = "", price = "") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";
  div.innerHTML = `
    <input type="text" placeholder="Фасад" class="p-2 border rounded w-1/3" value="${facade}" required>
    <input type="text" placeholder="Цвет" class="p-2 border rounded w-1/3" value="${color}" required>
    <input type="number" placeholder="Цена" class="p-2 border rounded w-1/3" value="${price}" required>
    <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>
  `;
  div.querySelector('button').onclick = () => div.remove();
  pricesContainer.appendChild(div);
}

// --- Загрузка существующих товаров ---
async function loadOffers() {
  offersList.innerHTML = "<p class='text-gray-500'>Загрузка...</p>";
  const querySnapshot = await getDocs(collection(db, 'offers'));
  offersList.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement('div');
    div.className = "border p-4 rounded flex justify-between items-center";
    div.innerHTML = `
      <div>
        <p class="font-semibold">${data.title}</p>
        <p class="text-sm text-gray-500">${data.category}</p>
      </div>
      <div class="flex gap-2">
        <button class="bg-blue-500 text-white px-3 py-1 rounded">Редактировать</button>
        <button class="bg-red-500 text-white px-3 py-1 rounded">Удалить</button>
      </div>
    `;

    // Удаление
    div.querySelector('.bg-red-500').onclick = async () => {
      if (confirm(`Удалить товар "${data.title}"?`)) {
        await deleteDoc(doc(db, 'offers', docSnap.id));
        loadOffers();
      }
    };

    // Редактирование
    div.querySelector('.bg-blue-500').onclick = async () => {
      editingId = docSnap.id;
      alert(`Редактирование товара "${data.title}"`);

      const snap = await getDoc(doc(db, 'offers', editingId));
      if (!snap.exists()) return;

      const offer = snap.data();

      // Подставляем данные в форму
      document.getElementById('title').value = offer.title || "";
      document.getElementById('category').value = offer.category || "Все";
      document.getElementById('discount').value = offer.discount || 0;
      document.getElementById('description').value = offer.description || "";

      imagesContainer.innerHTML = "";
      (offer.images || []).forEach(url => addImageField(url));

      facadesContainer.innerHTML = "";
      (offer.facades || []).forEach(f => addFacadeField(f));

      colorsContainer.innerHTML = "";
      (offer.colors || []).forEach(c => addColorField(c.name, c.hex || "#ffffff"));

      pricesContainer.innerHTML = "";
      (offer.prices || []).forEach(p => addPriceField(p.facade, p.color, p.price));

      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    offersList.appendChild(div);
  });
}

// --- Сохранение товара ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const offer = {
    title: document.getElementById('title').value.trim(),
    category: document.getElementById('category').value,
    discount: Number(document.getElementById('discount').value),
    description: document.getElementById('description').value.trim(),
    images: Array.from(imagesContainer.querySelectorAll('input[type="url"]')).map(i => i.value.trim()),
    facades: Array.from(facadesContainer.querySelectorAll('input[type="text"]')).map(i => i.value.trim()),
    colors: Array.from(colorsContainer.children).map(div => ({
      name: div.querySelector('input[type="text"]').value.trim(),
      hex: div.querySelector('input[type="color"]').value
    })),
    prices: Array.from(pricesContainer.children).map(div => ({
      facade: div.querySelectorAll('input')[0].value.trim(),
      color: div.querySelectorAll('input')[1].value.trim(),
      price: Number(div.querySelectorAll('input')[2].value)
    })),
    updatedAt: serverTimestamp()
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, 'offers', editingId), offer);
      statusMessage.textContent = "✅ Товар успешно обновлён!";
      editingId = null;
    } else {
      offer.createdAt = serverTimestamp();
      await addDoc(collection(db, 'offers'), offer);
      statusMessage.textContent = "✅ Новый товар добавлен!";
    }

    statusMessage.className = "status-success text-center py-2 rounded-lg font-medium";
    statusMessage.classList.remove('hidden');

    form.reset();
    imagesContainer.innerHTML = "";
    facadesContainer.innerHTML = "";
    colorsContainer.innerHTML = "";
    pricesContainer.innerHTML = "";

    loadOffers();
  } catch (err) {
    console.error(err);
    statusMessage.textContent = "❌ Ошибка: " + err.message;
    statusMessage.className = "status-error text-center py-2 rounded-lg font-medium";
    statusMessage.classList.remove('hidden');
  }
});

// --- Выход из аккаунта ---
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = "/";
});

// --- Инициализация ---
addImageField();
addFacadeField();
addColorField();
addPriceField();

// --- Делаем функции доступными для кнопок HTML ---
window.addImageField = addImageField;
window.addFacadeField = addFacadeField;
window.addColorField = addColorField;
window.addPriceField = addPriceField;
