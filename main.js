import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Устанавливаем уровень логирования для отладки Firestore (полезно для проверки)
setLogLevel('debug');

// --- Firebase config (ОБЯЗАТЕЛЬНО: Используем переменные среды) ---
// Проверяем наличие глобальных переменных, предоставляемых Canvas
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Путь к коллекции публичных данных (товаров)
const offersCollectionPath = `artifacts/${appId}/public/data/offers`; 

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
    card.className = "offer-card";

    // Логика извлечения цены из комбинаций
    const activeCombinations = (offer.combinations || []).filter(c => c.isActive && parseFloat(c.price) > 0);
    let startingPrice = null;
    if (activeCombinations.length > 0) {
        startingPrice = Math.min(...activeCombinations.map(c => parseFloat(c.price)));
    }
    // Приведение цены к формату BYN
    const priceText = startingPrice ? `${startingPrice.toLocaleString('ru-RU', { style:'currency', currency:'BYN', maximumFractionDigits:0 })}` : 'Цена по запросу';

    // Логика извлечения изображения
    const imageUrl = offer.images && offer.images.length > 0 ? offer.images[0] : `https://placehold.co/400x250/F97316/FFFFFF?text=${encodeURIComponent(offer.title || 'Товар')}`;

    card.innerHTML = `
        <div class="relative">
            <img src="${imageUrl}" onerror="this.onerror=null;this.src='https://placehold.co/400x250/F97316/FFFFFF?text=Нет+Фото';" alt="${offer.title}" class="w-full h-48 object-cover">
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
            // Здесь должна быть логика для перехода на страницу с деталями товара
            // Заглушка, так как product.html не предоставлен
            console.log(`Переход на страницу товара ID: ${offer.id}`);
        }
    });

    return card;
}

function renderOffers(offers) {
    offersListElement.innerHTML = '';
    
    // ВАЖНО: Отображаем только те товары, у которых is_active явно равно true
    const activeOffers = offers.filter(o => o.is_active === true); 

    if (!activeOffers.length) {
        noOffersElement.classList.remove('hidden');
    } else {
        noOffersElement.classList.add('hidden');
        activeOffers.forEach(o => offersListElement.appendChild(createOfferCard(o)));
    }
}

function renderCategories() {
    categoryFilterElement.innerHTML = '';
    
    // Фильтруем категории только из АКТИВНЫХ товаров
    const activeCategories = allOffers
        .filter(o => 
            o.is_active === true && 
            o.category && 
            typeof o.category === 'string' && 
            o.category.trim() !== ''
        )
        .map(o => o.category);
        
    // Получаем уникальные категории и добавляем "Все"
    const uniqueCategories = ['Все', ...new Set(activeCategories)];

    uniqueCategories.forEach(category => {
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
    
    // Используем allOffers, который обновляется через onSnapshot
    const offersToFilter = allOffers;

    // 1. Фильтрация по выбранной категории
    const filteredByCategory = currentFilter === 'Все' 
        ? offersToFilter
        : offersToFilter.filter(o => o.category === currentFilter);

    // 2. Фильтрация по поисковому запросу
    const finalFiltered = filteredByCategory.filter(o =>
        (o.title || '').toLowerCase().includes(searchTerm) ||
        (o.description || '').toLowerCase().includes(searchTerm) ||
        (o.category || '').toLowerCase().includes(searchTerm)
    );
    
    // 3. Рендеринг (renderOffers внутри себя проверяет is_active: true)
    renderOffers(finalFiltered);
}

// --- Загрузка предложений с подпиской на изменения (onSnapshot) ---
function loadOffers() {
    console.log(`Чтение данных каталога из: ${offersCollectionPath}`);
    const offersRef = collection(db, offersCollectionPath);
    
    const q = query(offersRef);
    
    // onSnapshot обеспечивает реальное время (новые товары будут появляться)
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
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Попытка входа с custom token, если он есть
        if (initialAuthToken) {
            try {
                // Пытаемся войти с предоставленным токеном
                await signInWithCustomToken(auth, initialAuthToken);
                console.log("Вход через Custom Token успешен.");
            } catch (err) {
                console.error("Ошибка входа через Custom Token, вход анонимно:", err);
                // Если токен не сработал, входим анонимно
                await signInAnonymously(auth);
            }
        } else {
            // Вход анонимно для чтения публичных данных
            await signInAnonymously(auth).catch(err => console.error("Ошибка анонимного входа:", err));
        }
    } 

    // После авторизации (анонимной или пользовательской)
    if (auth.currentUser) {
        // Проверка, является ли пользователь админом
        isAdmin = (auth.currentUser.email === 'admin@example.com');
        
        if (isAdmin) {
            adminLoginBtn.textContent = 'Админка';
            adminLoginBtn.onclick = () => window.location.href = 'admin.html';
        } else {
            // Если пользователь вошел как НЕ-админ
            adminLoginBtn.textContent = 'Админ';
            adminLoginBtn.onclick = () => adminModal.classList.remove('hidden');
        }
        
        loadOffers();
    }
});

// --- Обработчики событий ---

// Поиск
searchInput.addEventListener('input', applyFilters);

// Кнопка Админ / Модалка (только если не админ)
adminLoginBtn.addEventListener('click', (e) => {
    // Если кнопка перенаправляет на админку, то не открываем модальное окно
    if (adminLoginBtn.textContent !== 'Админка') { 
        adminModal.classList.remove('hidden');
        // Скрываем сообщение при открытии
        adminMessageElement.classList.add('hidden'); 
    }
});

adminCloseBtn.addEventListener('click', () => adminModal.classList.add('hidden'));

// --- Вход Админа ---
adminLoginFormBtn.addEventListener('click', () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    
    // Сбрасываем стили
    adminEmailInput.classList.remove('border-red-500');
    adminPasswordInput.classList.remove('border-red-500');

    if (!email || !password) {
        displayAuthError('Пожалуйста, введите email и пароль.');
        return;
    }
    
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
    
    if (!email || !password) {
        displayAuthError('Пожалуйста, введите email и пароль для регистрации.');
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            console.log('Админ успешно зарегистрирован');
            displayAuthError('Регистрация успешна! Теперь вы можете войти.', false); 
        })
        .catch(err => {
            console.error('Ошибка регистрации:', err.message);
            displayAuthError('Ошибка регистрации: ' + err.message);
        });
});

// NOTE: loadOffers вызывается внутри onAuthStateChanged
