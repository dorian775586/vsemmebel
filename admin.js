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
    // Если не авторизован
    if (accessDenied) accessDenied.classList.remove('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
    return;
  }

  try {
    const token = await user.getIdTokenResult();
    const isAdmin = token.claims?.admin || user.email === 'admin@example.com';

    if (!isAdmin) {
      // Не админ
      if (accessDenied) accessDenied.classList.remove('hidden');
      if (adminPanel) adminPanel.classList.add('hidden');
      await signOut(auth);
      return;
    }

    // Показываем панель админа
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

  const newOffer = {
    title: document.getElementById('title').value.trim(),
    discount: Number(document.getElementById('discount').value),
    image: document.getElementById('image').value.trim(),
    category: document.getElementById('category').value,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, 'offers'), newOffer);
    statusMessage.textContent = '✅ Предложение успешно добавлено!';
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
