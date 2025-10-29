import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// Используем ProjectID как AppID для формирования публичного пути
const currentAppId = firebaseConfig.projectId; 
const offersCollectionPath = `artifacts/${currentAppId}/public/data/offers`; // <-- ИСПРАВЛЕНО

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

    // ИСПРАВЛЕНО: Логика извлечения цены из комбинаций
    const activeCombinations = (offer.combinations || []).filter(c => c.isActive && c.price > 0);
    let startingPrice = null;
    if (activeCombinations.length > 0) {
        startingPrice = Math.min(...activeCombinations.map(c => parseFloat(c.price)));
    }
    const priceText = startingPrice ? `${startingPrice.toLocaleString('ru-RU', { style:'currency', currency:'BYN', maximumFractionDigits:0 })}` : 'Цена по запросу';

    // ИСПРАВЛЕНО: Логика извлечения изображения из массива images
    const imageUrl = offer.images && offer.images.length > 0 ? offer.images[0] : 'https://placehold.co/400x250/F97316/FFFFFF?text=' + encodeURIComponent(offer.title || 'Товар');

    card.innerHTML = `
        <div class="relative">
            <img src="${imageUrl}" onerror="this.onerror=null;this.src='https://placehold.co/400x250/F97316/FFFFFF?text=Нет+Фото';" alt="${offer.title}" class="w-full h-48 object-cover">
            <!-- Скидка и старая цена убраны для упрощения, так как их нет в структуре админки -->
        </div>
        <div class="p-5">
            <p class="text-xs font-semibold text-orange-600 uppercase mb-1">${offer.category || 'Без категории'}</p>
            <h4 class="text-xl font-extrabold text-gray-900 truncate mb-3">${offer.title || 'Название не указано'}</h4>
            <div class="flex items-center justify-between mt-4">
                <div>
                    <span class="text-3xl font-black text-orange-600 tracking-tight">${priceText}</span>
                </div>
                <button class="card-button text-white font-bold py-3 px-6 rounded-xl transition duration-300 text-sm hover:shadow-lg">
                    Подробнее
                </button>
            </div>
        </div>
    `;

    // --- Редирект кнопки на страницу товара ---
    const buyBtn = card.querySelector('.card-button');
    buyBtn.addEventListener('click', () => {
        // Предполагается, что у товара есть ID, который передается в объект offer при чтении из Firestore
        if (offer.id) {
            window.location.href = `product.html?id=${offer.id}`;
        } else {
            console.error('ID товара отсутствует для перехода.');
        }
    });

    return card;
}

function renderOffers(offers) {
    offersListElement.innerHTML = '';
    if (!offers.length) {
        noOffersElement.classList.remove('hidden');
    } else {
        noOffersElement.classList.add('hidden');
        // Добавляем проверку на is_active, чтобы отображать только активные товары
        const activeOffers = offers.filter(o => o.is_active === true); 
        activeOffers.forEach(o => offersListElement.appendChild(createOfferCard(o)));
    }
}

function renderCategories() {
    categoryFilterElement.innerHTML = '';
    // Создаем список категорий только из активных товаров
    const activeCategories = allOffers.filter(o => o.is_active === true).map(o => o.category).filter(Boolean);
    allCategories = ['Все', ...new Set(activeCategories)];

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
    
    // Фильтруем сначала по активности, затем по категории и поиску
    const activeOffers = allOffers.filter(o => o.is_active === true);

    const filteredByCategory = currentFilter === 'Все' 
        ? activeOffers 
        : activeOffers.filter(o => o.category === currentFilter);

    const finalFiltered = filteredByCategory.filter(o =>
        (o.title || '').toLowerCase().includes(searchTerm) ||
        (o.description || '').toLowerCase().includes(searchTerm) ||
        (o.category || '').toLowerCase().includes(searchTerm)
    );
    renderOffers(finalFiltered);
}

// --- Загрузка предложений (ИСПРАВЛЕНО: путь к коллекции) ---
function loadOffers() {
    console.log(`Чтение данных из: ${offersCollectionPath}`);
    const offersRef = collection(db, offersCollectionPath);
    
    // Убираем orderBy('createdAt', 'desc') для предотвращения ошибок индексации
    const q = query(offersRef);
    
    onSnapshot(q, snapshot => {
        // Преобразуем документы, добавляя ID
        allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderCategories();
        applyFilters();
    }, error => {
        console.error("Ошибка при чтении данных каталога:", error);
    });
}

// --- Анонимный вход и проверка админа ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Вход анонимно для чтения публичных данных
        signInAnonymously(auth).then(() => {
             console.log("Анонимный вход успешен.");
             loadOffers();
        }).catch(err => console.error("Ошибка анонимного входа:", err));
    } else {
        // Проверка, является ли пользователь админом. 
        // В реальном приложении нужна более надежная проверка (например, через Custom Claims)
        isAdmin = (user.email === 'admin@example.com');
        if (isAdmin) {
            adminLoginBtn.textContent = 'Админка';
            adminLoginBtn.onclick = () => window.location.href = '/admin.html';
        } else {
            adminLoginBtn.style.display = 'block';
        }
        loadOffers();
    }
});

// --- Поиск ---
searchInput.addEventListener('input', applyFilters);

// --- Кнопка Админ / Модалка ---
adminLoginBtn.addEventListener('click', () => {
    if (!isAdmin) {
        adminModal.classList.remove('hidden');
    } else {
        window.location.href = 'admin_panel.html'; // Изменил на admin_panel.html для наглядности
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
            window.location.href = 'admin_panel.html';
        })
        .catch(err => {
            // Используем console.error вместо alert для лучшего поведения в iframe
            console.error('Ошибка входа:', err.message);
            // Визуально сообщаем об ошибке
            adminEmailInput.classList.add('border-red-500');
            adminPasswordInput.classList.add('border-red-500');
            setTimeout(() => {
                adminEmailInput.classList.remove('border-red-500');
                adminPasswordInput.classList.remove('border-red-500');
            }, 3000);
        });
});

// --- Регистрация Админа ---
adminRegisterBtn.addEventListener('click', () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
             console.log('Админ успешно зарегистрирован');
             alert('Админ успешно зарегистрирован. Пожалуйста, войдите.');
        })
        .catch(err => {
            console.error('Ошибка регистрации:', err.message);
            alert('Ошибка регистрации: ' + err.message);
        });
});

// NOTE: loadOffers вызывается внутри onAuthStateChanged
