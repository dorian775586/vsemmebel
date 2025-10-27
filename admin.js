import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    signInWithCustomToken,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    getDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- КОНФИГ И ИНИЦИАЛИЗАЦИЯ (Используем Canvas Globals и Fallback) ---

// Пользовательский хардкодный конфиг для FALLBACK, если Canvas globals недоступны
const FALLBACK_FIREBASE_CONFIG = {
    apiKey: "AIzaSyA-LeQHKV4NfJrTKQCGjG-VQGhfWxtPk70",
    authDomain: "vsemmebel-90d48.firebaseapp.com",
    projectId: "vsemmebel-90d48",
    storageBucket: "vsemmebel-90d48.firebasestorage.app",
    messagingSenderId: "958123504041",
    appId: "1:958123504041:web:1f14f4561d6bb6628494b8"
};

// 1. Определение конфига: используем глобальный __firebase_config, если он есть, иначе FALLBACK
const firebaseConfig = typeof __firebase_config !== 'undefined' ?
    JSON.parse(__firebase_config) :
    FALLBACK_FIREBASE_CONFIG;

// 2. Определение токена: используем глобальный __initial_auth_token, если он есть
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Инициализация
let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase инициализирован успешно.");
} catch (e) {
    console.error("КРИТИЧЕСКАЯ ОШИБКА: Не удалось инициализировать Firebase.", e);
    // Останавливаем выполнение или отображаем критическое сообщение
    alert("КРИТИЧЕСКАЯ ОШИБКА: Не удалось подключиться к Firebase. См. консоль.");
}


// --- DOM элементы ---
// Проверка на существование элементов перед использованием
const adminPanel = document.getElementById('adminPanel');
const accessDenied = document.getElementById('accessDenied');
const form = document.getElementById('addOfferForm');
const statusMessage = document.getElementById('statusMessage');
const logoutBtn = document.getElementById('logoutBtn');
const offersList = document.getElementById('offers-list');

// Контейнеры для динамических полей
const imagesContainer = document.getElementById('images-container');
const facadeOrMaterialContainer = document.getElementById('facadeOrMaterialContainer');
const colorsContainer = document.getElementById('colors-container');
const pricesContainer = document.getElementById('prices-container');

// Кнопки и связанные элементы
const itemTypeSelect = document.getElementById('itemType');
const facadeOrMaterialGroup = document.getElementById('facadeOrMaterialGroup');
const facadeOrMaterialLabel = document.getElementById('facadeOrMaterialLabel');
const colorsGroup = document.getElementById('colorsGroup');
const pricesGroup = document.getElementById('pricesGroup');

const addImageBtn = document.getElementById('addImageBtn');
const addFacadeOrMaterialBtn = document.getElementById('addFacadeOrMaterialBtn');
const addColorBtn = document.getElementById('addColorBtn');
const addPriceBtn = document.getElementById('addPriceBtn');

let editingId = null;

// --- Custom Confirmation Modal Logic (Замена window.confirm) ---

// Функция для создания модального окна (оставлена для полноты, она должна быть вызвана где-то в HTML)
function createConfirmationModal() {
    // Проверка, чтобы не создавать модальное окно дважды
    if (document.getElementById('customConfirmModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'customConfirmModal';
    // Используем z-index выше 10, чтобы перекрыть все
    overlay.className = 'fixed inset-0 z-[100] hidden flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 p-4';

    const modal = document.createElement('div');
    modal.className = 'bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full transform scale-100 transition-transform duration-300';

    modal.innerHTML = `
        <h3 id="confirmTitle" class="text-xl font-bold text-red-600 mb-4">Подтвердите удаление</h3>
        <p id="confirmMessage" class="text-gray-700 mb-6"></p>
        <div class="flex justify-end gap-3">
            <button id="confirmCancel" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition">Отмена</button>
            <button id="confirmOK" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition">Удалить</button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Добавляем модальное окно в глобальный объект (если не определен)
    if (typeof window.customModal === 'undefined') {
        window.customModal = {
            element: null,
            resolve: null
        };
    }
    window.customModal.element = overlay;

    document.getElementById('confirmCancel').addEventListener('click', () => {
        window.customModal.element.classList.add('hidden');
        if (window.customModal.resolve) window.customModal.resolve(false);
    });

    document.getElementById('confirmOK').addEventListener('click', () => {
        window.customModal.element.classList.add('hidden');
        if (window.customModal.resolve) window.customModal.resolve(true);
    });
}

function showCustomConfirm(message) {
    if (!document.getElementById('customConfirmModal')) createConfirmationModal();

    return new Promise(resolve => {
        document.getElementById('confirmMessage').textContent = message;
        window.customModal.resolve = resolve;
        window.customModal.element.classList.remove('hidden');
    });
}

// Создаем модальное окно сразу
if (document.body) {
    createConfirmationModal();
} else {
    document.addEventListener('DOMContentLoaded', createConfirmationModal);
}
// --- Конец Custom Confirmation Modal Logic ---

// --- Управление UI на основе Типа Товара ---
function updateUIBasedOnType() {
    const type = itemTypeSelect.value;
    
    // 1. Управление полем Фасад/Материал
    if (['Диван', 'Кресло', 'Кухня', 'Мебель', 'Все'].includes(type)) {
        facadeOrMaterialGroup.classList.remove('hidden');
    } else {
        facadeOrMaterialGroup.classList.add('hidden');
    }

    // 2. Изменение текста метки (Лейбла)
    if (type === 'Диван' || type === 'Кресло') {
        facadeOrMaterialLabel.textContent = 'Материалы обивки (например, кожа, ткань)';
    } else if (type === 'Кухня') {
        facadeOrMaterialLabel.textContent = 'Материалы корпуса/фасада (например, массив, МДФ)';
    } else {
        facadeOrMaterialLabel.textContent = 'Фасады / Опции';
    }

    // 3. Управление полями Цвета и Цены
    if (type === 'Кухня' || type === 'Мебель' || type === 'Все') {
        colorsGroup.classList.remove('hidden');
        pricesGroup.classList.remove('hidden');
    } else {
        colorsGroup.classList.add('hidden');
        pricesGroup.classList.add('hidden');
    }

    // Принудительно очищаем контейнеры
    facadeOrMaterialContainer.innerHTML = "";
    colorsContainer.innerHTML = "";
    pricesContainer.innerHTML = "";

    // Инициализация полей для нового типа
    if (!facadeOrMaterialGroup.classList.contains('hidden')) {
        facadeOrMaterialContainer.appendChild(createFacadeOrMaterialRow());
    }
    if (!colorsGroup.classList.contains('hidden')) {
        colorsContainer.appendChild(createColorRow());
    }
}

itemTypeSelect.addEventListener('change', updateUIBasedOnType);


// --- Auth check ---

// 3. Вход по Custom Token, если он есть
if (auth && initialAuthToken) {
    signInWithCustomToken(auth, initialAuthToken).catch(e => {
        console.error("Ошибка входа по Custom Token:", e);
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Если нет пользователя, пробуем анонимный вход как запасной вариант
        try {
            await signInAnonymously(auth);
            // Если вошли анонимно, onAuthStateChanged вызовется снова
        } catch (e) {
            console.error("Ошибка анонимного входа:", e);
            accessDenied.classList.remove('hidden');
            adminPanel.classList.add('hidden');
            return;
        }
    }
    
    // Если пользователь есть (либо старый, либо только что анонимно вошедший)
    if (user) {
        adminPanel.classList.remove('hidden');
        accessDenied.classList.add('hidden');
        // Убеждаемся, что DOM загружен, прежде чем работать с offersList
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async () => {
                await loadOffers();
                updateUIBasedOnType(); // Инициализация UI после загрузки
            });
        } else {
            await loadOffers();
            updateUIBasedOnType(); // Инициализация UI после загрузки
        }
    } else {
         // Отобразить отказ в доступе, если даже анонимный вход не удался
        accessDenied.classList.remove('hidden');
        adminPanel.classList.add('hidden');
    }
});


// --- Вспомогательные функции для создания полей ---

function createImageRow(value = "") {
    const div = document.createElement('div');
    div.className = "flex gap-2 mb-2";
    div.innerHTML = `
        <input type="url" placeholder="URL изображения" class="w-full p-2 border rounded" value="${value}" required>
        <button type="button" class="bg-red-500 text-white px-3 py-1 rounded flex-shrink-0 btn-danger">Удалить</button>
    `;
    div.querySelector('button').onclick = () => div.remove();
    return div;
}

function createFacadeOrMaterialRow(value = "") {
    const div = document.createElement('div');
    div.className = "flex gap-2 mb-2";
    div.innerHTML = `
        <input type="text" placeholder="Название опции (Фасад/Материал)" class="w-full p-2 border rounded" value="${value}" required>
        <button type="button" class="bg-red-500 text-white px-3 py-1 rounded flex-shrink-0 btn-danger">Удалить</button>
    `;
    div.querySelector('button').onclick = () => {
        div.remove();
        if (pricesGroup && !pricesGroup.classList.contains('hidden')) updatePricesDropdowns();
    };
    div.querySelector('input').oninput = () => {
        if (pricesGroup && !pricesGroup.classList.contains('hidden')) updatePricesDropdowns();
    };
    return div;
}

function createColorRow(name = "", hex = "#ffffff") {
    const div = document.createElement('div');
    div.className = "flex items-center gap-2 mb-2";
    div.innerHTML = `
        <input type="text" placeholder="Название цвета" class="p-2 border rounded w-1/2" value="${name}" required>
        <input type="color" class="w-10 h-10 border rounded flex-shrink-0" value="${hex}">
        <button type="button" class="bg-red-500 text-white px-3 py-1 rounded flex-shrink-0 btn-danger">Удалить</button>
    `;

    div.querySelector('button').onclick = () => {
        div.remove();
        if (pricesGroup && !pricesGroup.classList.contains('hidden')) updatePricesDropdowns();
    };
    div.querySelector('input[type="text"]').oninput = () => {
        if (pricesGroup && !pricesGroup.classList.contains('hidden')) updatePricesDropdowns();
    };
    return div;
}

/**
 * Создает ряд для цены с выпадающими списками.
 */
function createPriceRow(optName = "", colorName = "", price = "") {
    // Важно: эти функции вызываются, чтобы получить АКТУАЛЬНЫЙ список опций из инпутов
    const opts = getFacadeOrMaterialOptions();
    const colors = getColorOptions();
    
    const isMaterialOnly = itemTypeSelect.value === 'Диван' || itemTypeSelect.value === 'Кресло';
    const firstSelectLabel = isMaterialOnly ? 'Материал' : 'Фасад/Опция';

    const div = document.createElement('div');
    div.className = "flex gap-2 mb-2 items-center p-2 bg-white rounded shadow-sm";
    
    // 1. Выбор Фасада/Материала
    const optSelect = document.createElement('select');
    optSelect.className = "p-2 border rounded w-1/3";
    optSelect.innerHTML = `<option value="">-- Выберите ${firstSelectLabel} --</option>`;
    opts.forEach(o => {
        const option = new Option(o, o);
        if (o === optName) option.selected = true;
        optSelect.add(option);
    });

    // 2. Выбор Цвета (если требуется)
    let colorSelect = null;
    if (pricesGroup && !pricesGroup.classList.contains('hidden')) {
        colorSelect = document.createElement('select');
        colorSelect.className = "p-2 border rounded w-1/3";
        colorSelect.innerHTML = `<option value="">-- Выберите Цвет --</option>`;
        colors.forEach(c => {
            const option = new Option(c, c);
            if (c === colorName) option.selected = true;
            colorSelect.add(option);
        });
    }

    // 3. Поле Цены
    const priceInput = document.createElement('input');
    priceInput.type = "number";
    priceInput.placeholder = "Цена";
    priceInput.className = "p-2 border rounded w-1/3";
    priceInput.required = true;
    priceInput.value = price;

    // 4. Кнопка Удалить
    const delBtn = document.createElement('button');
    delBtn.type = "button";
    delBtn.className = "bg-red-500 text-white px-3 py-1 rounded flex-shrink-0 btn-danger";
    delBtn.textContent = "Удалить";
    delBtn.onclick = () => div.remove();

    div.appendChild(optSelect);
    if (colorSelect) div.appendChild(colorSelect);
    div.appendChild(priceInput);
    div.appendChild(delBtn);
    
    return div;
}


// --- Функции для извлечения текущих опций ---

function getFacadeOrMaterialOptions() {
    return Array.from(facadeOrMaterialContainer.querySelectorAll('input[type="text"]'))
        .map(i => i.value.trim())
        .filter(Boolean);
}

function getColorOptions() {
    return Array.from(colorsContainer.children)
        .map(div => div.querySelector('input[type="text"]').value.trim())
        .filter(Boolean);
}

/**
 * КЛЮЧЕВАЯ ФУНКЦИЯ: Обновляет выпадающие списки в существующих рядах цен.
 */
function updatePricesDropdowns() {
    // 1. Сбор текущих данных из Price Rows
    const currentPrices = Array.from(pricesContainer.children).map(div => {
        const selects = div.querySelectorAll('select');
        const isColorUsed = selects.length > 1; 

        return {
            opt: selects[0].value,
            color: isColorUsed ? selects[1].value : '',
            price: div.querySelector('input[type="number"]').value
        };
    });

    // 2. Очистка контейнера
    pricesContainer.innerHTML = '';
    
    // 3. Восстановление рядов с НОВЫМИ выпадающими списками
    currentPrices.forEach(p => {
        pricesContainer.appendChild(createPriceRow(p.opt, p.color, p.price));
    });
}

// --- Привязка кнопок (ОБНОВЛЕНО) ---
addImageBtn.addEventListener('click', () => imagesContainer.appendChild(createImageRow()));

addFacadeOrMaterialBtn.addEventListener('click', () => {
    facadeOrMaterialContainer.appendChild(createFacadeOrMaterialRow());
    if (pricesGroup && !pricesGroup.classList.contains('hidden')) updatePricesDropdowns();
});

addColorBtn.addEventListener('click', () => {
    colorsContainer.appendChild(createColorRow());
    if (pricesGroup && !pricesGroup.classList.contains('hidden')) updatePricesDropdowns();
});

addPriceBtn.addEventListener('click', () => pricesContainer.appendChild(createPriceRow()));


// --- Загрузка существующих товаров ---
async function loadOffers() {
    if (!db) {
        console.error("Firestore не инициализирован. Пропускаем загрузку.");
        offersList.innerHTML = '<p class="text-red-500">Не удалось подключиться к базе данных для загрузки товаров.</p>';
        return;
    }
    offersList.innerHTML = "<p class='text-gray-500'>Загрузка...</p>";
    const collectionPath = 'offers'; 

    try {
        const qSnap = await getDocs(collection(db, collectionPath));
        offersList.innerHTML = "";
        qSnap.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = "border p-4 rounded flex justify-between items-center bg-gray-50";
            div.innerHTML = `
                <div>
                    <p class="font-semibold">${data.title || '(без названия)'}</p>
                    <p class="text-sm text-gray-500">Тип: ${data.itemType || '-'} | Категория: ${data.category || '-'}</p>
                </div>
                <div class="flex gap-2">
                    <button class="edit-btn bg-blue-500 text-white px-3 py-1 rounded btn-primary hover:bg-blue-600">Редактировать</button>
                    <button class="del-btn bg-red-500 text-white px-3 py-1 rounded btn-danger">Удалить</button>
                </div>
            `;

            const editBtn = div.querySelector('.edit-btn');
            const delBtn = div.querySelector('.del-btn');

            delBtn.onclick = async () => {
                const confirmed = await showCustomConfirm(`Вы уверены, что хотите удалить товар "${data.title}"?`);
                
                if (confirmed) { 
                    try {
                        await deleteDoc(doc(db, collectionPath, docSnap.id));
                        await loadOffers();
                    } catch (err) {
                        console.error('Ошибка удаления:', err);
                    }
                }
            };

            editBtn.onclick = async () => {
                editingId = docSnap.id;
                const snap = await getDoc(doc(db, collectionPath, editingId));
                if (!snap.exists()) {
                    console.error('Документ не найден');
                    return;
                }
                const offer = snap.data();

                // 1. Основные поля
                document.getElementById('title').value = offer.title || "";
                itemTypeSelect.value = offer.itemType || "Все";
                document.getElementById('category').value = offer.category || "Все";
                document.getElementById('discount').value = offer.discount || 0;
                document.getElementById('description').value = offer.description || "";
                
                // Сначала обновляем UI, чтобы создать нужные контейнеры
                updateUIBasedOnType();

                // 2. Динамические поля
                imagesContainer.innerHTML = "";
                (offer.images || []).forEach(url => imagesContainer.appendChild(createImageRow(url)));

                facadeOrMaterialContainer.innerHTML = "";
                (offer.options || []).forEach(f => facadeOrMaterialContainer.appendChild(createFacadeOrMaterialRow(f)));

                colorsContainer.innerHTML = "";
                (offer.colors || []).forEach(c => colorsContainer.appendChild(createColorRow(c.name, c.hex || '#ffffff')));
                
                // 3. Цены (требуется предварительная загрузка опций/цветов)
                pricesContainer.innerHTML = "";
                updatePricesDropdowns(); 
                
                // Теперь добавляем сохраненные цены
                (offer.prices || []).forEach(p => pricesContainer.appendChild(createPriceRow(p.option, p.color, p.price)));

                document.getElementById('save-btn').textContent = "Обновить товар";
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            offersList.appendChild(div);
        });
    } catch (err) {
        console.error("Ошибка загрузки товаров:", err);
        offersList.innerHTML = '<p class="text-red-500">Ошибка загрузки товаров: ' + err.message + '</p>';
    }
}


// --- form submit (create/update) ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('save-btn').textContent = "Сохранение...";
    statusMessage.classList.add('hidden'); // Скрываем сообщение перед сохранением

    // Сбор данных опций и цен
    const optionsArray = getFacadeOrMaterialOptions();
    const colorsData = Array.from(colorsContainer.children).map(div => ({
        name: div.querySelector('input[type="text"]').value.trim(),
        hex: div.querySelector('input[type="color"]').value
    })).filter(c => c.name);

    const pricesData = Array.from(pricesContainer.children).map(div => {
        const selects = div.querySelectorAll('select');
        const priceInput = div.querySelector('input[type="number"]');

        return {
            option: selects[0].value.trim(),
            color: selects.length > 1 ? selects[1].value.trim() : '',
            price: Number(priceInput.value)
        };
    }).filter(p => p.option && p.price > 0); // Убеждаемся, что есть опция и цена

    const docData = {
        title: document.getElementById('title').value.trim(),
        itemType: itemTypeSelect.value,
        category: document.getElementById('category').value,
        discount: Number(document.getElementById('discount').value) || 0,
        description: document.getElementById('description').value.trim(),
        images: Array.from(imagesContainer.querySelectorAll('input[type="url"]')).map(i => i.value.trim()).filter(Boolean),
        
        // Опции и цены - данные для карточки товара
        options: optionsArray, 
        colors: colorsData, 
        prices: pricesData, 
        
        updatedAt: serverTimestamp()
    };
    
    // Путь к коллекции
    const collectionPath = 'offers'; 

    try {
        if (editingId) {
            await updateDoc(doc(db, collectionPath, editingId), docData);
            statusMessage.textContent = '✅ Товар успешно обновлён!';
            editingId = null;
        } else {
            docData.createdAt = serverTimestamp();
            await addDoc(collection(db, collectionPath), docData);
            statusMessage.textContent = '✅ Новый товар добавлен!';
        }

        statusMessage.className = "text-center py-2 rounded-lg font-medium bg-green-100 text-green-700";
        statusMessage.classList.remove('hidden');

        form.reset();
        document.getElementById('save-btn').textContent = "Сохранить товар";
        updateUIBasedOnType(); // Очистка и инициализация полей

        await loadOffers();
    } catch (err) {
        console.error("Ошибка сохранения:", err);
        statusMessage.textContent = '❌ Ошибка: ' + err.message;
        statusMessage.className = "text-center py-2 rounded-lg font-medium bg-red-100 text-red-700";
        statusMessage.classList.remove('hidden');
        document.getElementById('save-btn').textContent = "Сохранить товар";
    }
});

// --- Выход из аккаунта ---
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
});

// --- Инициализация (на случай, если Auth завершится позже) ---
// Этот код больше не нужен, так как onAuthStateChanged обрабатывает все после инициализации
/*
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateUIBasedOnType);
} else {
    // updateUIBasedOnType(); // Вызывается внутри onAuthStateChanged
}
*/
