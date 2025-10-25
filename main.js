import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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

    // --- Функции для карточек ---
    function createOfferCard(offer) {
        const card = document.createElement('div');
        card.className = "offer-card";

        const oldPrice = parseFloat(offer.price);
        const discount = parseInt(offer.discount || 0);
        const newPrice = Math.round(oldPrice * (1 - discount / 100));

        card.innerHTML = `
            <img src="${offer.image}" onerror="this.onerror=null;this.src='https://placehold.co/400x200/505050/FFFFFF?text=${encodeURIComponent(offer.title)}';" alt="${offer.title}" class="w-full h-40 object-cover">
            <div class="p-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-semibold px-2 py-1 bg-pink-100 text-pink-600 rounded-full">${discount}% Скидка</span>
                    <span class="text-xs text-gray-500">${offer.city || ''}</span>
                </div>
                <h4 class="text-lg font-bold text-gray-800 truncate">${offer.title}</h4>
                <p class="text-sm text-blue-600 font-medium mb-3">${offer.category}</p>
                <div class="flex items-center space-x-3">
                    <span class="text-xl font-extrabold text-green-600">${newPrice.toLocaleString('ru-RU', { style: 'currency', currency: 'BYN', maximumFractionDigits: 0 })}</span>
                    <span class="text-sm text-gray-400 line-through">${oldPrice.toLocaleString('ru-RU', { style: 'currency', currency: 'BYN', maximumFractionDigits: 0 })}</span>
                </div>
                <button class="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition duration-150">Подробнее</button>
            </div>
        `;
        return card;
    }

    function renderOffers(offers) {
        offersListElement.innerHTML = '';
        if (offers.length === 0) {
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

    // --- Анонимная аутентификация Firebase ---
    signInAnonymously(auth).then(() => {
        console.log("Firebase: Authenticated anonymously");

        // --- Подключаемся к коллекции предложений ---
        const offersRef = collection(db, 'offers'); // <-- твоя коллекция
        const q = query(offersRef, orderBy('createdAt', 'desc'));

        onSnapshot(q, snapshot => {
            allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Автоопределение категорий
            allCategories = ['Все', ...new Set(allOffers.map(o => o.category))];

            renderCategories();
            applyFilters();
        });

    }).catch(err => {
        console.error("Firebase auth error:", err);
        offersListElement.innerHTML = `<p class="col-span-full text-center text-red-500 p-4">Ошибка аутентификации Firebase: ${err.message}</p>`;
    });

    searchInput.addEventListener('input', applyFilters);
});
