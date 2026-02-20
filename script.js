const API_KEY = '693b461f399ad0e40195a29b642c310c';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let movieDB = []; 
let watchlist = JSON.parse(localStorage.getItem('nighty_global_wl')) || [];
let shuffleRegion = 'All';
// อัปเดต UI ทันทีที่โหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    updateWatchlistCount(); // อัปเดตตัวเลขบนเมนู
    getMoviesFromAPI();    // โหลดหนังหน้าหลัก (Browse)
});

window.onload = () => {
    getMoviesFromAPI();
    updateWatchlistCount();
};
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
        <div class="group relative cursor-pointer transition-all duration-500 ease-out hover:-translate-y-3" onclick="openModal(${movie.id})">
            
            <div class="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#111] border border-white/5 shadow-xl transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(220,38,38,0.3)] group-hover:ring-2 group-hover:ring-red-600/50">
                <img src="${movie.img}" 
                     class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
                     onerror="this.src='https://via.placeholder.com/400x600/111/444?text=${movie.title}'">
                
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <button onclick="event.stopPropagation(); toggleWatchlist(${movie.id})" 
                            class="w-full py-2 ${isSaved ? 'bg-red-600' : 'bg-white text-black'} text-[10px] font-bold rounded-lg transition-all mb-2 hover:scale-105 active:scale-95">
                        ${isSaved ? '<i class="fa-solid fa-trash-can mr-1"></i> REMOVE' : '<i class="fa-solid fa-plus mr-1"></i> ADD TO LIST'}
                    </button>
                    <span class="text-[9px] text-gray-400 uppercase font-black tracking-widest">${movie.region}</span>
                </div>

                <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                    <i class="fa-solid fa-star text-yellow-500 text-[9px]"></i>
                    <span class="text-[10px] font-bold text-white">${movie.rating}</span>
                </div>
            </div>

            <div class="mt-3 px-1">
                <h4 class="font-bold text-sm text-gray-300 truncate group-hover:text-white transition-colors duration-300">
                    ${movie.title}
                </h4>
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
    
    // ✨ อัปเดตหน้าจอ My List ทันทีถ้าเรากำลังหน้านั้นอยู่
    const watchlistView = document.getElementById('view-Watchlist');
    if (watchlistView && !watchlistView.classList.contains('hidden')) {
        renderWatchlist();
    }
}
async function renderWatchlist() {
    const grid = document.getElementById('watchlistGrid');
    const emptyMsg = document.getElementById('watchlistEmpty');
    if (!grid) return;

    if (watchlist.length === 0) {
        grid.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');
    grid.innerHTML = '<div class="col-span-full text-center py-20 text-gray-500">Loading your list...</div>';

    const promises = watchlist.map(id => fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=th-TH`).then(res => res.json()));
    const movies = await Promise.all(promises);

    const movieData = movies.map(m => ({
        id: m.id, title: m.title, rating: m.vote_average.toFixed(1),
        year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
        img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750',
        region: 'Saved'
    }));

    grid.innerHTML = movieData.map(m => createMovieCard(m)).join('');
}
function updateWatchlistCount() {
    const countBadge = document.getElementById('watchlistCount');
    if (countBadge) {
        countBadge.innerText = watchlist.length;
    }
}
function switchView(viewName) {
    // ซ่อนทุกหน้า
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    // โชว์หน้าที่เลือก
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    
    // อัปเดตสีเมนู
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active-tab'));
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) activeNav.classList.add('active-tab');

    // ✨ สำคัญ: ถ้าเปิดหน้า My List ให้สั่งวาดหนังทันที
    if(viewName === 'Watchlist') {
        renderWatchlist();
    }
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
    // ลองเพิ่มจุดนี้ดูครับ
    const pagesToFetch = 150; // กวาดหา 300 เรื่อง ข้อมูลจะแน่นขึ้นมาก!
    let pool = shuffleRegion === 'All' ? movieDB : movieDB.filter(m => m.region === shuffleRegion);
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
        const totalPages = 100;
        const fetchPromises = [];

        showToast("กำลังรวบรวมหนัง 2000 เรื่อง...");
        for (let i = 1; i <= totalPages; i++) {
            fetchPromises.push(
                fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${i}`)
            );
        }
        const responses = await Promise.all(fetchPromises);
        const allData = await Promise.all(responses.map(res => res.json()));
        const rawMovies = allData.flatMap(data => data.results);
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
async function performAdvancedShuffle() {
    // 1. ดึงค่าจากฟิลเตอร์
    const genre = document.getElementById('shuffle-genre').value;
    const year = document.getElementById('shuffle-year').value;
    const duration = document.getElementById('shuffle-duration').value;
    const provider = document.getElementById('shuffle-provider').value;
    const customYearValue = document.getElementById('custom-year-input').value;
    
    const resultDiv = document.getElementById('shuffleResult');
    const gridDiv = document.getElementById('shuffleGrid');

    // ล้างหน้าจอและแสดงสถานะโหลด
    gridDiv.innerHTML = `
        <div class="col-span-full py-24 text-center">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent mb-4"></div>
            <p class="text-gray-500 font-bold animate-pulse">กำลังกวาดฐานข้อมูลสตรีมมิ่งในไทย...</p>
        </div>`;
    resultDiv.classList.remove('hidden');

    try {
        const pagesToFetch = 10; 
        const fetchPromises = [];

        for (let i = 1; i <= pagesToFetch; i++) {
            let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&watch_region=TH&include_adult=false&page=${i}`;
            
            if (provider) {
                url += `&with_watch_providers=${provider}&with_watch_monetization_types=flatrate`;
            } else {
                url += `&with_watch_monetization_types=flatrate|rent|buy`;
            }
            
            if (genre) url += `&with_genres=${genre}`;
            
            if (year) {
                if (year === 'custom' && customYearValue) url += `&primary_release_year=${customYearValue}`;
                else if (year === 'pre-2000') url += `&primary_release_date.lte=2000-12-31`;
                else if (year !== 'custom') url += `&primary_release_year=${year}`;
            }

            if (duration) {
                if (duration === "under-60") url += `&with_runtime.lte=60`;
                else if (duration === "60-90") url += `&with_runtime.gte=60&with_runtime.lte=90`;
                else if (duration === "90-120") url += `&with_runtime.gte=90&with_runtime.lte=120`;
                else if (duration === "120-150") url += `&with_runtime.gte=120&with_runtime.lte=150`;
                else if (duration === "150-180") url += `&with_runtime.gte=150&with_runtime.lte=180`;
                else if (duration === "over-180") url += `&with_runtime.gte=180`;
            }

            fetchPromises.push(fetch(url).then(res => res.json()));
        }

        const allPagesData = await Promise.all(fetchPromises);
        const allMovies = allPagesData.flatMap(data => data.results || []);

        if (allMovies.length === 0) {
            gridDiv.innerHTML = `<div class="col-span-full py-20 text-center text-gray-600">ไม่พบหนังที่ตรงตามเงื่อนไข</div>`;
            return;
        }

        // 2. แสดงผลพร้อม Hover Effects
        gridDiv.innerHTML = allMovies.map(m => `
            <div onclick="showMovieDetails(${m.id})" 
                 class="group relative cursor-pointer transition-all duration-500 ease-out hover:-translate-y-3">
                
                <div class="relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(220,38,38,0.3)] group-hover:ring-2 group-hover:ring-red-600/50">
                    <img src="${m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750'}" 
                         class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
                         alt="${m.title}">
                    
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
                        <div class="flex items-center gap-2 text-yellow-400 text-xs font-bold mb-1">
                            <i class="fa-solid fa-star"></i> ${m.vote_average ? m.vote_average.toFixed(1) : '0.0'}
                        </div>
                        <p class="text-white text-[10px] font-medium">คลิกเพื่อดูรายละเอียด</p>
                    </div>
                </div>

                <div class="mt-3 px-1">
                    <h3 class="text-sm font-bold text-gray-300 group-hover:text-white transition-colors duration-300 line-clamp-1">
                        ${m.title}
                    </h3>
                    <p class="text-[10px] text-gray-500 font-medium">${m.release_date ? m.release_date.split('-')[0] : 'N/A'}</p>
                </div>
            </div>
        `).join('');

        if (typeof showToast === 'function') showToast(`พบหนัง ${allMovies.length} เรื่อง!`);
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error("Shuffle Error:", error);
        if (typeof showToast === 'function') showToast("เกิดข้อผิดพลาดในการดึงข้อมูล");
    }
} // ปิดฟังก์ชันอย่างถูกต้อง// ปิดฟังก์ชัน performAdvancedShuffle
async function openModal(id) {
    const modal = document.getElementById('movieModal');
    const poster = document.getElementById('modalPoster');
    const body = document.getElementById('modalBody');

    // โชว์ Loading สั้นๆ ก่อนข้อมูลมา
    body.innerHTML = '<div class="h-full flex items-center justify-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>';
    modal.style.display = 'flex'; // ใช้ flex เพื่อให้กึ่งกลางจอทำงาน
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=watch/providers&language=th-TH`);
        const movie = await res.json();
        const isSaved = watchlist.includes(movie.id);
        const providers = movie['watch/providers']?.results?.TH?.flatrate || [];

        poster.innerHTML = `<img src="${IMG_URL + movie.poster_path}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent md:bg-gradient-to-r"></div>`;
        
        body.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="flex items-center gap-2 mb-4 text-[10px] font-bold">
                    <span class="px-2 py-1 bg-red-600 rounded text-white">${movie.release_date.split('-')[0]}</span>
                    <span class="text-gray-400">${movie.runtime}m</span>
                </div>
                <h2 class="text-3xl md:text-5xl font-black mb-4 text-white leading-tight">${movie.title}</h2>
                <p class="text-gray-400 leading-relaxed mb-8 text-sm md:text-base border-l-2 border-red-600 pl-4">
                    ${movie.overview || 'ไม่มีเรื่องย่อในภาษาไทย'}
                </p>

                <div class="bg-white/5 p-4 rounded-xl border border-white/10 mb-8">
                    <p class="text-[10px] text-red-500 font-bold uppercase mb-3 tracking-widest italic">Available On</p>
                    <div class="flex gap-3">
                        ${providers.length > 0 ? 
                            providers.map(p => `<img src="${IMG_URL}${p.logo_path}" title="${p.provider_name}" class="w-8 h-8 rounded-lg">`).join('') 
                            : '<span class="text-gray-500 text-[10px] italic">NO STREAMING IN TH</span>'}
                    </div>
                </div>
                
                <button onclick="toggleWatchlist(${movie.id}); openModal(${movie.id})" 
                        class="mt-auto w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${isSaved ? 'bg-red-600 text-white' : 'bg-white text-black hover:bg-gray-200'}">
                    <i class="fa-solid ${isSaved ? 'fa-trash-can' : 'fa-plus'} mr-2"></i>
                    ${isSaved ? 'Remove from List' : 'Add to My List'}
                </button>
            </div>
        `;
    } catch (error) {
        console.error(error);
        body.innerHTML = '<p class="text-red-500">Error loading movie data.</p>';
    }
}
async function showMovieDetails(movieId) {
    const modal = document.getElementById('movieModal');
    const modalPoster = document.getElementById('modalPoster');
    const modalBody = document.getElementById('modalBody');

    try {
        // ดึงแค่ข้อมูลหลักและ Provider (เร็วขึ้นเพราะไม่ต้องรอคิววิดีโอ)
        const res = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=watch/providers&language=th-TH`);
        const movie = await res.json();

        // ดึงรายชื่อผู้ให้บริการ Streaming ในไทย
        const providers = movie['watch/providers']?.results?.TH?.flatrate || [];

        // 1. ใส่รูป Poster (ฝั่งซ้าย)
        modalPoster.innerHTML = `
            <img src="${IMG_URL}${movie.poster_path}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent md:bg-gradient-to-r"></div>
        `;

        // 2. ใส่เนื้อหา (ฝั่งขวา) - ตัดส่วน YouTube ออกแล้ว
        modalBody.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="flex flex-wrap items-center gap-2 text-[10px] md:text-xs mb-3">
                    <span class="px-2 py-1 bg-red-600 rounded-md font-bold text-white">${movie.release_date?.split('-')[0] || 'N/A'}</span>
                    <span class="px-2 py-1 bg-white/10 rounded-md text-gray-300 font-medium">${movie.runtime}m</span>
                    <span class="px-2 py-1 bg-white/10 rounded-md text-gray-300 font-medium">${movie.genres.map(g => g.name).join(' • ')}</span>
                </div>

                <h2 class="text-3xl md:text-5xl font-black text-white leading-tight mb-4">${movie.title}</h2>

                <p class="text-gray-400 text-sm md:text-base leading-relaxed mb-8 border-l-2 border-red-600 pl-4">
                    ${movie.overview || 'ไม่มีเนื้อหาเรื่องย่อในภาษาไทย'}
                </p>

                <div class="bg-white/5 p-4 rounded-xl border border-white/10 mb-8">
                    <p class="text-[10px] text-red-500 font-bold uppercase mb-3 tracking-widest italic">Available On</p>
                    <div class="flex gap-3">
                        ${providers.length > 0 ? 
                            providers.map(p => `<img src="${IMG_URL}${p.logo_path}" title="${p.provider_name}" class="w-8 h-8 rounded-lg shadow-lg">`).join('') 
                            : '<span class="text-gray-500 text-[10px] italic uppercase tracking-wider">No streaming available in TH</span>'}
                    </div>
                </div>

                <button class="mt-auto w-full py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 active:scale-95 transition-all uppercase tracking-widest text-sm shadow-xl">
                    <i class="fa-solid fa-plus mr-2"></i> Add to My List
                </button>
            </div>
        `;

        // แสดงผล Modal โดยใช้โครงสร้างจัดกึ่งกลางที่มีอยู่แล้วใน HTML
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

    } catch (e) { 
        console.error("Fetch error:", e); 
    }
}
// ฟังก์ชันปิด
function closeModal() {
    const modal = document.getElementById('movieModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('modalPoster').innerHTML = '';
    document.getElementById('modalBody').innerHTML = '';
}
// ฟังก์ชันปิด Modal (ต้องปลดล็อกการเลื่อน body ด้วย)
function closeModal() {
    const modal = document.getElementById('movieModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('modalPoster').innerHTML = '';
    document.getElementById('modalBody').innerHTML = '';
    document.body.style.overflow = 'auto'; // ปลดล็อกการเลื่อน
}