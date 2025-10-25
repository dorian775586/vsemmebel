// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('debug');

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

// DOM элементы
const offersListElement = document.getElementById('offers-list');
const categoryFilterElement = document.getElementById('category-filter');
const searchInput = document.getElementById('search-input');
const loadingElement = document.getElementById('loading');
const noOffersElement = document.getElementById('no-offers');
const errorMessageElement = document.getElementById('error-message');

let allOffers = [];
let currentFilter = 'Все';
const defaultCategories = ["Мебель", "Аксессуары", "Услуги", "Электроника"];

function updateLoadState(message, isError = false) {
    loadingElement.textContent = message;
    loadingElement.classList.remove('hidden');
    noOffersElement.classList.add('hidden');

    if (isError) {
        loadingElement.className = "col-span-full text-center text-red-600 p-8 border-2 border-red-400 rounded-xl bg-red-100 mt-4 font-semibold";
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    } else {
        loadingElement.className = "col-span-full text-center text-gray-500 p-8";
        errorMessageElement.style.display = 'none';
    }
}

function createOfferCard(offer) {
    const card = document.createElement('div');
    card.className = "offer-card";

    const oldPrice = parseFloat(offer.price) || 1000;
    const discount = parseInt(offer.discount) || 0;
    const newPrice = Math.round(oldPrice * (1 - discount / 100));

    card.innerHTML = `
        <img src="${offer.image || 'https://placehold.co/400x200/505050/FFFFFF?text=Offer'}" 
             onerror="this.onerror=null;this.src='https://placehold.co/400x200/505050/FFFFFF?text=${encodeURIComponent(offer.title)}';" 
             alt="${offer.title}" class="w-full h-40 object-cover">
        <div class="p-4">
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-semibold px-2 py-1 bg-pink-100 text-pink-600 rounded-full">${discount}% Скидка</span>
                <span class="text-xs text-gray-500">${offer.city || 'Город не указан'}</span>
            </div>
            <h4 class="text-lg font-bold text-gray-800 truncate">${offer.title}</h4>
            <p class="text-sm text-blue-600 font-medium mb-3">${offer.category || 'Без категории'}</p>
            <div class="flex items-center space-x-3">
                <span class="text-xl font-extrabold text-green-600">${newPrice.toLocaleString('ru-RU')} ₽</span>
                <span class="text-sm text-gray-400 line-through">${oldPrice.toLocaleString('ru-RU')} ₽</span>
            </div>
        </div>
    `;
    return card;
}

function renderCategoryButtons() {
    categoryFilterElement.innerHTML = '';
    const uniqueCategories = new Set(allOffers.map(o => o.category).filter(c => c));
    defaultCategories.forEach(c => uniqueCategories.add(c));
    const categoriesToShow = ['Все', ...Array.from(uniqueCategories).sort()];

    categoriesToShow.forEach(category => {
        const button = document.createElement('button');
        button.className = `category-button ${currentFilter === category ? 'active' : ''}`;
        button.textContent = category;
        button.dataset.category = category;
        categoryFilterElement.appendChild(button);
    });
}

function filterAndRenderOffers() {
    offersListElement.innerHTML = '';
    noOffersElement.classList.add('hidden');
    loadingElement.classList.add('hidden');

    const searchTerm = searchInput.value.toLowerCase().trim();

    const filteredOffers = allOffers.filter(offer => {
        const offerCategory = offer.category ? offer.category.toLowerCase() : '';
        const categoryMatch = currentFilter === 'Все' || offer.category === currentFilter;
        const searchMatch = (offer.title && offer.title.toLowerCase().includes(searchTerm)) || offerCategory.includes(searchTerm);
        return categoryMatch && searchMatch;
    });

    if (filteredOffers.length === 0) noOffersElement.classList.remove('hidden');
    else filteredOffers.forEach(offer => offersListElement.appendChild(createOfferCard(offer)));
}

function setupFirestoreListener() {
    updateLoadState("Загрузка предложений...");
    const offersColRef = collection(db, 'artifacts/default-app-id/public/data/offers');

    onSnapshot(offersColRef, (snapshot) => {
        allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCategoryButtons();
        filterAndRenderOffers();
        loadingElement.classList.add('hidden');
    }, (error) => {
        console.error(error);
        updateLoadState("❌ Ошибка чтения данных Firestore: " + error.code, true);
    });
}

// Аутентификация
signInAnonymously(auth)
    .then(() => setupFirestoreListener())
    .catch(err => updateLoadState("❌ Ошибка аутентификации: " + err.message, true));

// Слушатели
categoryFilterElement.addEventListener('click', e => {
    if (e.target.classList.contains('category-button')) {
        document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.category;
        filterAndRenderOffers();
    }
});
searchInput.addEventListener('input', filterAndRenderOffers);
