// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM элементы ---
const offersListElement = document.getElementById('offers-list');
const categoryFilterElement = document.getElementById('category-filter');
const searchInput = document.getElementById('search-input');
const noOffersElement = document.getElementById('no-offers');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminModal = document.getElementById('admin-modal');
const adminCloseBtn = document.getElementById('admin-close');
const adminLoginFormBtn = document.getElementById('admin-login');
const adminRegisterBtn = document.getElementById('admin-register');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');

let allOffers = [];
let allCategories = ['Все'];
let currentFilter = 'Все';
let isAdmin = false;

// --- Функции отображения ---
function createOfferCard(offer) {
    const card = document.createElement('div');
    card.className = "offer-card";

    const oldPrice = parseFloat(offer.price || 1000);
    const discount = parseInt(offer.discount || 0);
    const newPrice = Math.round(oldPrice * (1 - discount / 100));

    card.innerHTML = `
        <div class="relative">
            <img src="${offer.image}" onerror="this.onerror=null;this.src='https://placehold.co/400x250/F97316/FFFFFF?text=${encodeURIComponent(offer.title)}';" alt="${offer.title}" class="w-full h-48 object-cover">
            <span class="absolute top-3 left-3 text-sm font-black px-3 py-1 bg-red-600 text-white rounded-lg shadow-md">-${discount}%</span>
        </div>
        <div class="p-5">
            <p class="text-xs font-semibold text-orange-600 uppercase mb-1">${offer.category}</p>
            <h4 class="text-xl font-extrabold text-gray-900 truncate mb-3">${offer.title}</h4>
            <div class="flex items-center justify-between mt-4">
                <div>
                    <p class="text-sm text-gray-400 line-through">${oldPrice.toLocaleString('ru-RU', { style:'currency', currency:'BYN', maximumFractionDigits:0 })}</p>
                    <span class="text-3xl font-black text-orange-600 tracking-tight">${newPrice.toLocaleString('ru-RU', { style:'currency', currency:'BYN', maximumFractionDigits:0 })}</span>
                </div>
                <button class="card-button text-white font-bold py-3 px-6 rounded-xl transition duration-300 text-sm hover:shadow-lg">Купить</button>
            </div>
        </div>
    `;
    return card;
}

function renderOffers(offers) {
    offersListElement.innerHTML = '';
    if (!offers.length) {
        noOffersElement.classList.remove('hidden');
    } else {
        noOffersElement.classList.add('hidden');
        offers.forEach(o => offersListElement.appendChild(createOfferCard(o)));
    }
}

function renderCategories() {
    categoryFilterElement.innerHTML = '';
    allCategories.forEach(category => {
        const button = document.createElement('button');
        button.textContent = category;
        button.className = 'category-button';
        if (category === currentFilter) button.classList.add('active');
        button.addEventListener('click', () => {
            document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('active'));
            currentFilter = category;
            button.classList.add('active');
            applyFilters();
        });
        categoryFilterElement.appendChild(button);
    });
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filteredByCategory = currentFilter === 'Все' ? allOffers : allOffers.filter(o => o.category === currentFilter);
    const finalFiltered = filteredByCategory.filter(o =>
        (o.title || '').toLowerCase().includes(searchTerm) ||
        (o.description || '').toLowerCase().includes(searchTerm) ||
        (o.category || '').toLowerCase().includes(searchTerm)
    );
    renderOffers(finalFiltered);
}

// --- Загрузка предложений ---
function loadOffers() {
    const offersRef = collection(db, 'offers');
    const q = query(offersRef, orderBy('createdAt', 'desc'));
    onSnapshot(q, snapshot => {
        allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories = ['Все', ...new Set(allOffers.map(o => o.category))];
        renderCategories();
        applyFilters();
    });
}

// --- Анонимный вход для обычного пользователя ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        signInAnonymously(auth).catch(err => console.error(err));
    } else {
        user.getIdTokenResult().then(token => {
            isAdmin = token.claims?.admin || user.email === 'admin@example.com';
            if (isAdmin) {
                adminLoginBtn.textContent = 'Админка';
                adminLoginBtn.onclick = () => window.location.href = '/admin.html';
            }
        });
    }
});

// --- Поиск ---
searchInput.addEventListener('input', applyFilters);

// --- Кнопка Админ / Модалка ---
adminLoginBtn.addEventListener('click', () => {
    if (!isAdmin) {
        adminModal.classList.remove('hidden');
    } else {
        window.location.href = '/admin.html';
    }
});

adminCloseBtn.addEventListener('click', () => adminModal.classList.add('hidden'));

// --- Вход Админа ---
adminLoginFormBtn.addEventListener('click', () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            adminModal.classList.add('hidden');
            isAdmin = true;
            adminLoginBtn.textContent = 'Админка';
            window.location.href = '/admin.html';
        })
        .catch(err => alert('Ошибка входа: ' + err.message));
});

// --- Регистрация Админа ---
adminRegisterBtn.addEventListener('click', () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    createUserWithEmailAndPassword(auth, email, password)
        .then(() => alert('Админ успешно зарегистрирован'))
        .catch(err => alert('Ошибка регистрации: ' + err.message));
});

// --- Загрузка каталога ---
loadOffers();
