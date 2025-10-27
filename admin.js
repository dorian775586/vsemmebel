// -------------------- ЧАСТЬ 1: ИНИЦИАЛИЗАЦИЯ --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// -------------------- DOM ЭЛЕМЕНТЫ --------------------
const adminPanel = document.getElementById('adminPanel');
const accessDenied = document.getElementById('accessDenied');
const form = document.getElementById('addOfferForm');
const statusMessage = document.getElementById('statusMessage');
const logoutBtn = document.getElementById('logoutBtn');
const offersList = document.getElementById('offers-list');

const imagesContainer = document.getElementById('images-container');
const facadesContainer = document.getElementById('facades-container');
const colorsContainer = document.getElementById('colors-container');
const pricesContainer = document.getElementById('prices-container');

const addImageBtn = document.getElementById('add-image-btn');
const addFacadeBtn = document.getElementById('add-facade-btn');
const addColorBtn = document.getElementById('add-color-btn');
const addPriceBtn = document.getElementById('add-price-btn');
const generatePairsBtn = document.getElementById('generate-pairs-btn');

let editingId = null;

// -------------------- АВТОРИЗАЦИЯ --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    accessDenied.classList.remove('hidden');
    adminPanel.classList.add('hidden');
    return;
  }
  adminPanel.classList.remove('hidden');
  accessDenied.classList.add('hidden');
  await loadOffers();
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/';
});

// -------------------- ДИНАМИЧЕСКИЕ ПОЛЯ --------------------
function createImageRow(value="") {
  const div=document.createElement('div'); div.className="flex gap-2 mb-2";
  const input=document.createElement('input'); input.type="url"; input.placeholder="URL изображения";
  input.className="w-full p-2 border rounded"; input.required=true; input.value=value;
  const del=document.createElement('button'); del.type="button"; del.className="bg-red-500 text-white px-3 rounded";
  del.textContent="Удалить"; del.onclick=()=>div.remove();
  div.append(input, del); return div;
}

function createFacadeRow(value="") {
  const div=document.createElement('div'); div.className="flex gap-2 mb-2";
  const input=document.createElement('input'); input.type="text"; input.placeholder="Название фасада";
  input.className="w-full p-2 border rounded"; input.required=true; input.value=value;
  const del=document.createElement('button'); del.type="button"; del.className="bg-red-500 text-white px-3 rounded";
  del.textContent="Удалить"; del.onclick=()=>div.remove();
  div.append(input, del); return div;
}

function createColorRow(name="", hex="#ffffff") {
  const div=document.createElement('div'); div.className="flex items-center gap-2 mb-2";
  const inputName=document.createElement('input'); inputName.type="text"; inputName.placeholder="Название цвета";
  inputName.className="p-2 border rounded w-1/2"; inputName.required=true; inputName.value=name;
  const inputColor=document.createElement('input'); inputColor.type="color"; inputColor.className="w-10 h-10 border rounded"; inputColor.value=hex;
  const del=document.createElement('button'); del.type="button"; del.className="bg-red-500 text-white px-3 rounded";
  del.textContent="Удалить"; del.onclick=()=>div.remove();
  div.append(inputName, inputColor, del); return div;
}

function createPriceRow(facade="", color="", price="") {
  const div=document.createElement('div'); div.className="flex gap-2 mb-2";
  const inFacade=document.createElement('input'); inFacade.type="text"; inFacade.placeholder="Фасад";
  inFacade.className="p-2 border rounded w-1/3"; 
  inFacade.required = (categorySelect.value==="Кухня"); 
  inFacade.value=facade;
  const inColor=document.createElement('input'); inColor.type="text"; inColor.placeholder="Цвет"; inColor.className="p-2 border rounded w-1/3"; inColor.required=true; inColor.value=color;
  const inPrice=document.createElement('input'); inPrice.type="number"; inPrice.placeholder="Цена"; inPrice.className="p-2 border rounded w-1/3"; inPrice.required=true; inPrice.value=price;
  const del=document.createElement('button'); del.type="button"; del.className="bg-red-500 text-white px-3 rounded"; del.textContent="Удалить"; del.onclick=()=>div.remove();
  div.append(inFacade, inColor, inPrice, del); return div;
}

addImageBtn.addEventListener('click', ()=>imagesContainer.appendChild(createImageRow()));
addFacadeBtn.addEventListener('click', ()=>facadesContainer.appendChild(createFacadeRow()));
addColorBtn.addEventListener('click', ()=>colorsContainer.appendChild(createColorRow()));
addPriceBtn.addEventListener('click', ()=>pricesContainer.appendChild(createPriceRow()));

// --- стартовые пустые строки ---
imagesContainer.appendChild(createImageRow());
facadesContainer.appendChild(createFacadeRow());
colorsContainer.appendChild(createColorRow());
pricesContainer.appendChild(createPriceRow());

// -------------------- ЗАГРУЗКА ТОВАРОВ --------------------
async function loadOffers() {
  offersList.innerHTML="<p class='text-gray-500'>Загрузка...</p>";
  try {
    const qSnap=await getDocs(collection(db,'offers'));
    offersList.innerHTML="";
    qSnap.forEach(docSnap=>{
      const data=docSnap.data();
      const div=document.createElement('div');
      div.className="border p-4 rounded flex justify-between items-center";
      div.innerHTML=`<div>
          <p class="font-semibold">${data.title||'(без названия)'}</p>
          <p class="text-sm text-gray-500">${data.category||'-'}</p>
        </div>
        <div class="flex gap-2">
          <button class="edit-btn bg-blue-500 text-white px-3 py-1 rounded">Редактировать</button>
          <button class="del-btn bg-red-500 text-white px-3 py-1 rounded">Удалить</button>
        </div>`;
      const editBtn=div.querySelector('.edit-btn'); const delBtn=div.querySelector('.del-btn');
      delBtn.onclick=async()=>{ if(!confirm(`Удалить товар "${data.title}"?`)) return; await deleteDoc(doc(db,'offers',docSnap.id)); await loadOffers(); };
      editBtn.onclick=async()=>{
        editingId=docSnap.id;
        const snap=await getDoc(doc(db,'offers',editingId));
        if(!snap.exists()) return alert('Документ не найден');
        const offer=snap.data();
        document.getElementById('title').value=offer.title||"";
        document.getElementById('category').value=offer.category||"Все";
        document.getElementById('discount').value=offer.discount||0;
        document.getElementById('description').value=offer.description||"";
        imagesContainer.innerHTML=""; (offer.images||[]).forEach(url=>imagesContainer.appendChild(createImageRow(url)));
        facadesContainer.innerHTML=""; (offer.facades||[]).forEach(f=>facadesContainer.appendChild(createFacadeRow(f)));
        colorsContainer.innerHTML=""; (offer.colors||[]).forEach(c=>colorsContainer.appendChild(createColorRow(c.name,c.hex||'#ffffff')));
        pricesContainer.innerHTML=""; (offer.prices||[]).forEach(p=>pricesContainer.appendChild(createPriceRow(p.facade,p.color,p.price)));
        window.scrollTo({top:0,behavior:'smooth'});
      };
      offersList.appendChild(div);
    });
    if(qSnap.empty) offersList.innerHTML="<p class='text-gray-500'>Нет товаров</p>";
  } catch(err){ console.error(err); offersList.innerHTML='<p class="text-red-500">Ошибка загрузки</p>'; }
}

// -------------------- КОМНАТЫ, КАТЕГОРИИ, ПОДКАТЕГОРИИ --------------------
const roomsContainer=document.createElement('div'); roomsContainer.className="space-y-4 mb-6";
document.getElementById('adminPanel').prepend(roomsContainer);

const defaultRooms = [
  {name:"Гостиная", categories:[
    {name:"Диваны", subcategories:["Прямой","Угловой","П-образный"]},
    {name:"Столы", subcategories:["Журнальный","Обеденный"]}
  ]},
  {name:"Спальня", categories:[
    {name:"Кровати", subcategories:["Односпальная","Двуспальная"]},
    {name:"Шкафы", subcategories:["Встроенный","Отдельно стоящий"]},
  ]},
  {name:"Детская", categories:[{name:"Кровати", subcategories:["Детская","Подростковая"]}]},
  {name:"Ванна", categories:[{name:"Шкафчики", subcategories:["Под раковину","Навесные"]}]},
  {name:"Прихожая", categories:[{name:"Прихожие", subcategories:["Компактные","Большие"]}]},
  {name:"Балкон", categories:[{name:"Мебель", subcategories:["Складная","Стационарная"]}]}
];


async function loadRooms() {
  roomsContainer.innerHTML="<p class='text-gray-500'>Загрузка комнат...</p>";
  roomsContainer.innerHTML="";
  defaultRooms.forEach(room=>{
    const roomDiv=document.createElement('div'); roomDiv.className="border p-4 rounded bg-gray-50";
    const roomTitle=document.createElement('h3'); roomTitle.className="font-bold text-lg mb-2"; roomTitle.textContent=room.name;
    const catContainer=document.createElement('ul'); catContainer.className="ml-4 list-disc";
    (room.categories||[]).forEach(cat=>{
      const catLi=document.createElement('li'); catLi.textContent=cat.name;
      const subUl=document.createElement('ul'); subUl.className="ml-4 list-circle";
      (cat.subcategories||[]).forEach(sub=>{
        const subLi=document.createElement('li'); subLi.textContent=sub; subUl.appendChild(subLi);
      });
      catLi.appendChild(subUl); catContainer.appendChild(catLi);
    });
    roomDiv.appendChild(roomTitle); roomDiv.appendChild(catContainer); roomsContainer.appendChild(roomDiv);
  });
}

// -------------------- ВЫБОР КОМНАТ, КАТЕГОРИЙ, ПОДКАТЕГОРИЙ --------------------
const roomSelect=document.createElement('select'); 
const categorySelect=document.createElement('select'); 
const subcategorySelect=document.createElement('select');
roomSelect.className=categorySelect.className=subcategorySelect.className="w-full p-2 border rounded mb-2";
form.prepend(subcategorySelect); form.prepend(categorySelect); form.prepend(roomSelect);

function loadRoomOptions() {
  roomSelect.innerHTML="<option value=''>Выберите комнату</option>";
  categorySelect.innerHTML="<option value=''>Выберите категорию</option>";
  subcategorySelect.innerHTML="<option value=''>Выберите подкатегорию</option>";
  defaultRooms.forEach((room,i)=>{
    const opt=document.createElement('option'); opt.value=i; opt.textContent=room.name; roomSelect.appendChild(opt);
  });
}

roomSelect.addEventListener('change',()=>{
  categorySelect.innerHTML="<option value=''>Выберите категорию</option>";
  subcategorySelect.innerHTML="<option value=''>Выберите подкатегорию</option>";
  const room=defaultRooms[roomSelect.value]; if(!room) return;
  (room.categories||[]).forEach(cat=>{
    const opt=document.createElement('option'); opt.value=cat.name; opt.textContent=cat.name; categorySelect.appendChild(opt);
  });
});

categorySelect.addEventListener('change',()=>{
  subcategorySelect.innerHTML="<option value=''>Выберите подкатегорию</option>";
  const room=defaultRooms[roomSelect.value]; if(!room) return;
  const cat=(room.categories||[]).find(c=>c.name===categorySelect.value);
  (cat?.subcategories||[]).forEach(sub=>{
    const opt=document.createElement('option'); opt.value=sub; opt.textContent=sub; subcategorySelect.appendChild(opt);
  });
});

// -------------------- ГЕНЕРАЦИЯ ЦЕН --------------------
function generateAllPricePairs(){
  const facades = Array.from(facadesContainer.querySelectorAll('input[type="text"]')).map(i=>i.value.trim()).filter(Boolean);
  const colors = Array.from(colorsContainer.children).map(div=>({
    name: div.querySelector('input[type="text"]').value.trim(),
    hex: div.querySelector('input[type="color"]').value
  })).filter(c=>c.name);
  pricesContainer.innerHTML="";
  if(facades.length===0){ colors.forEach(c=>pricesContainer.appendChild(createPriceRow("",c.name,""))); }
  else{ facades.forEach(f=>{ colors.forEach(c=>pricesContainer.appendChild(createPriceRow(f,c.name,""))); }); }
}
generatePairsBtn.addEventListener('click', generateAllPricePairs);

// -------------------- ИНИЦИАЛИЗАЦИЯ --------------------
loadRooms(); loadRoomOptions(); loadOffers();
