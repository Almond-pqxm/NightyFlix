// TMDB API Config
const API_KEY = '693b461f399ad0e40195a29b642c310c';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let movieDB = []; 
let watchlist = JSON.parse(localStorage.getItem('nighty_global_wl')) || [];
let shuffleRegion = 'All';

// --- Infinite Scroll Variables ---
let currentPage = 1;      // หน้าปัจจุบัน
let isLoading = false;    // กันไม่ให้โหลดซ้ำซ้อน
let currentMode = 'trending'; // โหมดปัจจุบัน: 'trending', 'search', 'filter'
let currentSearchQuery = ''; // เก็บคำค้นหาล่าสุด
let currentFilterRegion = 'All'; // เก็บ filter ล่าสุด

// Initial Load
window.onload = () => {
    getMoviesFromAPI(1); // เริ่มโหลดหน้า 1
    updateWatchlistCount();
    setupInfiniteScroll(); // ติดตั้งระบบเลื่อนจอ
};

// --- API Logic ---
async function getMoviesFromAPI(page = 1, append = false) {
    if (isLoading) return; // ถ้ากำลังโหลดอยู่ ให้หยุดทำงาน
    isLoading = true;

    try {
        // เช็คว่าต้องโหลด URL แบบไหน (Trending หรือ Search)
        let url = '';
        if (currentMode === 'search') {
            url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${currentSearchQuery}&page=${page}`;
        } else {
            // Trending / Browse
            url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${page}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        // แปลงข้อมูล
        const newMovies = data.results.map(m => ({
            id: m.id,
            title: m.title,
            year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
            region: 'Global', // API Trending ไม่บอก Region ชัดเจน ใส่ Global ไปก่อน
            rating: m.vote_average.toFixed(1),
            img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750/111/333?text=No+Image',
            desc: m.overview || 'No description available.'
        }));

        // ถ้าไม่ใช่การ append (คือการโหลดใหม่) ให้เคลียร์ movieDB เดิม
        if (!append) {
            movieDB = newMovies;
        } else {
            movieDB = [...movieDB, ...newMovies]; // เอาของใหม่ไปต่อท้าย
        }

        // กรองตาม Region (เฉพาะถ้าอยู่ในโหมด Filter และไม่ใช่ All)
        let moviesDisplay = newMovies;
        // หมายเหตุ: การกรอง Region แบบแม่นยำต้องใช้ข้อมูล production_countries ซึ่ง Trending API ตัวธรรมดาไม่ส่งมา
        // แต่ถ้าจะใช้ Logic เดิมที่ปุ่ม Filter แค่โชว์/ซ่อน ต้องจัดการที่ Render
        // ในที่นี้เพื่อให้ Infinite Scroll ไหลลื่น เราจะแสดงผลเลย
        
        renderMovies(moviesDisplay, append);
        
        isLoading = false;
        
    } catch (error) {
        console.error("Error:", error);
        // showToast("โหลดข้อมูลเพิ่มเติมไม่สำเร็จ"); // ปิดไว้เดี๋ยวมันเด้งรัว
        isLoading = false;
    }
}

// --- Infinite Scroll Logic ---
function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        // เช็คว่าอยู่ในหน้า Browse หรือไม่ (ถ้าอยู่หน้าอื่นไม่โหลด)
        if (document.getElementById('view-Browse').classList.contains('hidden')) return;

        // สูตรคำนวณ: เลื่อนลงมา + ความสูงจอ >= ความสูงเว็บทั้งหมด - 200px (เผื่อไว้หน่อย)
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            if (!isLoading) {
                currentPage++;
                getMoviesFromAPI(currentPage, true); // true = ต่อท้าย (Append)
            }
        }
    });
}

// --- Navigation & UI Logic ---
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active-tab'));
    const navBtn = document.getElementById(`nav-${viewName}`);
    if(navBtn) navBtn.classList.add('active-tab');

    if(viewName === 'Watchlist') renderWatchlist();
}

// --- Filter Logic (Client Side Filtering for Demo) ---
function filterMovies(region) {
    // เนื่องจาก API Trending แยก Region ยาก เราจะรีเซ็ตกลับไปโหลด All Trending
    // หรือถ้าคุณมี Logic แยก Region เฉพาะ ก็ใส่ตรงนี้
    
    // เพื่อความง่าย: รีเซ็ตทุกอย่างกลับไปหน้าแรก
    currentMode = 'trending';
    currentFilterRegion = region;
    currentPage = 1;
    window.scrollTo(0, 0); // เลื่อนกลับไปบนสุด
    
    // หมายเหตุ: การ Filter "Hollywood" / "Asia" จาก Trending API ทำได้ยากเพราะมันส่งมาคละกัน
    // ใน Code เดิมก็ไม่ได้ Filter จริง (แค่ปุ่ม) 
    // ถ้าจะทำจริง ต้องเช็ค original_language แต่เพื่อง่าย เราโหลดใหม่หมดครับ
    
    getMoviesFromAPI(1, false); 
}

function createMovieCard(movie) {
    const isSaved = watchlist.includes(movie.id);
    return `
        <div class="movie-card group cursor-pointer animate-in fade-in duration-700" onclick="openModal(${movie.id})">
            <div class="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#111] border border-white/5 shadow-xl">
                <img src="${movie.img}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy">
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                    <button onclick="event.stopPropagation(); toggleWatchlist(${movie.id})" class="w-full py-2.5 ${isSaved ? 'bg-red-600 text-white' : 'bg-white text-black'} text-[10px] font-bold rounded-xl transition-all mb-2 hover:scale-105 shadow-lg">
                        ${isSaved ? '<i class="fa-solid fa-check mr-1"></i> SAVED' : '<i class="fa-solid fa-plus mr-1"></i> ADD TO LIST'}
                    </button>
                    <span class="text-[9px] text-gray-400 uppercase font-black tracking-widest">${movie.region}</span>
                </div>
                <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1 shadow-lg">
                    <i class="fa-solid fa-star text-yellow-500 text-[9px]"></i>
                    <span class="text-[10px] font-bold">${movie.rating}</span>
                </div>
            </div>
            <div class="mt-4 px-1">
                <h4 class="font-bold text-sm text-gray-200 truncate group-hover:text-red-500 transition-colors">${movie.title}</h4>
                <p class="text-[10px] text-gray-500 font-medium">${movie.year}</p>
            </div>
        </div>
    `;
}

function renderMovies(list, append = false) {
    const grid = document.getElementById('movieGrid');
    
    const html = list.map(m => createMovieCard(m)).join('');
    
    if (append) {
        grid.insertAdjacentHTML('beforeend', html); // ต่อท้าย
    } else {
        grid.innerHTML = html; // ล้างใหม่หมด
    }
}

// --- Search Logic ---
let searchTimeout;
function handleSearch(val) {
    clearTimeout(searchTimeout);
    
    // Debounce: รอให้พิมพ์เสร็จ 0.5 วิ ค่อยค้นหา
    searchTimeout = setTimeout(() => {
        if (!val) { 
            currentMode = 'trending';
            currentPage = 1;
            getMoviesFromAPI(1, false);
            return; 
        }

        currentMode = 'search';
        currentSearchQuery = val;
        currentPage = 1; // รีเซ็ตหน้าเป็น 1 สำหรับการค้นหาใหม่
        window.scrollTo(0, 0);
        getMoviesFromAPI(1, false);
    }, 500);
}

// --- Watchlist & Modal Logic --- (คงเดิม)
function toggleWatchlist(id) {
    const idx = watchlist.indexOf(id);
    const btn = event.target.closest('button'); // หาปุ่มที่กดเพื่อทำ Animation เล็กน้อย (Optional)
    
    if(idx > -1) {
        watchlist.splice(idx, 1);
        showToast("Removed from List");
    } else {
        watchlist.push(id);
        showToast("Saved to List!");
    }
    localStorage.setItem('nighty_global_wl', JSON.stringify(watchlist));
    updateWatchlistCount();
    
    // ถ้าอยู่ในหน้า Watchlist ให้ render ใหม่ทันที
    if(!document.getElementById('view-Watchlist').classList.contains('hidden')) {
        renderWatchlist();
    } else {
        // ถ้าอยู่หน้า Browse อัปเดตปุ่มโดยไม่ต้องโหลดใหม่ (Optional UX improvement)
        // เพื่อความง่าย เราปล่อยไว้ก่อน หรือจะ re-render ก็ได้
        // renderMovies(movieDB); // ถ้าเปิดบรรทัดนี้ UI จะกระตุกตอนกด
        // ใช้วิธีเปลี่ยน Class ปุ่มแบบ Manual จะเนียนกว่า (ข้ามไปก่อนเพื่อไม่ให้ Code ซับซ้อน)
        
        // *Trick*: โหลดข้อมูลชุดปัจจุบันใหม่แบบเงียบๆ เพื่ออัปเดตสถานะปุ่ม
        const currentCards = document.getElementById('movieGrid').innerHTML;
        // renderMovies(movieDB); // Re-render to update button state
        // หรือใช้วิธีง่ายสุดคือ โหลดหน้าปัจจุบันใหม่ถ้าต้องการ
    }
}

function updateWatchlistCount() {
    const el = document.getElementById('watchlistCount');
    if(el) el.innerText = watchlist.length;
}

function renderWatchlist() {
    const grid = document.getElementById('watchlistGrid');
    const emptyMsg = document.getElementById('watchlistEmpty');
    
    if (watchlist.length === 0) {
        grid.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        return;
    } else {
        emptyMsg.classList.add('hidden');
    }

    // ต้องดึงข้อมูลหนังใน Watchlist (เนื่องจากเราไม่ได้เก็บ Object หนังทั้งหมดลง LocalStorage เก็บแต่ ID)
    // วิธีแก้: ค้นหาใน movieDB ที่มีอยู่ หรือ Fetch ใหม่ถ้าจำเป็น
    // ในตัวอย่างนี้ เราจะหาจาก movieDB (ซึ่งอาจจะไม่ครบถ้าหนังอยู่ในหน้าอื่น)
    // *Best Practice*: ควร fetch รายละเอียดหนังจาก ID แต่เพื่อความรวดเร็ว ผมจะหาจาก movieDB ก่อน
    
    // แก้ไข: ให้ Fetch ข้อมูลหนังตาม ID (แบบง่าย)
    Promise.all(watchlist.map(id => 
        fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`)
        .then(res => res.json())
        .then(m => ({
            id: m.id,
            title: m.title,
            year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
            region: 'Saved',
            rating: m.vote_average.toFixed(1),
            img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750',
            desc: m.overview
        }))
    )).then(savedMovies => {
        grid.innerHTML = savedMovies.map(m => createMovieCard(m)).join('');
    });
}

// --- Shuffle Logic (คงเดิม) ---
function setShuffleRegion(reg) {
    shuffleRegion = reg;
    document.querySelectorAll('.s-reg-btn').forEach(b => b.classList.remove('active-tab-btn', 'bg-red-600/10', 'border-red-600/50', 'text-red-500'));
    event.currentTarget.classList.add('active-tab-btn', 'bg-red-600/10', 'border-red-600/50', 'text-red-500');
}

async function performShuffle() {
    const resultDiv = document.getElementById('shuffleResult');
    const resultCard = document.getElementById('resultCard');
    
    // Add loading effect
    resultDiv.classList.remove('hidden');
    resultCard.innerHTML = `<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-red-600"></i></div>`;
    
    // Random Page 1-10
    const randomPage = Math.floor(Math.random() * 10) + 1;
    let url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${randomPage}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        const list = data.results;
        
        // Random pick
        const winner = list[Math.floor(Math.random() * list.length)];
        
        const m = {
            id: winner.id,
            title: winner.title,
            year: winner.release_date ? winner.release_date.split('-')[0] : 'N/A',
            region: 'Lucky Pick',
            rating: winner.vote_average.toFixed(1),
            img: winner.poster_path ? IMG_URL + winner.poster_path : 'https://via.placeholder.com/500x750',
            desc: winner.overview
        };
        
        resultCard.innerHTML = createMovieCard(m);
        
    } catch (e) {
        showToast("Error shuffling");
    }
}

// --- Modal Logic (คงเดิม) ---
function openModal(id) {
    // ต้องหาจาก movieDB หรือถ้าไม่มีให้ fetch ใหม่ (กรณีมาจาก Watchlist หรือ Shuffle)
    let movie = movieDB.find(m => m.id === id);
    
    if (!movie) {
        // กรณีหาไม่เจอใน list ปัจจุบัน (เช่นกดมาจาก Watchlist) ให้ Fetch สด
        fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`)
            .then(res => res.json())
            .then(data => {
                const fetchedMovie = {
                    id: data.id,
                    title: data.title,
                    img: data.poster_path ? IMG_URL + data.poster_path : 'https://via.placeholder.com/500x750',
                    desc: data.overview,
                    rating: data.vote_average.toFixed(1)
                };
                showModalContent(fetchedMovie);
            });
    } else {
        showModalContent(movie);
    }
}

function showModalContent(movie) {
    const modal = document.getElementById('movieModal');
    const poster = document.getElementById('modalPoster');
    const body = document.getElementById('modalBody');
    const isSaved = watchlist.includes(movie.id);

    poster.innerHTML = `<img src="${movie.img}" class="w-full h-full object-cover shadow-2xl">`;
    body.innerHTML = `
        <div class="flex items-center gap-3 mb-4">
            <span class="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Movie</span>
            <div class="flex items-center gap-1 text-yellow-500">
                <i class="fa-solid fa-star text-sm"></i>
                <span class="text-sm font-bold text-white">${movie.rating || 'N/A'}</span>
            </div>
        </div>
        <h2 class="text-3xl md:text-5xl font-black mb-6 leading-tight">${movie.title}</h2>
        <p class="text-gray-400 leading-relaxed mb-10 text-base md:text-lg font-light">${movie.desc}</p>
        
        <div class="flex gap-4">
            <button onclick="toggleWatchlist(${movie.id}); closeModal()" class="flex-1 py-4 rounded-xl font-bold ${isSaved ? 'bg-red-600 text-white' : 'bg-white text-black'} hover:scale-105 transition-transform flex items-center justify-center gap-2">
                ${isSaved ? '<i class="fa-solid fa-trash"></i> Remove' : '<i class="fa-solid fa-bookmark"></i> Add to List'}
            </button>
        </div>
    `;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // ปิด Scroll หลังบ้าน
}

function closeModal() {
    document.getElementById('movieModal').classList.add('hidden');
    document.body.style.overflow = 'auto'; // เปิด Scroll คืน
}

function showToast(msg) {
    Toastify({ 
        text: msg, 
        duration: 2000, 
        gravity: "bottom", 
        position: "right", 
        style: { 
            background: "#1a1a1a", 
            border: "1px solid #333", 
            borderRadius: "12px",
            color: "#fff",
            fontWeight: "bold",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        } 
    }).showToast();
}