import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Добавляем импорт для установки уровня логирования
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Устанавливаем уровень логирования для отладки Firestore (полезно для проверки)
setLogLevel('debug');

// --- Firebase config ---
// Примечание: В боевом приложении рекомендуется использовать глобальные переменные __app_id, __firebase_config и __initial_auth_token.
// Здесь используем предоставленную вами конфигурацию.
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
const offersCollectionPath = `artifacts/${currentAppId}/public/data/offers`; 

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
const adminMessageElement = document.getElementById('admin-message'); // Элемент для сообщений в модальном окне

let allOffers = [];
let allCategories = ['Все'];
let currentFilter = 'Все';
let isAdmin = false;


// --- Вспомогательные функции ---

// Функция для отображения сообщений в модальном окне (замена alert())
function displayAuthError(message, isError = true) {
    adminMessageElement.textContent = message;
    adminMessageElement.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
    
    if (isError) {
        adminMessageElement.classList.add('bg-red-100', 'text-red-700');
    } else {
        adminMessageElement.classList.add('bg-green-100', 'text-green-700');
    }

    setTimeout(() => {
        adminMessageElement.classList.add('hidden');
    }, 5000);
}

// --- Функции отображения ---
function createOfferCard(offer) {
    const card = document.createElement('div');
    // NOTE: Добавляем класс, если товар неактивен, для визуального выделения
    card.className = "offer-card relative " + (offer.is_active === false ? 'opacity-60 border-red-500 border-2' : '');

    // Логика извлечения цены из комбинаций
    // Фильтруем только активные комбинации с ценой > 0
    const activeCombinations = (offer.combinations || []).filter(c => c.isActive && c.price > 0);
    let startingPrice = null;
    if (activeCombinations.length > 0) {
        startingPrice = Math.min(...activeCombinations.map(c => parseFloat(c.price)));
    }
    // Приведение цены к формату BYN
    const priceText = startingPrice ? `${startingPrice.toLocaleString('ru-RU', { style:'currency', currency:'BYN', maximumFractionDigits:0 })}` : 'Цена по запросу';

    // Логика извлечения изображения из массива images
    // Используем первое изображение, если массив существует
    const imageUrl = offer.images && offer.images.length > 0 ? offer.images[0] : 'https://placehold.co/400x250/F97316/FFFFFF?text=' + encodeURIComponent(offer.title || 'Товар');

    card.innerHTML = `
        <div class="relative">
            <img src="${imageUrl}" onerror="this.onerror=null;this.src='https://placehold.co/400x250/F97316/FFFFFF?text=Нет+Фото';" alt="${offer.title}" class="w-full h-48 object-cover">
            ${offer.is_active === false ? '<span class="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">НЕАКТИВЕН</span>' : ''}
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
        if (offer.id) {
            // Предполагаем, что у вас есть страница product.html для просмотра деталей
            window.location.href = `product.html?id=${offer.id}`;
        } else {
            console.error('ID товара отсутствует для перехода.');
        }
    });

    return card;
}

function renderOffers(offers) {
    offersListElement.innerHTML = '';
    
    // ИЗМЕНЕНИЕ: Отображаем ВСЕ товары, не фильтруя по is_active
    if (!offers.length) {
        noOffersElement.classList.remove('hidden');
    } else {
        noOffersElement.classList.add('hidden');
        offers.forEach(o => offersListElement.appendChild(createOfferCard(o)));
    }
}

function renderCategories() {
    categoryFilterElement.innerHTML = '';
    
    // ИЗМЕНЕНИЕ: Собираем категории из ВСЕХ товаров, независимо от is_active
    const allExistingCategories = allOffers
        .filter(o => 
            o.category && 
            typeof o.category === 'string' && 
            o.category.trim() !== ''
        )
        .map(o => o.category);
        
    // Получаем уникальные категории и добавляем "Все"
    allCategories = ['Все', ...new Set(allExistingCategories)];

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
    
    // ИЗМЕНЕНИЕ: Используем allOffers без фильтрации по активности
    let filteredOffers = allOffers;

    // Фильтрация по выбранной категории
    const filteredByCategory = currentFilter === 'Все' 
        ? filteredOffers 
        : filteredOffers.filter(o => o.category === currentFilter);

    // Фильтрация по поисковому запросу
    const finalFiltered = filteredByCategory.filter(o =>
        (o.title || '').toLowerCase().includes(searchTerm) ||
        (o.description || '').toLowerCase().includes(searchTerm) ||
        (o.category || '').toLowerCase().includes(searchTerm)
    );
    renderOffers(finalFiltered);
}

// --- Загрузка предложений с подпиской на изменения (onSnapshot) ---
function loadOffers() {
    console.log(`Чтение данных из: ${offersCollectionPath}`);
    const offersRef = collection(db, offersCollectionPath);
    
    const q = query(offersRef);
    
    // onSnapshot - это слушатель, который обновляет данные в реальном времени при их изменении в админке
    onSnapshot(q, snapshot => {
        // Преобразуем документы, добавляя ID
        allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Перерисовываем категории и товары
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
        isAdmin = (user.email === 'admin@example.com');
        if (isAdmin) {
            adminLoginBtn.textContent = 'Админка';
            adminLoginBtn.onclick = () => window.location.href = '/admin.html';
        } else {
            // Если пользователь вошел как НЕ-админ, показываем кнопку входа
            adminLoginBtn.style.display = 'block';
        }
        loadOffers();
    }
});

// --- Обработчики событий ---

// Поиск
searchInput.addEventListener('input', applyFilters);

// Кнопка Админ / Модалка
adminLoginBtn.addEventListener('click', () => {
    if (!isAdmin) {
        adminModal.classList.remove('hidden');
        // Скрываем сообщение при открытии
        adminMessageElement.classList.add('hidden'); 
    } else {
        // Перенаправление на админку для уже авторизованного админа
        window.location.href = 'admin.html'; 
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
            // УСПЕШНЫЙ РЕДИРЕКТ
            window.location.href = 'admin.html';
        })
        .catch(err => {
            console.error('Ошибка входа:', err.message);
            displayAuthError('Ошибка входа: Неверный email или пароль.'); 
            // Визуальная подсветка полей
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
            // Заменяем alert на вывод в модальном окне
            displayAuthError('Регистрация успешна! Пожалуйста, войдите.', false); 
        })
        .catch(err => {
            console.error('Ошибка регистрации:', err.message);
            // Заменяем alert на вывод в модальном окне
            displayAuthError('Ошибка регистрации: ' + err.message);
        });
});

// NOTE: loadOffers вызывается внутри onAuthStateChanged
