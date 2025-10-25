import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- КОНФИГУРАЦИЯ FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyA-LeQHKV4NfJrTKQCGjG-VQGhfWxtPk70",
    authDomain: "vsemmebel-90d48.firebaseapp.com",
    projectId: "vsemmebel-90d48",
    storageBucket: "vsemmebel-90d48.firebasestorage.app",
    messagingSenderId: "958123504041",
    appId: "1:958123504041:web:1f14f4561d6bb6628494b8"
};
const appId = "default-app-id";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const form = document.getElementById('addOfferForm');
const statusMessage = document.getElementById('statusMessage');
const submitButton = document.getElementById('submitButton');

// Аутентификация анонимно
signInAnonymously(auth).then(() => {
    console.log("Firebase authenticated anonymously.");
}).catch(err => {
    console.error("Firebase auth error:", err);
    statusMessage.textContent = `Ошибка аутентификации: ${err.message}`;
    statusMessage.className = 'status-error py-2 px-4 rounded-lg font-medium';
    statusMessage.classList.remove('hidden');
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!db) {
        statusMessage.textContent = "Ошибка: База данных не инициализирована.";
        statusMessage.className = 'status-error py-2 px-4 rounded-lg font-medium';
        statusMessage.classList.remove('hidden');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Добавление...';
    statusMessage.classList.add('hidden');

    try {
        const newOffer = {
            title: document.getElementById('title').value,
            discount: Number(document.getElementById('discount').value),
            image: document.getElementById('image').value,
            category: document.getElementById('category').value,
            createdAt: serverTimestamp()
        };

        const offersCollectionRef = collection(db, `artifacts/${appId}/public/data/offers`);
        await addDoc(offersCollectionRef, newOffer);

        statusMessage.textContent = '✅ Предложение успешно добавлено!';
        statusMessage.className = 'status-success py-2 px-4 rounded-lg font-medium';
        form.reset();

    } catch (error) {
        console.error('Ошибка добавления документа:', error);
        statusMessage.textContent = `❌ Ошибка: ${error.message}`;
        statusMessage.className = 'status-error py-2 px-4 rounded-lg font-medium';
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Добавить предложение';
        statusMessage.classList.remove('hidden');
    }
});
