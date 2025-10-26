import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA-LeQHKV4NfJrTKQCGjG-VQGhfWxtPk70",
  authDomain: "vsemmebel-90d48.firebaseapp.com",
  projectId: "vsemmebel-90d48",
  storageBucket: "vsemmebel-90d48.firebasestorage.app",
  messagingSenderId: "958123504041",
  appId: "1:958123504041:web:1f14f4561d6bb6628494b8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Получаем ID товара из URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

if (!productId) {
  alert("Не указан ID товара!");
} else {
  loadProduct(productId);
}

async function loadProduct(id) {
  try {
    const docRef = doc(db, "offers", id); // Берём из коллекции offers
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      alert("Товар не найден!");
      return;
    }

    const product = docSnap.data();

    // Обновляем DOM
    document.getElementById("product-title").textContent = product.title || "Без названия";
    document.getElementById("breadcrumb-title").textContent = product.title || "Без названия";
    document.getElementById("product-category").textContent = product.category || "-";

    const oldPriceElement = document.getElementById("old-price");
    const newPriceElement = document.getElementById("new-price");
    const price = product.price || 1000;

    oldPriceElement.textContent = formatPrice(price);
    newPriceElement.textContent = formatPrice(Math.round(price * (1 - (product.discount || 0)/100)));

    document.getElementById("selected-facade").textContent = product.facade || "-";
    document.getElementById("selected-color").textContent = product.color || "-";
    document.getElementById("main-product-image").src = product.image || "https://placehold.co/400x400?text=No+Image";

    // Галерея миниатюр
    const thumbnailGallery = document.getElementById("thumbnail-gallery");
    thumbnailGallery.innerHTML = "";
    (product.images || [product.image]).forEach((img, index) => {
      const thumb = document.createElement("img");
      thumb.src = img;
      thumb.className = "w-full aspect-square object-cover rounded-xl border-4 cursor-pointer transition";
      if(index === 0) thumb.classList.add("border-orange-500", "shadow-md");
      thumb.onclick = () => changeMainImage(img, thumbnailGallery, index);
      thumbnailGallery.appendChild(thumb);
    });

    // Фасады
    const facadeOptions = document.getElementById("facade-options");
    facadeOptions.innerHTML = "";
    (product.facades || []).forEach(f => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = f;
      btn.className = `option-button-style px-5 py-2.5 rounded-full text-sm`;
      if(f === product.facade) btn.classList.add("active");
      btn.onclick = () => selectFacade(btn, f);
      facadeOptions.appendChild(btn);
    });

    // Цвета
    const colorOptions = document.getElementById("color-options");
    colorOptions.innerHTML = "";
    (product.colors || []).forEach(c => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = c.name;
      btn.setAttribute("data-image", c.image);
      btn.className = "option-button-style px-5 py-2.5 rounded-full text-sm";
      if(c.name === product.color) btn.classList.add("active");
      btn.onclick = () => selectColor(btn, c.name, c.image);
      colorOptions.appendChild(btn);
    });

  } catch (error) {
    console.error("Ошибка загрузки товара:", error);
  }
}

// Функции смены изображений и опций
function changeMainImage(src, gallery, activeIndex) {
  document.getElementById("main-product-image").src = src;
  gallery.querySelectorAll("img").forEach((img, idx) => {
    img.classList.remove("border-orange-500", "shadow-md");
    img.classList.add("border-transparent");
    if(idx === activeIndex) img.classList.add("border-orange-500", "shadow-md");
  });
}

function selectFacade(button, facadeName) {
  document.querySelectorAll('#facade-options .option-button-style').forEach(btn => btn.classList.remove("active"));
  button.classList.add("active");
  document.getElementById("selected-facade").textContent = facadeName;
}

function selectColor(button, colorName, imageSrc) {
  document.querySelectorAll('#color-options .option-button-style').forEach(btn => btn.classList.remove("active"));
  button.classList.add("active");
  document.getElementById("selected-color").textContent = colorName;
  document.getElementById("main-product-image").src = imageSrc;
}

// Формат цены
function formatPrice(price) {
  return price.toLocaleString('ru-RU', { style: 'currency', currency: 'BYN', maximumFractionDigits: 0 });
}
