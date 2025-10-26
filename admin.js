import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Конфиг Firebase ---
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

const imagesContainer = document.getElementById('images-container');
const facadesContainer = document.getElementById('facades-container');
const colorsContainer = document.getElementById('colors-container');
const pricesContainer = document.getElementById('prices-container');
const offersList = document.getElementById('offers-list');

let editingId = null;

// --- Авторизация ---
onAuthStateChanged(auth, async (user) => {
  if (!user) { accessDenied?.classList.remove('hidden'); adminPanel?.classList.add('hidden'); return; }

  try {
    const token = await user.getIdTokenResult();
    const isAdmin = token.claims?.admin || user.email === 'admin@example.com';
    if (!isAdmin) { accessDenied?.classList.remove('hidden'); adminPanel?.classList.add('hidden'); await signOut(auth); return; }

    adminPanel?.classList.remove('hidden');
    accessDenied?.classList.add('hidden');
    loadOffersList();

  } catch(err) { console.error(err); accessDenied?.classList.remove('hidden'); adminPanel?.classList.add('hidden'); }
});

// --- Динамические поля ---
function addImageField(value="") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";
  div.innerHTML = `<input type="url" placeholder="URL изображения" class="w-full p-2 border rounded" value="${value}" required>
                   <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>`;
  div.querySelector('button').onclick = () => div.remove();
  imagesContainer.appendChild(div);
}

function addFacadeField(value="") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";
  div.innerHTML = `<input type="text" placeholder="Название фасада" class="w-full p-2 border rounded" value="${value}" required>
                   <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>`;
  div.querySelector('button').onclick = () => div.remove();
  facadesContainer.appendChild(div);
}

function addColorField(name="", hex="#ffffff") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2 items-center";
  div.innerHTML = `<input type="text" placeholder="Название цвета" class="p-2 border rounded" value="${name}" required>
                   <div style="width:30px;height:30px;background-color:${hex};border:1px solid #ccc;"></div>
                   <input type="color" class="w-10 h-10 border-none" value="${hex}">
                   <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>`;
  const colorInput = div.querySelector('input[type="color"]');
  colorInput.oninput = () => div.querySelector('div').style.backgroundColor = colorInput.value;
  div.querySelector('button').onclick = () => div.remove();
  colorsContainer.appendChild(div);
}

function addPriceField(facade="", color="", price="") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2 items-center";
  div.innerHTML = `<select class="p-2 border rounded facade-select" required></select>
                   <select class="p-2 border rounded color-select" required></select>
                   <input type="number" placeholder="Цена" class="p-2 border rounded" value="${price}" required>
                   <button type="button" class="bg-red-500 text-white px-3 rounded">Удалить</button>`;
  const facadeSelect = div.querySelector('.facade-select');
  const colorSelect = div.querySelector('.color-select');

  updatePriceSelects(facadeSelect, colorSelect, facade, color);
  div.querySelector('button').onclick = () => div.remove();
  pricesContainer.appendChild(div);
}

function updatePriceSelects(facadeSelect, colorSelect, selectedFacade, selectedColor) {
  facadeSelect.innerHTML = "";
  facadesContainer.querySelectorAll('input[type="text"]').forEach(input=>{
    const opt=document.createElement('option'); opt.value=opt.textContent=input.value; if(input.value===selectedFacade) opt.selected=true;
    facadeSelect.appendChild(opt);
  });

  colorSelect.innerHTML="";
  colorsContainer.querySelectorAll('input[type="text"]').forEach(input=>{
    const opt=document.createElement('option'); opt.value=opt.textContent=input.value; if(input.value===selectedColor) opt.selected=true;
    colorSelect.appendChild(opt);
  });
}

// --- Форма ---
async function submitForm() {
  const offer = {
    title: document.getElementById('title').value.trim(),
    category: document.getElementById('category').value,
    discount: Number(document.getElementById('discount').value),
    description: document.getElementById('description').value.trim(),
    images: Array.from(imagesContainer.querySelectorAll('input[type="url"]')).map(i=>i.value.trim()),
    facades: Array.from(facadesContainer.querySelectorAll('input[type="text"]')).map(i=>i.value.trim()),
    colors: Array.from(colorsContainer.querySelectorAll('div')).map(div=>({name:div.querySelector('input[type="text"]').value.trim(),hex:div.querySelector('input[type="color"]').value})),
    prices: Array.from(pricesContainer.querySelectorAll('div')).map(div=>({facade:div.querySelector('.facade-select').value,color:div.querySelector('.color-select').value,price:Number(div.querySelector('input[type="number"]').value)})),
    updatedAt: serverTimestamp()
  };

  try {
    if(editingId) {
      await updateDoc(doc(db,'offers',editingId),offer);
      statusMessage.textContent='✅ Товар обновлён!';
    } else {
      await addDoc(collection(db,'offers'),offer);
      statusMessage.textContent='✅ Товар добавлен!';
    }
    statusMessage.className='status-success text-center py-2 rounded-lg font-medium';
    statusMessage.classList.remove('hidden');
    form.reset(); imagesContainer.innerHTML=""; facadesContainer.innerHTML=""; colorsContainer.innerHTML=""; pricesContainer.innerHTML="";
    editingId=null; loadOffersList();
  } catch(err){ console.error(err); statusMessage.textContent='❌ Ошибка: '+err.message; statusMessage.className='status-error text-center py-2 rounded-lg font-medium'; statusMessage.classList.remove('hidden'); }
}

form.onsubmit=(e)=>{e.preventDefault(); submitForm();};

// --- Загрузка существующих ---
async function loadOffersList() {
  offersList.innerHTML="";
  const snapshot=await getDocs(collection(db,'offers'));
  snapshot.forEach(docSnap=>{
    const data=docSnap.data();
    const div=document.createElement('div');
    div.className="p-2 border-b flex justify-between items-center";
    div.innerHTML=`<span>${data.title} (${data.category})</span><button class="bg-blue-500 text-white px-3 rounded">Редактировать</button>`;
    div.querySelector('button').onclick=()=>editOffer(docSnap.id,data);
    offersList.appendChild(div);
  });
}

// --- Редактирование ---
function editOffer(id,data){
  editingId=id;
  document.getElementById('title').value=data.title||"";
  document.getElementById('category').value=data.category||"Все";
  document.getElementById('discount').value=data.discount||0;
  document.getElementById('description').value=data.description||"";

  imagesContainer.innerHTML=""; (data.images||[]).forEach(img=>addImageField(img));
  facadesContainer.innerHTML=""; (data.facades||[]).forEach(f=>addFacadeField(f));
  colorsContainer.innerHTML=""; (data.colors||[]).forEach(c=>addColorField(c.name,c.hex));
  pricesContainer.innerHTML=""; (data.prices||[]).forEach(p=>addPriceField(p.facade,p.color,p.price));
}

// --- Выход ---
logoutBtn.addEventListener('click',async()=>{await signOut(auth); window.location.href='/';});

// --- Инициализация ---
addImageField(); addFacadeField(); addColorField(); addPriceField();
