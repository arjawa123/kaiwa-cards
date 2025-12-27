const STORAGE_KEY = "kaiwa_progress";

let db = null;          // simpan hasil JSON
let currentTheme = null;
let selectedMode = "free";
let selectedLevel = "N5";
let questions = [];
let index = 0;
let isShuffle = true; // default: ON
let isRandomQ = false;

const banners = [
  "hanko_taihenyokudekimashita.png",
  "onepiece01_luffy.png",
  "onepiece02_zoro_bandana.png",
  "onepiece04_usopp_sogeking.png",
  "onepiece05_sanji.png",
  "onepiece06_chopper.png",
  "onepiece15_lucci.png"
];

document.querySelector(".start-btn").disabled = true;

async function loadTheme(filename) {
  const res = await fetch(`data/${filename}`);
  const data = await res.json();
  return data; // langsung objek tema
}

async function loadAllThemes() {
  const themeFiles = [
    "seikatsu.json", "kaimono.json", 
    "shumi.json", "tabemono.json", 
    "shigoto.json", "ryokou.json",
    "sports.json", "tenki.json",
    "condition.json", "asking_direction.json",
    "at_school.json", "konbini_food.json", "kazoku.json",
    "daily_mix.json", 
    "asking_time.json", "public_transport.json",
    "weekend_plans.json",
    "favorite_food_drinks.json", "market_shopping.json",
    "restaurant_order.json"
  ];
  let allThemes = [];
  for (const filename of themeFiles) {
    const theme = await loadTheme(filename);
    allThemes.push(theme);
  }
  db = { themes: allThemes }; // array semua tema
  
  generateThemeButtons();
  await new Promise(resolve => setTimeout(resolve, 500));
  document.getElementById("loading").classList.add("hidden");
  loadProgress(); // 👈 PENTING
}

window.onload = () => {
  loadAllThemes();
};

function generateThemeButtons() {
  const container = document.getElementById("themeContainer");
  container.innerHTML = "";

  db.themes.forEach(theme => {
    const btn = document.createElement("button");
    btn.innerHTML = theme.name;

    btn.onclick = () => selectTheme(theme.id, btn);

    container.appendChild(btn);
  });
}

function selectTheme(theme, btn) {
  currentTheme = theme;
  document.querySelectorAll(".theme-buttons button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  
  document.querySelector(".start-btn").disabled = false;
}

function selectMode(mode, btn) {
  selectedMode = mode;
  document.querySelectorAll(".mode-buttons button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function startSession() {
  if (!db) {
    alert("Data belum siap, tunggu sebentar...");
    return;
  }
console.log(db)
  selectedLevel = document.querySelector("input[name='level']:checked").value;

  let poolQuestions = [];
  let themeName = "";

  // 🔀 RANDOM Question
  let filtered = []
  if (isRandomQ) {
    
    const allQuestions = db.themes.flatMap(theme =>
      theme.questions.map(q => ({ ...q, themeName: theme.name }))
    );
    
    // 🎚️ FILTER LEVEL
    filtered = 
    selectedLevel === "ALL"
      ? allQuestions
      : allQuestions.filter(q => q.level === selectedLevel);
  
    // shuffle seluruh pertanyaan
    const shuffled = filtered.sort(() => 0.5 - Math.random());
  
    // ambil 'count' pertanyaan pertama
    const poolQuestions = shuffled.slice(0, 20);
    filtered = poolQuestions;
    
    currentTheme = {
      id: "random",
      name: "RANDOM",
      questions: poolQuestions
    };
  }
  // 🎯 NORMAL THEME
  else {
    if (!currentTheme) {
      alert("Pilih tema dulu");
      return;
    }

    currentTheme = db.themes.find(t => t.id === currentTheme);
    themeName = currentTheme.name;

    poolQuestions = currentTheme.questions;
    
    // 🎚️ FILTER LEVEL
    filtered =
    selectedLevel === "ALL"
      ? currentTheme.questions
      : currentTheme.questions.filter(q => q.level === selectedLevel);
  }

  // 🔀 SHUFFLE (kalau aktif)
  questions = isShuffle ? shuffleArray(filtered) : filtered;
  
  index = 0;

  document.getElementById("home").classList.add("hidden");
  document.getElementById("practice").classList.remove("hidden");
  
  showQuestion();
}

function showQuestion() {
  const q = questions[index];
  
  const container = document.getElementById("questionImg");
  const val = index +1;
  
  container.innerHTML = "";
  
  if (q.img) {
    createImgElement(container, q.img, currentTheme.id);
  } else {

    const parts = [];
    
    if (val <= 10) {
      parts.push(`number_${val}.png`);
    } else if (val < 100) {
      const tensDigit = Math.floor(val / 10); // Angka depan (misal: 2 dari 25)
      const unitDigit = val % 10;            // Angka belakang (misal: 5 dari 25)
  
      // 1. Jika angka 20-99, tambahkan angka depan (2-9)
      if (tensDigit > 1) {
        parts.push(`number_${tensDigit}.png`);
      }
      
      // 2. Tambahkan simbol angka 10 di tengah
      parts.push(`number_10.png`);
      
      // 3. Tambahkan angka satuan di belakang (jika bukan 0)
      if (unitDigit > 0) {
        parts.push(`number_${unitDigit}.png`);
      }
    }
    
    // Tampilkan semua bagian yang terkumpul
    parts.forEach(fileName => createImgElement(container, fileName));
  }
  
  function createImgElement(parent, fileName, folder="") {
    const div = document.createElement("div");
    div.className = "kanji-part";
    div.style.backgroundImage = `url("./images${folder ? '/' + folder : ''}/${fileName}")`;
    parent.appendChild(div);
  }
  
  // img.style.backgroundImage = !q.img ? `url("./images/number_kanji${index + 1}.png")` : `url("./images/${q.img}")`;
  document.getElementById("questionText").innerHTML = q.question_ruby;

  document.getElementById("metaInfo").innerHTML =
  `テーマ：${isRandomQ ? questions[index].themeName : currentTheme.name} ｜ レベル：${q.level} ｜ ${index + 1}/${questions.length}`;
  
  const hintBox = document.getElementById("hintBox");

  if (selectedMode === "hint" && q.translation_id) {
    hintBox.innerHTML = q.translation_id;
    hintBox.classList.remove("hidden");
  } else {
    hintBox.classList.add("hidden");
  }
  
  saveProgress();
}

function nextQuestion() {
  index++;
  if (index >= questions.length) {
    console.log(index, questions.length, currentTheme.questions.length)
    endSession();
  } else {
    showQuestion();
  }
  const box = document.getElementById("exampleBox");
  if (!box.classList.contains("hidden")) {
    box.classList.add("hidden");
  }
}

function endSession() {
  clearProgress();

  document.getElementById("practice").classList.add("hidden");
  document.getElementById("end").classList.remove("hidden");
  document.getElementById("summary").innerHTML =
    `<ruby>質問数<rt>しつもんすう</rt></ruby>：${questions.length}<ruby>問<rt>とい</rt></ruby><br>レベル：${selectedLevel}`;
  
  const box = document.getElementById("exampleBox");
  if (!box.classList.contains("hidden")) {
    box.classList.add("hidden");
  }
  
  const banner = document.getElementById("banner");
  banner.style.backgroundImage = `url("images/banner/${banners[Math.floor(Math.random() * banners.length)]}")`;
}

function goHome() {
  document.getElementById("end").classList.add("hidden");
  document.getElementById("home").classList.remove("hidden");
  document.querySelectorAll(".theme-buttons button").forEach(b => b.classList.remove("active"));
  document.querySelector(".start-btn").disabled = true;
}

function toggleExample() {
  const box = document.getElementById("exampleBox");
  const q = questions[index];

  if (!q.example_answer) return;

  box.innerHTML = "<ruby>例文<rt>れいぶん</rt></ruby>： " + q.example_answer;
  box.classList.toggle("hidden");
}

function saveProgress() {
  const progress = {
    themeId: currentTheme.id,
    level: selectedLevel,
    mode: selectedMode,
    index: index,
    totalAnswered: index + 1,
    order: questions.map(q => q.id), // 👈 SIMPAN URUTAN
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

async function loadProgress() {
  isRandomQ = false;
  document.getElementById("randomThemeChk").checked = false;
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  const progress = JSON.parse(saved);

  currentTheme = progress.themeId;
  selectedLevel = progress.level;
  selectedMode = progress.mode;
  index = progress.index;

  const theme = db.themes.find(t => t.id === currentTheme);
  if (!theme) return;

  currentTheme = theme;
  let filtered =
  selectedLevel === "ALL"
    ? currentTheme.questions
    : currentTheme.questions.filter(q => q.level === selectedLevel);

  // 🔥 restore order
  if (progress.order) {
    questions = progress.order
      .map(id => filtered.find(q => q.id === id))
      .filter(Boolean);
  } else {
    questions = filtered;
  }
  const loading = document.getElementById("loading");
  loading.classList.remove("hidden");
  loading.innerText = "🔄 Sesi sebelumnya ditemukan, melanjutkan...";
  
  // langsung ke halaman practice
  document.getElementById("home").classList.add("hidden");
  document.getElementById("practice").classList.remove("hidden");

  if (!questions.length) {
    clearProgress();
    goHome();
    alert("Sesi sebelumnya tidak valid, mulai ulang.");
    return;
  }
  
  if (index >= questions.length) {
    index = 0;
  }
  showQuestion();
  await new Promise(resolve => setTimeout(resolve, 500));
  loading.classList.add("hidden");
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

function shuffleArray(array) {
  const shuffled = [...array]; // copy biar data asli aman
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

document.getElementById("randomThemeChk").addEventListener("change", e => {
  isRandomQ = e.target.checked;

  // disable tombol tema jika random
  document
    .querySelectorAll("#themeContainer button")
    .forEach(b => b.disabled = isRandomQ);
  
  document.querySelector(".start-btn").disabled =
  isRandomQ && db ? false : !currentTheme;
});