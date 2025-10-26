// purchase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// ====== 1. Настройка Firebase ======
const firebaseConfig = {
    apiKey: "ВАШ_API_KEY",
    authDomain: "ВАШ_PROJECT_ID.firebaseapp.com",
    projectId: "ВАШ_PROJECT_ID",
    storageBucket: "ВАШ_PROJECT_ID.appspot.com",
    messagingSenderId: "ВАШ_SENDER_ID",
    appId: "ВАШ_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====== 2. Получение ID товара из URL ======
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
    alert('Товар не найден!');
    throw new Error('Нет ID товара в URL');
}

// ====== 3. Функция форматирования цены ======
function formatPrice(price) {
    return price.toLocaleString('ru-RU', { style: 'currency', currency: 'BYN', maximumFractionDigits: 0 });
}

// ====== 4. Подгрузка данных товара ======
async function loadProduct(id) {
    const docRef = doc(db, "products", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        alert('Товар не найден в базе данных!');
        return;
    }

    const product = docSnap.data();

    // Название и хлебные крошки
    document.getElementById('product-title').textContent = product.title;
    document.getElementById('breadcrumb-title').textContent = product.title;
    document.getElementById('product-category').textContent = product.category;
    document.getElementById('breadcrumb-category').textContent = product.category;

    // Цены
    const oldPriceElem = document.getElementById('old-price');
    const newPriceElem = document.getElementById('new-price');
    const discount = product.discount || 0;
    const oldPrice = product.price;
    const newPrice = Math.round(oldPrice * (1 - discount / 100));

    oldPriceElem.textContent = formatPrice(oldPrice);
    newPriceElem.textContent = formatPrice(newPrice);

    // Мобильная навигация
    const mobilePrice = document.querySelector('.mobile-nav .text-xl');
    const mobileOldPrice = document.querySelector('.mobile-nav .line-through');
    mobilePrice.textContent = formatPrice(newPrice);
    mobileOldPrice.textContent = formatPrice(oldPrice);

    // Фасад и цвет
    document.getElementById('selected-facade').textContent = product.facade;
    document.getElementById('selected-color').textContent = product.color;

    // Главное изображение
    document.getElementById('main-product-image').src = product.mainImage;

    // ====== 5. Подгрузка миниатюр ======
    const thumbContainer = document.getElementById('thumbnail-gallery');
    thumbContainer.innerHTML = '';
    product.images.forEach((img, index) => {
        const thumb = document.createElement('img');
        thumb.src = img;
        thumb.alt = `${product.color} ${index + 1}`;
        thumb.className = `w-full aspect-square object-cover rounded-xl border-4 ${index === 0 ? 'border-orange-500 shadow-md' : 'border-transparent hover:border-orange-500 cursor-pointer transition'}`;
        thumb.onclick = () => changeMainImage(img);
        thumbContainer.appendChild(thumb);
    });

    // ====== 6. Опции фасада ======
    const facadeContainer = document.getElementById('facade-options');
    facadeContainer.innerHTML = '';
    product.facadeOptions.forEach(f => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.textContent = f;
        btn.className = `option-button-style px-5 py-2.5 rounded-full text-sm ${f === product.facade ? 'active' : ''}`;
        btn.onclick = () => selectFacade(btn, f);
        facadeContainer.appendChild(btn);
    });

    // ====== 7. Опции цвета ======
    const colorContainer = document.getElementById('color-options');
    colorContainer.innerHTML = '';
    product.colorOptions.forEach(c => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.textContent = c.name;
        btn.dataset.image = c.image;
        btn.className = `option-button-style px-5 py-2.5 rounded-full text-sm ${c.name === product.color ? 'active' : ''}`;
        btn.onclick = () => selectColor(btn, c.name);
        colorContainer.appendChild(btn);
    });

    // ====== 8. Кнопка Купить ======
    const buyButtons = document.querySelectorAll('button.orange-accent');
    buyButtons.forEach(btn => {
        btn.onclick = () => {
            if (!product.stores || product.stores.length === 0) {
                alert("Информация о магазинах отсутствует");
                return;
            }
            let storeInfo = product.stores.map(s => `🏬 ${s.name}\n📍 ${s.address}\n📞 ${s.phone}`).join('\n\n');
            alert(`Доступно в магазинах:\n\n${storeInfo}`);
        };
    });
}

// ====== 9. Функции смены изображений и опций ======
function changeMainImage(src) {
    document.getElementById('main-product-image').src = src;
    document.querySelectorAll('#thumbnail-gallery img').forEach(img => {
        img.classList.remove('border-orange-500', 'shadow-md');
        img.classList.add('border-transparent');
        if (img.src === src) {
            img.classList.add('border-orange-500', 'shadow-md');
        }
    });
}

function selectFacade(button, facadeName) {
    document.querySelectorAll('#facade-options .option-button-style').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    document.getElementById('selected-facade').textContent = facadeName;
}

function selectColor(button, colorName) {
    document.querySelectorAll('#color-options .option-button-style').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    document.getElementById('selected-color').textContent = colorName;
    changeMainImage(button.dataset.image);
}

// ====== 10. Запуск ======
document.addEventListener('DOMContentLoaded', () => loadProduct(productId));
