// -------------------- ЧАСТЬ 1: ИНИЦИАЛИЗАЦИЯ --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase config ---
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

// -------------------- ЧАСТЬ 1: DOM ЭЛЕМЕНТЫ --------------------
const adminPanel = document.getElementById('adminPanel');
const accessDenied = document.getElementById('accessDenied');

const form = document.getElementById('addOfferForm');
const statusMessage = document.getElementById('statusMessage');
const logoutBtn = document.getElementById('logoutBtn');
const offersList = document.getElementById('offers-list');

const imagesContainer = document.getElementById('images-container');
const facadesContainer = document.getElementById('facades-container');
const colorsContainer = document.getElementById('colors-container');
const materialsContainer = document.getElementById('materials-container');
const pricesContainer = document.getElementById('prices-container');

const addImageBtn = document.getElementById('add-image-btn');
const addFacadeBtn = document.getElementById('add-facade-btn');
const addColorBtn = document.getElementById('add-color-btn');
const addMaterialBtn = document.getElementById('add-material-btn');
const addPriceBtn = document.getElementById('add-price-btn');
const generatePairsBtn = document.getElementById('generate-pairs-btn');

const discountCheckbox = document.getElementById('discount-checkbox');
const discountInput = document.getElementById('discount');

let editingId = null;

// -------------------- ЧАСТЬ 1: АВТОРИЗАЦИЯ --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    accessDenied.classList.remove('hidden');
    adminPanel.classList.add('hidden');
    return;
  }
  adminPanel.classList.remove('hidden');
  accessDenied.classList.add('hidden');
  await loadRooms();
  await loadRoomOptions();
  await loadOffers();
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/';
});

// -------------------- ЧАСТЬ 2: ДИНАМИЧЕСКИЕ ПОЛЯ --------------------
function createImageRow(value="") {
  const div = document.createElement('div');
  div.className="flex gap-2 mb-2";
  const input=document.createElement('input');
  input.type="url"; input.placeholder="URL изображения"; input.className="w-full p-2 border rounded"; input.required=true; input.value=value;
  const del=document.createElement('button'); del.type="button"; del.className="bg-red-500 text-white px-3 rounded"; del.textContent="Удалить"; del.onclick=()=>div.remove();
  div.append(input,del); return div;
}

// -------------------- ЧАСТЬ 2: ФАСАДЫ, ЦВЕТА, МАТЕРИАЛЫ --------------------
let facadesList = [];
let colorsList = [];
let materialsList = [];

// Добавление фасада вручную
addFacadeBtn.addEventListener('click', ()=>{
  const val = prompt("Введите название фасада");
  if(!val) return;
  facadesList.push(val);
  updateSelectors();
});

// Добавление цвета вручную
addColorBtn.addEventListener('click', ()=>{
  const name = prompt("Название цвета");
  const hex = prompt("HEX цвет, например #ff0000") || "#ffffff";
  if(!name) return;
  colorsList.push({name, hex});
  updateSelectors();
});

// Добавление материала вручную
addMaterialBtn.addEventListener('click', ()=>{
  const val = prompt("Введите материал");
  if(!val) return;
  materialsList.push(val);
  updateSelectors();
});

// -------------------- СОЗДАНИЕ СТРОК ДЛЯ ЦЕНЫ --------------------
function createPriceRowDropdown(facade="", color="", material="", price="") {
  const div = document.createElement('div');
  div.className = "flex gap-2 mb-2";

  const facadeSelect = document.createElement('select');
  facadeSelect.className = "p-2 border rounded w-1/4";
  facadesList.forEach(f => { const opt=document.createElement('option'); opt.value=f; opt.textContent=f; if(f===facade) opt.selected=true; facadeSelect.appendChild(opt); });

  const colorSelect = document.createElement('select');
  colorSelect.className = "p-2 border rounded w-1/4";
  colorsList.forEach(c => { const opt=document.createElement('option'); opt.value=c.name; opt.textContent=c.name; if(c.name===color) opt.selected=true; colorSelect.appendChild(opt); });

  const materialSelect = document.createElement('select');
  materialSelect.className = "p-2 border rounded w-1/4";
  materialsList.forEach(m => { const opt=document.createElement('option'); opt.value=m; opt.textContent=m; if(m===material) opt.selected=true; materialSelect.appendChild(opt); });

  const priceInput = document.createElement('input');
  priceInput.type="number"; priceInput.placeholder="Цена"; priceInput.className="p-2 border rounded w-1/4"; priceInput.value = price;

  const del = document.createElement('button'); del.type="button"; del.className="bg-red-500 text-white px-3 rounded"; del.textContent="Удалить"; del.onclick=()=>div.remove();

  div.append(facadeSelect, colorSelect, materialSelect, priceInput, del);
  return div;
}

// -------------------- ОБНОВЛЕНИЕ СЕЛЕКТОРОВ В СТРОКАХ ЦЕН --------------------
function updateSelectors() {
  const priceRows = pricesContainer.querySelectorAll('div');
  priceRows.forEach(row => {
    const [fSelect, cSelect, mSelect] = row.querySelectorAll('select');
    fSelect.innerHTML=""; facadesList.forEach(f=>{ const opt=document.createElement('option'); opt.value=f; opt.textContent=f; fSelect.appendChild(opt); });
    cSelect.innerHTML=""; colorsList.forEach(c=>{ const opt=document.createElement('option'); opt.value=c.name; opt.textContent=c.name; cSelect.appendChild(opt); });
    mSelect.innerHTML=""; materialsList.forEach(m=>{ const opt=document.createElement('option'); opt.value=m; opt.textContent=m; mSelect.appendChild(opt); });
  });
}

// -------------------- КНОПКИ --------------------
addImageBtn.addEventListener('click',()=>imagesContainer.appendChild(createImageRow()));
addPriceBtn.addEventListener('click',()=>pricesContainer.appendChild(createPriceRowDropdown()));
generatePairsBtn.addEventListener('click', ()=>{
  pricesContainer.innerHTML = "";
  facadesList.forEach(facade=>{
    colorsList.forEach(color=>{
      materialsList.forEach(material=>{
        pricesContainer.appendChild(createPriceRowDropdown(facade, color.name, material));
      });
    });
  });
});

// -------------------- СКИДКА С ГАЛОЧКОЙ --------------------
discountCheckbox.addEventListener('change', ()=>{ discountInput.disabled = !discountCheckbox.checked; });

// -------------------- ЧАСТЬ 4: ПРЕДУСТАНОВЛЕННЫЕ КОМНАТЫ --------------------
const roomsContainer = document.createElement('div');
roomsContainer.className="space-y-4 mb-6";
document.getElementById('adminPanel').prepend(roomsContainer);

const defaultRooms = [
  { name:"Гостиная", categories:[{name:"Диваны", subcategories:["Прямой","Угловой","П-образный"]},{name:"Столы", subcategories:["Журнальный","Обеденный"]}] },
  { name:"Спальня", categories:[{name:"Кровати", subcategories:["Двуспальная","Односпальная"]},{name:"Шкафы", subcategories:["Прямой","Угловой"]}] },
  { name:"Детская", categories:[{name:"Кровати", subcategories:["Детская односпальная","Детская двухъярусная"]}] },
  { name:"Ванна", categories:[{name:"Шкафчики", subcategories:["Прямой","Угловой"]}] },
  { name:"Прихожая", categories:[{name:"Шкафы", subcategories:["Прямой","Угловой","П-образный"]}] },
  { name:"Балкон", categories:[{name:"Столы", subcategories:["Прямой","Угловой"]}] }
];

async function initDefaultRooms(){
  const snap = await getDocs(collection(db,'rooms'));
  if(snap.empty){
    for(const r of defaultRooms){
      await addDoc(collection(db,'rooms'),r);
    }
  }
}

async function loadRooms(){
  await initDefaultRooms();
  const roomsSnap = await getDocs(collection(db,'rooms'));
  roomsContainer.innerHTML="";
  roomsSnap.forEach(roomDoc=>{
    const room=roomDoc.data();
    const roomDiv=document.createElement('div');
    roomDiv.className="border p-4 rounded bg-gray-50";
    const roomTitle=document.createElement('h3'); roomTitle.className="font-bold text-lg mb-2"; roomTitle.textContent=room.name;
    const catContainer=document.createElement('div'); catContainer.className="ml-4 space-y-2";
    (room.categories||[]).forEach(cat=>{
      const catDiv=document.createElement('div'); catDiv.className="border-l pl-2";
      const catTitle=document.createElement('p'); catTitle.className="font-semibold"; catTitle.textContent=cat.name;
      const subContainer=document.createElement('div'); subContainer.className="ml-4 space-y-1";
      (cat.subcategories||[]).forEach(sub=>{const subDiv=document.createElement('p'); subDiv.textContent=sub; subContainer.appendChild(subDiv)});
      catDiv.appendChild(catTitle); catDiv.appendChild(subContainer); catContainer.appendChild(catDiv);
    });
    roomDiv.appendChild(roomTitle); roomDiv.appendChild(catContainer); roomsContainer.appendChild(roomDiv);
  });
}

// -------------------- ЧАСТЬ 5: СЕЛЕКТОРЫ --------------------
const roomSelect=document.createElement('select');
const categorySelect=document.createElement('select');
const subcategorySelect=document.createElement('select');
roomSelect.className=categorySelect.className=subcategorySelect.className="w-full p-2 border rounded mb-2";
form.prepend(subcategorySelect);
form.prepend(categorySelect);
form.prepend(roomSelect);

async function loadRoomOptions(){
  roomSelect.innerHTML="<option value=''>Выберите комнату</option>";
  categorySelect.innerHTML="<option value=''>Выберите категорию</option>";
  subcategorySelect.innerHTML="<option value=''>Выберите подкатегорию</option>";
  const roomsSnap=await getDocs(collection(db,'rooms'));
  roomsSnap.forEach(roomDoc=>{
    const opt=document.createElement('option');
    opt.value=roomDoc.id; opt.textContent=roomDoc.data().name;
    roomSelect.appendChild(opt);
  });
}

roomSelect.addEventListener('change', async ()=>{
  categorySelect.innerHTML="<option value=''>Выберите категорию</option>";
  subcategorySelect.innerHTML="<option value=''>Выберите подкатегорию</option>";
  const roomId=roomSelect.value; if(!roomId) return;
  const roomSnap=await getDoc(doc(db,'rooms',roomId));
  if(!roomSnap.exists()) return;
  (roomSnap.data().categories||[]).forEach(cat=>{
    const opt=document.createElement('option'); opt.value=cat.name; opt.textContent=cat.name; categorySelect.appendChild(opt);
  });
});

categorySelect.addEventListener('change', async ()=>{
  subcategorySelect.innerHTML="<option value=''>Выберите подкатегорию</option>";
  const roomId=roomSelect.value; const catName=categorySelect.value; if(!roomId||!catName) return;
  const roomSnap=await getDoc(doc(db,'rooms',roomId));
  if(!roomSnap.exists()) return;
  const cat=(roomSnap.data().categories||[]).find(c=>c.name===catName);
  (cat?.subcategories||[]).forEach(sub=>{
    const opt=document.createElement('option'); opt.value=sub; opt.textContent=sub; subcategorySelect.appendChild(opt);
  });
});

function updateBreadcrumbs(){
  const crumbsContainer=document.getElementById('breadcrumb-container');
  crumbsContainer.innerHTML="";
  const roomText=roomSelect.selectedOptions[0]?.textContent;
  const catText=categorySelect.selectedOptions[0]?.textContent;
  const subText=subcategorySelect.selectedOptions[0]?.textContent;
  [roomText,catText,subText].forEach((text,i)=>{
    if(!text) return;
    const span=document.createElement('span'); span.textContent=text; span.className="mx-1 text-gray-700"; crumbsContainer.appendChild(span);
    if(i<2 && [roomText,catText,subText][i+1]){
      const sep=document.createElement('span'); sep.textContent="/"; sep.className="mx-1 text-gray-400"; crumbsContainer.appendChild(sep);
    }
  });
}

roomSelect.addEventListener('change', updateBreadcrumbs);
categorySelect.addEventListener('change', updateBreadcrumbs);
subcategorySelect.addEventListener('change', updateBreadcrumbs);

// -------------------- ЧАСТЬ 3 и 6: ЗАГРУЗКА И СОХРАНЕНИЕ ТОВАРОВ --------------------
async function loadOffers(){
  offersList.innerHTML="<p class='text-gray-500'>Загрузка...</p>";
  const qSnap=await getDocs(collection(db,'offers'));
  offersList.innerHTML="";
  qSnap.forEach(docSnap=>{
    const data=docSnap.data();
    const div=document.createElement('div'); div.className="border p-4 rounded flex justify-between items-center";
    div.innerHTML=`<div><p class="font-semibold">${data.title||'(без названия)'}</p><p class="text-sm text-gray-500">${data.category||'-'}</p></div>
    <div class="flex gap-2">
      <button class="edit-btn bg-blue-500 text-white px-3 py-1 rounded">Редактировать</button>
      <button class="del-btn bg-red-500 text-white px-3 py-1 rounded">Удалить</button>
    </div>`;
    const editBtn=div.querySelector('.edit-btn'); const delBtn=div.querySelector('.del-btn');
    delBtn.onclick=async ()=>{if(!confirm(`Удалить товар "${data.title}"?`)) return; await deleteDoc(doc(db,'offers',docSnap.id)); await loadOffers();};
    editBtn.onclick=async ()=>{
      editingId=docSnap.id;
      const snap=await getDoc(doc(db,'offers',editingId));
      if(!snap.exists()) return alert('Документ не найден');
      const offer=snap.data();
      document.getElementById('title').value=offer.title||"";
      discountInput.value=offer.discount||0;
      discountCheckbox.checked = !!offer.discount;
      discountInput.disabled = !discountCheckbox.checked;
      document.getElementById('description').value=offer.description||"";
      roomSelect.value=offer.roomId||""; await roomSelect.dispatchEvent(new Event('change'));
      categorySelect.value=offer.category||""; await categorySelect.dispatchEvent(new Event('change'));
      subcategorySelect.value=offer.subcategory||"";
      imagesContainer.innerHTML=""; (offer.images||[]).forEach(url=>imagesContainer.appendChild(createImageRow(url)));
      facadesList = offer.facades || [];
      colorsList = offer.colors || [];
      materialsList = offer.materials || [];
      updateSelectors();
      pricesContainer.innerHTML="";
      (offer.prices||[]).forEach(p=>pricesContainer.appendChild(createPriceRowDropdown(p.facade,p.color,p.material,p.price)));
      window.scrollTo({top:0,behavior:'smooth'});
    };
    offersList.appendChild(div);
  });
  if(qSnap.empty) offersList.innerHTML="<p class='text-gray-500'>Нет товаров</p>";
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const docData={
    title: document.getElementById('title').value.trim(),
    category: categorySelect.value,
    subcategory: subcategorySelect.value,
    roomId: roomSelect.value,
    discount: discountCheckbox.checked ? Number(discountInput.value)||0 : 0,
    description: document.getElementById('description').value.trim(),
    images: Array.from(imagesContainer.querySelectorAll('input[type="url"]')).map(i=>i.value.trim()).filter(Boolean),
    facades: facadesList,
    colors: colorsList,
    materials: materialsList,
    prices: Array.from(pricesContainer.querySelectorAll('div')).map(div=>{
      const [fSel,cSel,mSel,pInp] = div.querySelectorAll('select, input[type="number"]');
      return {facade:fSel.value, color:cSel.value, material:mSel.value, price:Number(pInp.value)};
    }),
    updatedAt: serverTimestamp()
  };
  try{
    if(editingId){await updateDoc(doc(db,'offers',editingId),docData); statusMessage.textContent='✅ Товар успешно обновлён!'; editingId=null;}
    else{docData.createdAt=serverTimestamp(); await addDoc(collection(db,'offers'),docData); statusMessage.textContent='✅ Новый товар добавлен!';}
    statusMessage.className="status-success text-center py-2 rounded-lg font-medium"; statusMessage.classList.remove('hidden');
    form.reset();
    imagesContainer.innerHTML=""; facadesContainer.innerHTML=""; colorsContainer.innerHTML=""; materialsContainer.innerHTML=""; pricesContainer.innerHTML="";
    imagesContainer.appendChild(createImageRow());
    pricesContainer.appendChild(createPriceRowDropdown());
    roomSelect.value=""; categorySelect.innerHTML="<option value=''>Выберите категорию</option>"; subcategorySelect.innerHTML="<option value=''>Выберите подкатегорию</option>";
    facadesList=[]; colorsList=[]; materialsList=[];
    await loadOffers();
  }catch(err){console.error(err); statusMessage.textContent='❌ Ошибка: '+err.message; statusMessage.className="status-error text-center py-2 rounded-lg font-medium"; statusMessage.classList.remove('hidden');}
});
