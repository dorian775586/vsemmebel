// -------------------- ЧАСТЬ 1: ИНИЦИАЛИЗАЦИЯ --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase config ---
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

// -------------------- ЧАСТЬ 1: DOM ЭЛЕМЕНТЫ --------------------
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

const addImageBtn = document.getElementById('add-image-btn');
const addFacadeBtn = document.getElementById('add-facade-btn');
const addColorBtn = document.getElementById('add-color-btn');
const addPriceBtn = document.getElementById('add-price-btn');

// --- переменные состояния ---
let editingId = null;

// -------------------- ЧАСТЬ 1: АВТОРИЗАЦИЯ --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    accessDenied.classList.remove('hidden');
    adminPanel.classList.add('hidden');
    return;
  }
  adminPanel.classList.remove('hidden');
  accessDenied.classList.add('hidden');
  await loadOffers();
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/';
});
// -------------------- ЧАСТЬ 2: ДИНАМИЧЕСКИЕ ПОЛЯ --------------------

// Создание строки с изображением
function createImageRow(value = "") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";
  const input = document.createElement('input');
  input.type = "url";
  input.placeholder = "URL изображения";
  input.className = "w-full p-2 border rounded";
  input.required = true;
  input.value = value;

  const del = document.createElement('button');
  del.type = "button";
  del.className = "bg-red-500 text-white px-3 rounded";
  del.textContent = "Удалить";
  del.onclick = () => div.remove();

  div.append(input, del);
  return div;
}

// Создание строки фасада
function createFacadeRow(value = "") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";
  const input = document.createElement('input');
  input.type = "text";
  input.placeholder = "Название фасада";
  input.className = "w-full p-2 border rounded";
  input.required = true;
  input.value = value;

  const del = document.createElement('button');
  del.type = "button";
  del.className = "bg-red-500 text-white px-3 rounded";
  del.textContent = "Удалить";
  del.onclick = () => div.remove();

  div.append(input, del);
  return div;
}

// Создание строки цвета
function createColorRow(name = "", hex = "#ffffff") {
  const div = document.createElement('div');
  div.className = "flex items-center gap-2 mb-2";
  const inputName = document.createElement('input');
  inputName.type = "text";
  inputName.placeholder = "Название цвета";
  inputName.className = "p-2 border rounded w-1/2";
  inputName.required = true;
  inputName.value = name;

  const inputColor = document.createElement('input');
  inputColor.type = "color";
  inputColor.className = "w-10 h-10 border rounded";
  inputColor.value = hex;

  const del = document.createElement('button');
  del.type = "button";
  del.className = "bg-red-500 text-white px-3 rounded";
  del.textContent = "Удалить";
  del.onclick = () => div.remove();

  div.append(inputName, inputColor, del);
  return div;
}

// Создание строки цены для комбинации фасад+цвет
function createPriceRow(facade = "", color = "", price = "") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";

  const inFacade = document.createElement('input');
  inFacade.type = "text";
  inFacade.placeholder = "Фасад";
  inFacade.className = "p-2 border rounded w-1/3";
  inFacade.required = true;
  inFacade.value = facade;

  const inColor = document.createElement('input');
  inColor.type = "text";
  inColor.placeholder = "Цвет";
  inColor.className = "p-2 border rounded w-1/3";
  inColor.required = true;
  inColor.value = color;

  const inPrice = document.createElement('input');
  inPrice.type = "number";
  inPrice.placeholder = "Цена";
  inPrice.className = "p-2 border rounded w-1/3";
  inPrice.required = true;
  inPrice.value = price;

  const del = document.createElement('button');
  del.type = "button";
  del.className = "bg-red-500 text-white px-3 rounded";
  del.textContent = "Удалить";
  del.onclick = () => div.remove();

  div.append(inFacade, inColor, inPrice, del);
  return div;
}

// -------------------- ЧАСТЬ 2: ОБРАБОТЧИКИ КНОПОК --------------------
addImageBtn.addEventListener('click', () => imagesContainer.appendChild(createImageRow()));
addFacadeBtn.addEventListener('click', () => facadesContainer.appendChild(createFacadeRow()));
addColorBtn.addEventListener('click', () => colorsContainer.appendChild(createColorRow()));
addPriceBtn.addEventListener('click', () => pricesContainer.appendChild(createPriceRow()));

// --- инициализация пустых стартовых строк ---
imagesContainer.appendChild(createImageRow());
facadesContainer.appendChild(createFacadeRow());
colorsContainer.appendChild(createColorRow());
pricesContainer.appendChild(createPriceRow());
// -------------------- ЧАСТЬ 3: ЗАГРУЗКА ТОВАРОВ --------------------
async function loadOffers() {
  offersList.innerHTML = "<p class='text-gray-500'>Загрузка...</p>";
  try {
    const qSnap = await getDocs(collection(db, 'offers'));
    offersList.innerHTML = "";

    qSnap.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement('div');
      div.className = "border p-4 rounded flex justify-between items-center";

      div.innerHTML = `
        <div>
          <p class="font-semibold">${data.title || '(без названия)'}</p>
          <p class="text-sm text-gray-500">${data.category || '-'}</p>
        </div>
        <div class="flex gap-2">
          <button class="edit-btn bg-blue-500 text-white px-3 py-1 rounded">Редактировать</button>
          <button class="del-btn bg-red-500 text-white px-3 py-1 rounded">Удалить</button>
        </div>
      `;

      const editBtn = div.querySelector('.edit-btn');
      const delBtn = div.querySelector('.del-btn');

      // Удаление
      delBtn.onclick = async () => {
        if (!confirm(`Удалить товар "${data.title}"?`)) return;
        try {
          await deleteDoc(doc(db, 'offers', docSnap.id));
          await loadOffers();
        } catch (err) {
          alert('Ошибка удаления: ' + err.message);
        }
      };

      // Редактирование
      editBtn.onclick = async () => {
        editingId = docSnap.id;
        const snap = await getDoc(doc(db, 'offers', editingId));
        if (!snap.exists()) return alert('Документ не найден');
        const offer = snap.data();

        document.getElementById('title').value = offer.title || "";
        document.getElementById('category').value = offer.category || "Все";
        document.getElementById('discount').value = offer.discount || 0;
        document.getElementById('description').value = offer.description || "";

        imagesContainer.innerHTML = "";
        (offer.images || []).forEach(url => imagesContainer.appendChild(createImageRow(url)));

        facadesContainer.innerHTML = "";
        (offer.facades || []).forEach(f => facadesContainer.appendChild(createFacadeRow(f)));

        colorsContainer.innerHTML = "";
        (offer.colors || []).forEach(c => colorsContainer.appendChild(createColorRow(c.name, c.hex || '#ffffff')));

        pricesContainer.innerHTML = "";
        (offer.prices || []).forEach(p => pricesContainer.appendChild(createPriceRow(p.facade, p.color, p.price)));

        // Скролл к форме
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      offersList.appendChild(div);
    });

    if (qSnap.empty) {
      offersList.innerHTML = "<p class='text-gray-500'>Нет товаров</p>";
    }
  } catch (err) {
    console.error(err);
    offersList.innerHTML = '<p class="text-red-500">Ошибка загрузки</p>';
  }
}
// -------------------- ЧАСТЬ 4: КОМНАТЫ, КАТЕГОРИИ, ПОДКАТЕГОРИИ --------------------

// Структура: комнаты → категории → подкатегории → типы
const roomsContainer = document.createElement('div'); // динамический контейнер для админки
roomsContainer.className = "space-y-4 mb-6";
document.getElementById('adminPanel').prepend(roomsContainer);

// Загрузка комнат из Firestore
async function loadRooms() {
  roomsContainer.innerHTML = "<p class='text-gray-500'>Загрузка комнат...</p>";
  try {
    const roomsSnap = await getDocs(collection(db, 'rooms'));
    roomsContainer.innerHTML = "";

    roomsSnap.forEach(roomDoc => {
      const room = roomDoc.data();
      const roomDiv = document.createElement('div');
      roomDiv.className = "border p-4 rounded bg-gray-50";

      const roomTitle = document.createElement('h3');
      roomTitle.className = "font-bold text-lg mb-2";
      roomTitle.textContent = room.name;

      const catContainer = document.createElement('div');
      catContainer.className = "ml-4 space-y-2";

      // категории
      (room.categories || []).forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = "border-l pl-2";

        const catTitle = document.createElement('p');
        catTitle.className = "font-semibold";
        catTitle.textContent = cat.name;

        const subContainer = document.createElement('div');
        subContainer.className = "ml-4 space-y-1";

        (cat.subcategories || []).forEach(sub => {
          const subDiv = document.createElement('p');
          subDiv.textContent = sub;
          subContainer.appendChild(subDiv);
        });

        catDiv.appendChild(catTitle);
        catDiv.appendChild(subContainer);
        catContainer.appendChild(catDiv);
      });

      roomDiv.appendChild(roomTitle);
      roomDiv.appendChild(catContainer);
      roomsContainer.appendChild(roomDiv);
    });

    if (roomsSnap.empty) {
      roomsContainer.innerHTML = "<p class='text-gray-500'>Нет комнат</p>";
    }
  } catch (err) {
    console.error(err);
    roomsContainer.innerHTML = "<p class='text-red-500'>Ошибка загрузки комнат</p>";
  }
}

// Добавление новой комнаты через форму (динамическая кнопка)
const addRoomBtn = document.createElement('button');
addRoomBtn.type = "button";
addRoomBtn.className = "btn-primary text-white py-1 px-3 rounded mb-4";
addRoomBtn.textContent = "Добавить комнату";
addRoomBtn.onclick = async () => {
  const name = prompt("Название новой комнаты:");
  if (!name) return;
  try {
    await addDoc(collection(db, 'rooms'), { name, categories: [] });
    await loadRooms();
  } catch (err) {
    alert("Ошибка добавления комнаты: " + err.message);
  }
};
roomsContainer.prepend(addRoomBtn);

// Инициализация комнат
loadRooms();
// -------------------- ЧАСТЬ 5: ХЛЕБНЫЕ КРОШКИ И ВЫБОР КОМНАТ --------------------

// Контейнеры для селекторов комнаты, категории и подкатегории
const roomSelect = document.createElement('select');
const categorySelect = document.createElement('select');
const subcategorySelect = document.createElement('select');

roomSelect.className = categorySelect.className = subcategorySelect.className = "w-full p-2 border rounded mb-2";
form.prepend(subcategorySelect);
form.prepend(categorySelect);
form.prepend(roomSelect);

// Функция загрузки комнат и категорий в селекторы
async function loadRoomOptions() {
  roomSelect.innerHTML = "<option value=''>Выберите комнату</option>";
  categorySelect.innerHTML = "<option value=''>Выберите категорию</option>";
  subcategorySelect.innerHTML = "<option value=''>Выберите подкатегорию</option>";

  try {
    const roomsSnap = await getDocs(collection(db, 'rooms'));
    roomsSnap.forEach(roomDoc => {
      const room = roomDoc.data();
      const opt = document.createElement('option');
      opt.value = roomDoc.id;
      opt.textContent = room.name;
      roomSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Ошибка загрузки комнат:", err);
  }
}

// При выборе комнаты загружаем категории
roomSelect.addEventListener('change', async () => {
  categorySelect.innerHTML = "<option value=''>Выберите категорию</option>";
  subcategorySelect.innerHTML = "<option value=''>Выберите подкатегорию</option>";
  const roomId = roomSelect.value;
  if (!roomId) return;

  const roomSnap = await getDoc(doc(db, 'rooms', roomId));
  if (!roomSnap.exists()) return;
  const room = roomSnap.data();
  (room.categories || []).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = cat.name;
    categorySelect.appendChild(opt);
  });
});

// При выборе категории загружаем подкатегории
categorySelect.addEventListener('change', async () => {
  subcategorySelect.innerHTML = "<option value=''>Выберите подкатегорию</option>";
  const roomId = roomSelect.value;
  const catName = categorySelect.value;
  if (!roomId || !catName) return;

  const roomSnap = await getDoc(doc(db, 'rooms', roomId));
  if (!roomSnap.exists()) return;
  const room = roomSnap.data();
  const cat = (room.categories || []).find(c => c.name === catName);
  (cat?.subcategories || []).forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    subcategorySelect.appendChild(opt);
  });
});

// Инициализация
loadRoomOptions();

// -------------------- ДИНАМИЧЕСКИЕ ХЛЕБНЫЕ КРОШКИ --------------------
function updateBreadcrumbs() {
  const crumbsContainer = document.getElementById('breadcrumb-container');
  if (!crumbsContainer) return;

  crumbsContainer.innerHTML = "";

  const roomText = roomSelect.selectedOptions[0]?.textContent;
  const catText = categorySelect.selectedOptions[0]?.textContent;
  const subText = subcategorySelect.selectedOptions[0]?.textContent;

  [roomText, catText, subText].forEach((text, i) => {
    if (!text) return;
    const span = document.createElement('span');
    span.textContent = text;
    span.className = "mx-1 text-gray-700";
    crumbsContainer.appendChild(span);
    if (i < 2 && [roomText, catText, subText][i+1]) {
      const sep = document.createElement('span');
      sep.textContent = "/";
      sep.className = "mx-1 text-gray-400";
      crumbsContainer.appendChild(sep);
    }
  });
}

roomSelect.addEventListener('change', updateBreadcrumbs);
categorySelect.addEventListener('change', updateBreadcrumbs);
subcategorySelect.addEventListener('change', updateBreadcrumbs);
// -------------------- ЧАСТЬ 6: СОХРАНЕНИЕ ТОВАРА --------------------

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Получаем данные с формы
  const docData = {
    title: document.getElementById('title').value.trim(),
    category: categorySelect.value,
    subcategory: subcategorySelect.value,
    roomId: roomSelect.value,
    discount: Number(document.getElementById('discount').value) || 0,
    description: document.getElementById('description').value.trim(),
    images: Array.from(imagesContainer.querySelectorAll('input[type="url"]')).map(i => i.value.trim()).filter(Boolean),
    facades: Array.from(facadesContainer.querySelectorAll('input[type="text"]')).map(i => i.value.trim()).filter(Boolean),
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
      await updateDoc(doc(db, 'offers', editingId), docData);
      statusMessage.textContent = '✅ Товар успешно обновлён!';
      editingId = null;
    } else {
      docData.createdAt = serverTimestamp();
      await addDoc(collection(db, 'offers'), docData);
      statusMessage.textContent = '✅ Новый товар добавлен!';
    }

    statusMessage.className = "status-success text-center py-2 rounded-lg font-medium";
    statusMessage.classList.remove('hidden');

    // Сброс формы
    form.reset();
    imagesContainer.innerHTML = "";
    facadesContainer.innerHTML = "";
    colorsContainer.innerHTML = "";
    pricesContainer.innerHTML = "";

    // Добавление пустых строк
    imagesContainer.appendChild(createImageRow());
    facadesContainer.appendChild(createFacadeRow());
    colorsContainer.appendChild(createColorRow());
    pricesContainer.appendChild(createPriceRow());

    // Сброс селекторов комнаты/категории/подкатегории
    roomSelect.value = "";
    categorySelect.innerHTML = "<option value=''>Выберите категорию</option>";
    subcategorySelect.innerHTML = "<option value=''>Выберите подкатегорию</option>";

    await loadOffers();
  } catch (err) {
    console.error(err);
    statusMessage.textContent = '❌ Ошибка: ' + err.message;
    statusMessage.className = "status-error text-center py-2 rounded-lg font-medium";
    statusMessage.classList.remove('hidden');
  }
});

// -------------------- ЧАСТЬ 6: ВЫХОД --------------------
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/';
});
