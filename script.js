// TMDB API Config
const API_KEY = '693b461f399ad0e40195a29b642c310c'; // Makin อย่าลืมเอา Key มาใส่นะครับ
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let movieDB = []; 
let watchlist = JSON.parse(localStorage.getItem('nighty_global_wl')) || [];
let shuffleRegion = 'All';

// Initial Load
// Initial Load
window.onload = () => {
    // สั่งดึงข้อมูลจาก API ทันที
    getMoviesFromAPI();
    
    // อัปเดตตัวเลขใน Watchlist
    updateWatchlistCount();
};

// --- API Logic ---
async function getMoviesFromAPI() {
    try {
        const response = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
        const data = await response.json();
        
        movieDB = data.results.map(m => ({
            id: m.id,
            title: m.title,
            year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
            region: 'Global',
            rating: m.vote_average.toFixed(1),
            img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750',
            desc: m.overview
        }));

        renderMovies(movieDB);
    } catch (error) {
        console.error("Error:", error);
        showToast("ไม่สามารถโหลดข้อมูลได้");
    }
}

// --- Navigation & UI Logic ---
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active-tab'));
    document.getElementById(`nav-${viewName}`).classList.add('active-tab');

    if(viewName === 'Watchlist') renderWatchlist();
}

function createMovieCard(movie) {
    const isSaved = watchlist.includes(movie.id);
    return `
        <div class="movie-card group cursor-pointer" onclick="openModal(${movie.id})">
            <div class="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#111] border border-white/5 shadow-xl">
                <img src="${movie.img}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/400x600/111/444?text=${movie.title}'">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <button onclick="event.stopPropagation(); toggleWatchlist(${movie.id})" class="w-full py-2 ${isSaved ? 'bg-red-600' : 'bg-white text-black'} text-[10px] font-bold rounded-lg transition-all mb-2">
                        ${isSaved ? 'REMOVE FROM LIST' : 'ADD TO LIST'}
                    </button>
                    <span class="text-[9px] text-gray-400 uppercase font-black">${movie.region}</span>
                </div>
                <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                    <i class="fa-solid fa-star text-yellow-500 text-[9px]"></i>
                    <span class="text-[10px] font-bold">${movie.rating}</span>
                </div>
            </div>
            <div class="mt-3">
                <h4 class="font-bold text-sm text-white truncate group-hover:text-red-500 transition-colors">${movie.title}</h4>
                <p class="text-[10px] text-gray-500">${movie.year}</p>
            </div>
        </div>
    `;
}

function renderMovies(list) {
    const grid = document.getElementById('movieGrid');
    if(grid) grid.innerHTML = list.map(m => createMovieCard(m)).join('');
}

async function handleSearch(val) {
    if (!val) { renderMovies(movieDB); return; }
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${val}`);
    const data = await res.json();
    const results = data.results.map(m => ({
        id: m.id, title: m.title, 
        year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
        region: 'Result', rating: m.vote_average.toFixed(1),
        img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750',
        desc: m.overview
    }));
    renderMovies(results);
}

// --- Watchlist & Modal Logic ---
function toggleWatchlist(id) {
    const idx = watchlist.indexOf(id);
    if(idx > -1) {
        watchlist.splice(idx, 1);
        showToast("Removed from List");
    } else {
        watchlist.push(id);
        showToast("Saved to List!");
    }
    localStorage.setItem('nighty_global_wl', JSON.stringify(watchlist));
    updateWatchlistCount();
    renderWatchlist();
}

function updateWatchlistCount() {
    document.getElementById('watchlistCount').innerText = watchlist.length;
}

function openModal(id) {
    const movie = movieDB.find(m => m.id === id) || {title: "Unknown", desc: "No description"};
    const modal = document.getElementById('movieModal');
    const poster = document.getElementById('modalPoster');
    const body = document.getElementById('modalBody');
    const isSaved = watchlist.includes(movie.id);

    poster.innerHTML = `<img src="${movie.img}" class="w-full h-full object-cover">`;
    body.innerHTML = `
        <h2 class="text-4xl font-black mb-4">${movie.title}</h2>
        <p class="text-gray-400 leading-relaxed mb-10 text-lg border-l-4 border-red-600 pl-4">${movie.desc}</p>
        <button onclick="toggleWatchlist(${movie.id}); closeModal()" class="px-8 py-3 rounded-xl font-bold bg-[#222] border border-white/10">
            ${isSaved ? 'Remove from List' : 'Save to List'}
        </button>
    `;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('movieModal').classList.add('hidden');
}

function showToast(msg) {
    Toastify({ text: msg, duration: 2000, gravity: "bottom", position: "right", style: { background: "#111", border: "1px solid #333", borderRadius: "12px" } }).showToast();
}
function performShuffle() {
    const resultDiv = document.getElementById('shuffleResult');
    const cardDiv = document.getElementById('resultCard');
    
    // กรองหนังตามภูมิภาค (ถ้าเลือก All หรือหาหมวดที่เลือกไม่เจอ ให้ใช้ movieDB ทั้งหมด)
    let pool = shuffleRegion === 'All' ? movieDB : movieDB.filter(m => m.region === shuffleRegion);
    
    // ถ้าหมวดที่เลือกไม่มีหนัง (เช่น เลือก Hollywood แต่ใน API เป็น Global หมด) ให้สุ่มจากทั้งหมดแทน
    if (pool.length === 0) {
        pool = movieDB;
    }

    if (pool.length === 0) {
        showToast("กำลังโหลดข้อมูลหนัง... กรุณารอสักครู่");
        return;
    }

    const randomMovie = pool[Math.floor(Math.random() * pool.length)];

    cardDiv.innerHTML = `<div class="animate-pulse flex items-center justify-center h-48 bg-[#1a1a1a] rounded-2xl border border-white/5 text-gray-500">Picking...</div>`;
    resultDiv.classList.remove('hidden');

    setTimeout(() => {
        cardDiv.innerHTML = createMovieCard(randomMovie);
        showToast(`System picked: ${randomMovie.title}`);
    }, 800);
}
async function getMoviesFromAPI() {
    try {
        const totalPages = 100; // กำหนดจำนวนหน้าที่จะดึง (15 หน้า = 300 เรื่อง)
        const fetchPromises = [];

        showToast("กำลังรวบรวมหนัง 2000 เรื่อง...");

        // 1. สร้าง Array ของการ Fetch ทุกหน้าไว้พร้อมกัน
        for (let i = 1; i <= totalPages; i++) {
            fetchPromises.push(
                fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${i}`)
            );
        }

        // 2. รันการดึงข้อมูลทั้งหมดพร้อมกัน (Parallel Fetching)
        const responses = await Promise.all(fetchPromises);
        const allData = await Promise.all(responses.map(res => res.json()));

        // 3. รวมผลลัพธ์จากทุกหน้าเข้าด้วยกันเป็น Array เดียว
        const rawMovies = allData.flatMap(data => data.results);

        // 4. แปลงข้อมูลและจัดหมวดหมู่เหมือนเดิม
        movieDB = rawMovies.map(m => {
            let regionLabel = 'Global';
            if (m.original_language === 'en') regionLabel = 'Hollywood';
            else if (['ja', 'ko', 'zh', 'th'].includes(m.original_language)) {
                regionLabel = (m.original_language === 'ja' && m.genre_ids.includes(16)) ? 'Anime' : 'Asia';
            }

            return {
                id: m.id,
                title: m.title,
                year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
                region: regionLabel,
                rating: m.vote_average.toFixed(1),
                img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750',
                desc: m.overview
            };
        });

        renderMovies(movieDB);
        showToast(`NightlyFlix พร้อมเสิร์ฟแล้ว ${movieDB.length} เรื่อง!`);
        
    } catch (error) {
        console.error("Fetch Error:", error);
        showToast("ดึงข้อมูลหนังไม่สำเร็จ ลองตรวจสอบอินเทอร์เน็ตดูครับ");
    }
}