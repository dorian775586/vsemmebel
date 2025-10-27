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
  serverTimestamp
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

// DOM
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

let editingId = null;

// Auth check
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

// --- helpers to create fields ---
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

// attach UI handlers
addImageBtn.addEventListener('click', () => imagesContainer.appendChild(createImageRow()));
addFacadeBtn.addEventListener('click', () => facadesContainer.appendChild(createFacadeRow()));
addColorBtn.addEventListener('click', () => colorsContainer.appendChild(createColorRow()));
addPriceBtn.addEventListener('click', () => pricesContainer.appendChild(createPriceRow()));

// --- load existing offers ---
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

      delBtn.onclick = async () => {
        if (!confirm(`Удалить товар "${data.title}"?`)) return;
        try {
          await deleteDoc(doc(db, 'offers', docSnap.id));
          await loadOffers();
        } catch (err) {
          alert('Ошибка удаления: ' + err.message);
        }
      };

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

        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      offersList.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    offersList.innerHTML = '<p class="text-red-500">Ошибка загрузки</p>';
  }
}

// --- form submit (create/update) ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const docData = {
    title: document.getElementById('title').value.trim(),
    category: document.getElementById('category').value,
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

    form.reset();
    imagesContainer.innerHTML = "";
    facadesContainer.innerHTML = "";
    colorsContainer.innerHTML = "";
    pricesContainer.innerHTML = "";

    // добавим пустые стартовые строки
    imagesContainer.appendChild(createImageRow());
    facadesContainer.appendChild(createFacadeRow());
    colorsContainer.appendChild(createColorRow());
    pricesContainer.appendChild(createPriceRow());

    await loadOffers();
  } catch (err) {
    console.error(err);
    statusMessage.textContent = '❌ Ошибка: ' + err.message;
    statusMessage.className = "status-error text-center py-2 rounded-lg font-medium";
    statusMessage.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/';
});

// init: add one empty row of each
imagesContainer.appendChild(createImageRow());
facadesContainer.appendChild(createFacadeRow());
colorsContainer.appendChild(createColorRow());
pricesContainer.appendChild(createPriceRow());
