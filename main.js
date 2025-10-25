import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Конфигурация Firebase ---
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

document.addEventListener('DOMContentLoaded', () => {
    const offersListElement = document.getElementById('offers-list');
    const categoryFilterElement = document.getElementById('category-filter');
    const searchInput = document.getElementById('search-input');
    const noOffersElement = document.getElementById('no-offers');

    let allOffers = [];
    let currentFilter = 'Все';
    let allCategories = ['Все'];

    // --- Функция создания карточки ---
    function createOfferCard(offer) {
        const card = document.createElement('div');
        card.className = "offer-card";

        const oldPrice = parseFloat(offer.price);
        const discount = parseInt(offer.discount || 0);
        const newPrice = Math.round(oldPrice * (1 - discount / 100));

        card.innerHTML = `
            <div class="relative">
                <img src="${offer.image}" onerror="this.onerror=null;this.src='https://placehold.co/400x250/F97316/FFFFFF?text=${encodeURIComponent(offer.title)}';" alt="${offer.title}" class="w-full h-48 object-cover">
                <span class="absolute top-3 left-3 text-sm font-black px-3 py-1 bg-red-600 text-white rounded-lg shadow-md">-${discount}%</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 absolute top-3 right-3 text-white hover:text-red-400 transition cursor-pointer" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
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

    // --- Рендер списка ---
    function renderOffers(offers) {
        offersListElement.innerHTML = '';
        if (offers.length === 0) {
            noOffersElement.classList.remove('hidden');
        } else {
            noOffersElement.classList.add('hidden');
            offers.forEach(o => offersListElement.appendChild(createOfferCard(o)));
        }
    }

    // --- Рендер категорий ---
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

    // --- Фильтрация ---
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

    // --- Админ логин ---
    const adminEmail = "admin@example.com"; // <-- замени на свой
    const adminPassword = "12345678";       // <-- замени на свой
    signInWithEmailAndPassword(auth, adminEmail, adminPassword)
        .then(() => {
            console.log("Admin signed in");
            loadOffers();
        })
        .catch(err => {
            console.warn("Admin login failed, falling back to anonymous", err);
            // Анонимная авторизация для обычного пользователя
            signInAnonymously(auth)
                .then(() => loadOffers())
                .catch(err => console.error("Firebase auth error:", err));
        });

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

    searchInput.addEventListener('input', applyFilters);
});
