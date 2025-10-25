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

// --- Проверка авторизации и прав администратора ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert('Пожалуйста, войдите как админ.');
    window.location.href = '/'; // редирект на главную
    return;
  }

  try {
    const token = await user.getIdTokenResult();
    const isAdmin = token.claims?.admin || user.email === 'admin@example.com'; // fallback на email
    if (!isAdmin) {
      alert('У вас нет прав администратора.');
      signOut(auth);
      window.location.href = '/';
    }
  } catch (err) {
    console.error('Ошибка проверки прав админа:', err);
  }
});

// --- Работа с формой ---
const form = document.getElementById('addOfferForm');
const statusMessage = document.getElementById('statusMessage');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newOffer = {
    title: document.getElementById('title').value,
    discount: Number(document.getElementById('discount').value),
    image: document.getElementById('image').value,
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
