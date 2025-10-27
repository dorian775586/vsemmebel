import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; // Восстановлено для Auth
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
    // Используем специальные глобальные переменные Canvas для инициализации
    // signInWithCustomToken, signInAnonymously 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- КОНФИГ И ИНИЦИАЛИЗАЦИЯ (Используем Canvas Globals) ---
// Внимание: В реальной среде Canvas переменные __firebase_config и __initial_auth_token
// будут доступны. Для локального запуска может потребоваться ручная настройка.
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
const offersList = document.getElementById('offers-list');

// Контейнеры для динамических полей
const imagesContainer = document.getElementById('images-container');
const facadeOrMaterialContainer = document.getElementById('facadeOrMaterialContainer');
const colorsContainer = document.getElementById('colors-container');
const pricesContainer = document.getElementById('prices-container');

// Кнопки и связанные элементы
const itemTypeSelect = document.getElementById('itemType'); // НОВОЕ
const facadeOrMaterialGroup = document.getElementById('facadeOrMaterialGroup'); // НОВОЕ
const facadeOrMaterialLabel = document.getElementById('facadeOrMaterialLabel'); // НОВОЕ
const colorsGroup = document.getElementById('colorsGroup'); // НОВОЕ
const pricesGroup = document.getElementById('pricesGroup'); // НОВОЕ

const addImageBtn = document.getElementById('addImageBtn');
const addFacadeOrMaterialBtn = document.getElementById('addFacadeOrMaterialBtn'); // ИЗМЕНЕНО
const addColorBtn = document.getElementById('addColorBtn');
const addPriceBtn = document.getElementById('addPriceBtn');

let editingId = null;

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

    // 3. Управление полем Цвета
    if (type === 'Кухня' || type === 'Мебель' || type === 'Все') {
        colorsGroup.classList.remove('hidden');
        pricesGroup.classList.remove('hidden');
    } else {
        // Диван/Кресло: цена обычно зависит только от Материала, цвет может быть свободным текстом в описании.
        // Аксессуары/Услуги: не имеют комбинаций.
        colorsGroup.classList.add('hidden');
        pricesGroup.classList.add('hidden');
    }

    // Принудительно очищаем контейнеры, чтобы не было путаницы при переключении типов
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
    if (!pricesGroup.classList.contains('hidden')) {
        pricesContainer.appendChild(createPriceRow());
    }
}

itemTypeSelect.addEventListener('change', updateUIBasedOnType);


// --- Auth check ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        accessDenied.classList.remove('hidden');
        adminPanel.classList.add('hidden');
        return;
    }
    adminPanel.classList.remove('hidden');
    accessDenied.classList.add('hidden');
    await loadOffers();
    updateUIBasedOnType(); // Инициализация UI после загрузки
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
        // Обновляем цены при удалении опции
        if (pricesGroup.classList.contains('hidden') === false) updatePricesDropdowns();
    };
    // Обновляем цены при изменении опции
    div.querySelector('input').oninput = () => {
        if (pricesGroup.classList.contains('hidden') === false) updatePricesDropdowns();
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
        // Обновляем цены при удалении цвета
        if (pricesGroup.classList.contains('hidden') === false) updatePricesDropdowns();
    };
    // Обновляем цены при изменении цвета
    div.querySelector('input[type="text"]').oninput = () => {
        if (pricesGroup.classList.contains('hidden') === false) updatePricesDropdowns();
    };
    return div;
}

/**
 * Создает ряд для цены с выпадающими списками.
 * @param {string} optName - Выбранное название опции (фасад/материал).
 * @param {string} colorName - Выбранное название цвета.
 * @param {string|number} price - Цена.
 */
function createPriceRow(optName = "", colorName = "", price = "") {
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

    // 2. Выбор Цвета (если не "Диван" или "Кресло")
    let colorSelect;
    if (pricesGroup.classList.contains('hidden') === false) {
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
 * Обновляет выпадающие списки в существующих рядах цен после изменения опций/цветов.
 */
function updatePricesDropdowns() {
    const currentPrices = Array.from(pricesContainer.children).map(div => {
        const selects = div.querySelectorAll('select');
        return {
            opt: selects[0].value,
            color: selects.length > 1 ? selects[1].value : '',
            price: div.querySelector('input[type="number"]').value
        };
    });

    pricesContainer.innerHTML = '';
    
    currentPrices.forEach(p => {
        pricesContainer.appendChild(createPriceRow(p.opt, p.color, p.price));
    });
}

// --- Привязка кнопок (ИСПРАВЛЕНО И ОБНОВЛЕНО) ---
addImageBtn.addEventListener('click', () => imagesContainer.appendChild(createImageRow()));
addFacadeOrMaterialBtn.addEventListener('click', () => {
    facadeOrMaterialContainer.appendChild(createFacadeOrMaterialRow());
    updatePricesDropdowns();
});
addColorBtn.addEventListener('click', () => {
    colorsContainer.appendChild(createColorRow());
    updatePricesDropdowns();
});
addPriceBtn.addEventListener('click', () => pricesContainer.appendChild(createPriceRow()));


// --- Загрузка существующих товаров ---
async function loadOffers() {
    offersList.innerHTML = "<p class='text-gray-500'>Загрузка...</p>";
    // Используем 'offers' как в ваших security rules, подразумевая путь /offers/{offerId} или /artifacts/{appId}/public/data/offers/{offerId}
    // Если используется путь artifacts, замените 'offers' на `artifacts/${__app_id}/public/data/offers`
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
                 // Замена confirm() на window.confirm()
                if (window.confirm(`Удалить товар "${data.title}"?`)) { 
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
                itemTypeSelect.value = offer.itemType || "Все"; // НОВОЕ ПОЛЕ
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
                // Важно: нужно убедиться, что все опции/цвета загружены, прежде чем создавать select'ы для цен
                updatePricesDropdowns(); 
                // Теперь добавляем цены (опции/цвета в select'ах должны совпадать с сохраненными)
                (offer.prices || []).forEach(p => pricesContainer.appendChild(createPriceRow(p.option, p.color, p.price)));

                document.getElementById('save-btn').textContent = "Обновить товар";
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            offersList.appendChild(div);
        });
    } catch (err) {
        console.error("Ошибка загрузки товаров:", err);
        offersList.innerHTML = '<p class="text-red-500">Ошибка загрузки товаров.</p>';
    }
}


// --- form submit (create/update) ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('save-btn').textContent = "Сохранение...";

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
    }).filter(p => p.option); // Убеждаемся, что есть хотя бы опция

    const docData = {
        title: document.getElementById('title').value.trim(),
        itemType: itemTypeSelect.value, // НОВОЕ ПОЛЕ
        category: document.getElementById('category').value,
        discount: Number(document.getElementById('discount').value) || 0,
        description: document.getElementById('description').value.trim(),
        images: Array.from(imagesContainer.querySelectorAll('input[type="url"]')).map(i => i.value.trim()).filter(Boolean),
        
        // Опции и цены
        options: optionsArray, // Фасады/Материалы
        colors: colorsData,    // Цвета
        prices: pricesData,    // Комбинации цен
        
        updatedAt: serverTimestamp()
    };
    
    // Путь к коллекции (см. loadOffers)
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

        statusMessage.className = "status-success text-center py-2 rounded-lg font-medium";
        statusMessage.classList.remove('hidden');

        form.reset();
        document.getElementById('save-btn').textContent = "Сохранить товар";
        updateUIBasedOnType(); // Очистка и инициализация полей

        await loadOffers();
    } catch (err) {
        console.error("Ошибка сохранения:", err);
        statusMessage.textContent = '❌ Ошибка: ' + err.message;
        statusMessage.className = "status-error text-center py-2 rounded-lg font-medium";
        statusMessage.classList.remove('hidden');
        document.getElementById('save-btn').textContent = "Сохранить товар";
    }
});

// --- Выход из аккаунта ---
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    // В среде Canvas это может не сработать, но мы оставляем для полноты
    window.location.href = '/'; 
});

// --- Инициализация (на случай, если Auth завершится позже) ---
// Если itemTypeSelect не был обработан Auth, обрабатываем его здесь
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateUIBasedOnType);
} else {
    updateUIBasedOnType();
}
