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

// --- Проверка авторизации и прав администратора ---
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
    console.error('Ошибка проверки прав админа:', err);
    if (accessDenied) accessDenied.classList.remove('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
  }
});

// --- Работа с формой добавления предложения ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Получаем значения с формы
  const title = document.getElementById('title').value.trim();
  const discount = Number(document.getElementById('discount').value);
  const mainImage = document.getElementById('image').value.trim();
  const category = document.getElementById('category').value;

  // Дополнительные поля
  // Картинки: вводятся через запятую
  const imagesInput = document.getElementById('images').value.trim();
  const images = imagesInput ? imagesInput.split(',').map(i => i.trim()) : [mainImage];

  // Фасады: вводятся через запятую
  const facadesInput = document.getElementById('facades').value.trim();
  const facades = facadesInput ? facadesInput.split(',').map(f => f.trim()) : [];

  // Цвета: вводятся через запятую в формате "Название|URL картинки"
  const colorsInput = document.getElementById('colors').value.trim();
  const colors = colorsInput ? colorsInput.split(',').map(c => {
    const [name, img] = c.split('|').map(s => s.trim());
    return { name, image: img || mainImage };
  }) : [];

  const newOffer = {
    title,
    discount,
    image: mainImage,
    category,
    images,
    facades,
    colors,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, 'offers'), newOffer);
    statusMessage.textContent = '✅ Товар успешно добавлен!';
    statusMessage.className = 'status-success text-center py-2 rounded-lg font-medium';
    statusMessage.classList.remove('hidden');
    form.reset();
  } catch (err) {
    console.error(err);
    statusMessage.textContent = '❌ Ошибка: ' + err.message;
    statusMessage.className = 'status-error text-center py-2 rounded-lg font-medium';
    statusMessage.classList.remove('hidden');
  }
});

// --- Выход из админки ---
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/';
});
