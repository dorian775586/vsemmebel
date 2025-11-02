// === CART & FAVORITES SYSTEM ===

// Ключи для localStorage
const CART_KEY = "mebel_cart";
const FAVORITES_KEY = "mebel_favorites";

// === КОРЗИНА ===

// Получить корзину
export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

// Сохранить корзину
export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// Добавить товар в корзину
export function addToCart(productId, productTitle, options, price, image, shopId) {
  let cart = getCart();
  const existing = cart.find(
    item =>
      item.id === productId &&
      JSON.stringify(item.options) === JSON.stringify(options)
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: productId,
      title: productTitle,
      options,
      price,
      image,
      shopId, // вот это нужно добавить
      quantity: 1,
      addedAt: Date.now()
    });
  }

  saveCart(cart);
}

// Удалить товар из корзины
export function removeFromCart(productId, options) {
  let cart = getCart().filter(
    item =>
      !(item.id === productId &&
        JSON.stringify(item.options) === JSON.stringify(options))
  );
  saveCart(cart);
}

// Очистить корзину
export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

// Получить общую сумму корзины
export function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// === ИЗБРАННОЕ ===

export function getFavorites() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
}

export function saveFavorites(favs) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

export function toggleFavorite(productId) {
  let favs = getFavorites();
  if (favs.includes(productId)) {
    favs = favs.filter(id => id !== productId);
  } else {
    favs.push(productId);
  }
  saveFavorites(favs);
  return favs.includes(productId);
}

export function isFavorite(productId) {
  return getFavorites().includes(productId);
}
