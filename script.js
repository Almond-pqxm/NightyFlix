const API_KEY = '693b461f399ad0e40195a29b642c310c';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let movieDB = []; 
// store full movie objects in watchlist for fast rendering
let watchlist = JSON.parse(localStorage.getItem('nighty_global_wl')) || [];
let shuffleRegion = 'All';
let currentPage = 1;
let isLoading = false;

// อัปเดต UI ทันทีที่โหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    updateWatchlistCount();
    getMoviesFromAPI(currentPage);
    // register service worker for caching if supported
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW register failed', err));
    }
});

// keyboard shortcut: press '/' to focus search
document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (e.key === '/' && active && active.tagName.toLowerCase() !== 'input' && active.tagName.toLowerCase() !== 'textarea') {
        const search = document.querySelector('input[aria-label="Search movies"]');
        if (search) { e.preventDefault(); search.focus(); }
    }
});

// browse filter state
const browseFilters = { region: '', year: '', sort: 'popular' };

function applyBrowseFilters() {
    const region = document.getElementById('browse-region')?.value || '';
    const year = document.getElementById('browse-year')?.value || '';
    const sort = document.getElementById('browse-sort')?.value || 'popular';
    browseFilters.region = region;
    browseFilters.year = year;
    browseFilters.sort = sort;
    renderMovies(movieDB);
}

function surpriseMe() {
    // pick from currently filtered list
    const filtered = filterAndSort(movieDB);
    if (!filtered || filtered.length === 0) { showToast('ไม่พบหนังสำหรับสุ่ม'); return; }
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    if (pick) openModal(pick.id);
}

function filterAndSort(list) {
    let out = Array.isArray(list) ? [...list] : [];
    if (browseFilters.region) {
        out = out.filter(m => m.region === browseFilters.region);
    }
    if (browseFilters.year) {
        if (browseFilters.year === '2023') out = out.filter(m => (m.year !== 'N/A' && parseInt(m.year) >= 2023));
        else if (browseFilters.year === '2010') out = out.filter(m => (m.year !== 'N/A' && parseInt(m.year) >= 2010 && parseInt(m.year) <= 2022));
        else if (browseFilters.year === '2000') out = out.filter(m => (m.year === 'N/A' || parseInt(m.year) <= 2000));
    }
    if (browseFilters.sort === 'rating') {
        out.sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (browseFilters.sort === 'year-desc') {
        out.sort((a,b) => (b.year === 'N/A' ? 0 : parseInt(b.year)) - (a.year === 'N/A' ? 0 : parseInt(a.year)));
    }
    return out;
}

// --- 1. ระบบจัดการเลื่อนโหลดหนัง (Infinite Scroll) ---
async function getMoviesFromAPI(page = 1) {
    if (isLoading) return;
    isLoading = true;

    try {
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${page}&language=th-TH`);
        const data = await response.json();
        
        const newMovies = data.results.map(m => {
            let regionLabel = 'Global';
            if (m.original_language === 'en') regionLabel = 'Hollywood';
            else if (['ja', 'ko', 'zh', 'th'].includes(m.original_language)) {
                regionLabel = (m.original_language === 'ja' && m.genre_ids?.includes(16)) ? 'Anime' : 'Asia';
            }

            return {
                id: m.id,
                title: m.title || m.name,
                year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
                region: regionLabel,
                rating: m.vote_average ? m.vote_average.toFixed(1) : '0.0',
                img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750',
                desc: m.overview
            };
        });

        if (page === 1) {
            movieDB = newMovies;
            renderMovies(movieDB);
        } else {
            movieDB = [...movieDB, ...newMovies];
            appendMovies(newMovies);
        }
        
    } catch (error) {
        console.error("Fetch Error:", error);
        showToast("ไม่สามารถโหลดข้อมูลได้ ตรวจสอบอินเทอร์เน็ต");
    } finally {
        isLoading = false;
    }
}

function appendMovies(list) {
    const grid = document.getElementById('movieGrid');
    if(grid) {
        const html = list.map(m => createMovieCard(m)).join('');
        grid.insertAdjacentHTML('beforeend', html);
    }
}

// ตรวจจับการเลื่อนหน้าจอ (ถ้าเลื่อนเกือบสุด ให้โหลดหน้าถัดไป)
window.addEventListener('scroll', () => {
    const browseView = document.getElementById('view-Browse');
    if (browseView && !browseView.classList.contains('hidden')) {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 400) {
            if (!isLoading) {
                currentPage++;
                getMoviesFromAPI(currentPage);
            }
        }
    }
});

// --- 2. ฟังก์ชัน UI และการแสดงผล ---
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active-tab'));
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) activeNav.classList.add('active-tab');

    if(viewName === 'Watchlist') renderWatchlist();
}

function createMovieCard(movie) {
    const isSaved = watchlist.some(w => w && w.id === movie.id);
    return `
        <div class="group relative cursor-pointer transition-all duration-500 ease-out hover:-translate-y-3" onclick="openModal(${movie.id})">
            <div class="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#111] border border-white/5 shadow-xl transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(220,38,38,0.3)] group-hover:ring-2 group-hover:ring-red-600/50">
                <img src="${movie.img}" loading="lazy" decoding="async"
                     class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
                     onerror="this.src='https://via.placeholder.com/400x600/111/444?text=${movie.title}'">
                
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <button onclick="(event && event.stopPropagation) ? event.stopPropagation() : (window.event && (window.event.cancelBubble=true)); toggleWatchlist(${movie.id})" 
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
    if(grid) {
        const visible = filterAndSort(list);
        grid.innerHTML = visible.map(m => createMovieCard(m)).join('');
    }
}

async function handleSearch(val) {
    if (!val) { renderMovies(movieDB); return; }
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${val}&language=th-TH`);
    const data = await res.json();
    const results = data.results.map(m => ({
        id: m.id, title: m.title || m.name, 
        year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
        region: 'Result', rating: m.vote_average ? m.vote_average.toFixed(1) : '0.0',
        img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750',
        desc: m.overview
    }));
    renderMovies(results);
}

// --- 3. ระบบ Watchlist ---
async function toggleWatchlist(id) {
    const idx = watchlist.findIndex(item => item && item.id === id);
    if (idx > -1) {
        watchlist.splice(idx, 1);
        showToast("Removed from List");
    } else {
        // try to find movie in in-memory DB first
        let movieObj = movieDB.find(m => m.id === id);
        if (!movieObj) {
            try {
                const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=th-TH`);
                const m = await res.json();
                movieObj = {
                    id: m.id,
                    title: m.title || m.name,
                    year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
                    region: 'Saved',
                    rating: m.vote_average ? m.vote_average.toFixed(1) : '0.0',
                    img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750',
                    desc: m.overview
                };
            } catch (err) {
                console.error('Failed loading movie for watchlist:', err);
                showToast('ไม่สามารถบันทึกหนังได้ขณะนี้');
                return;
            }
        }

        watchlist.push(movieObj);
        showToast("Saved to List!");
    }

    // persist full objects
    localStorage.setItem('nighty_global_wl', JSON.stringify(watchlist));
    updateWatchlistCount();

    // If Browse view is visible, re-render movie grid so button states update immediately.
    const browseView = document.getElementById('view-Browse');
    if (browseView && !browseView.classList.contains('hidden')) {
        renderMovies(movieDB);
    }

    // If Watchlist view is visible, refresh it as well.
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
    grid.innerHTML = '<div class="col-span-full text-center py-6 text-gray-500">Preparing your list...</div>';

    // Ensure we have full objects; fetch details for any placeholder items
    const detailed = await Promise.all(watchlist.map(async item => {
        if (item && item.title) return item;
        try {
            const res = await fetch(`${BASE_URL}/movie/${item.id}?api_key=${API_KEY}&language=th-TH`);
            const m = await res.json();
            return {
                id: m.id,
                title: m.title || m.name,
                rating: m.vote_average ? m.vote_average.toFixed(1) : '0.0',
                year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
                img: m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750',
                region: 'Saved',
                desc: m.overview
            };
        } catch (err) {
            console.error('Error fetching watchlist item', err);
            return { id: item.id, title: 'Unknown', rating: '0.0', year: 'N/A', img: 'https://via.placeholder.com/500x750', region: 'Saved' };
        }
    }));

    // update stored watchlist to full objects (if any were placeholders)
    watchlist = detailed;
    localStorage.setItem('nighty_global_wl', JSON.stringify(watchlist));

    grid.innerHTML = detailed.map(m => createMovieCard(m)).join('');
}

function updateWatchlistCount() {
    const countBadge = document.getElementById('watchlistCount');
    if (countBadge) {
        countBadge.innerText = watchlist.length;
    }
}

function showToast(msg) {
    if(typeof Toastify === 'function') {
        Toastify({ text: msg, duration: 2000, gravity: "bottom", position: "right", style: { background: "#111", border: "1px solid #333", borderRadius: "12px" } }).showToast();
    }
}

// --- 4. ระบบ Modal (แก้บัคจอดำ) ---
async function openModal(id) {
    const modal = document.getElementById('movieModal');
    const poster = document.getElementById('modalPoster');
    const body = document.getElementById('modalBody');

    poster.innerHTML = '';
    body.innerHTML = '<div class="h-full w-full flex items-center justify-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>';
    
    modal.style.display = ''; 
    modal.classList.remove('hidden');
    modal.classList.add('flex'); 
    document.body.style.overflow = 'hidden'; 

    try {
        const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=watch/providers&language=th-TH`);
        const movie = await res.json();
        const isSaved = watchlist.some(w => w && w.id === movie.id);
        const providers = movie['watch/providers']?.results?.TH?.flatrate || [];

        poster.innerHTML = `
            <img src="${movie.poster_path ? IMG_URL + movie.poster_path : 'https://via.placeholder.com/500x750'}" loading="lazy" decoding="async" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent md:bg-gradient-to-r"></div>
        `;
        
        body.innerHTML = `
            <div class="flex flex-col h-full w-full">
                <div class="flex items-center gap-2 mb-4 text-[10px] font-bold">
                    <span class="px-2 py-1 bg-red-600 rounded text-white">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</span>
                    <span class="text-gray-400">${movie.runtime || '?'}m</span>
                </div>
                <h2 class="text-3xl md:text-5xl font-black mb-4 text-white leading-tight">${movie.title || movie.name}</h2>
                <p class="text-gray-400 leading-relaxed mb-8 text-sm md:text-base border-l-2 border-red-600 pl-4 max-h-48 overflow-y-auto hide-scroll">
                    ${movie.overview || 'ไม่มีเรื่องย่อในภาษาไทย'}
                </p>

                        <div class="bg-white/5 p-4 rounded-xl border border-white/10 mb-8">
                            <p class="text-[10px] text-red-500 font-bold uppercase mb-3 tracking-widest italic">Available On (TH)</p>
                            <div class="flex gap-3 items-center">
                                ${providers.length > 0 ? 
                                    providers.map(p => {
                                        const logo = p.logo_path ? IMG_URL + p.logo_path : '';
                                        const q = encodeURIComponent((movie.title || movie.name) + ' ' + p.provider_name + ' watch');
                                        const href = `https://www.google.com/search?q=${q}`;
                                        return `<a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Open ${p.provider_name}" class="inline-block"><img src="${logo}" title="${p.provider_name}" class="w-8 h-8 rounded-lg"></a>`;
                                    }).join('') 
                                    : '<span class="text-gray-500 text-[10px] italic">NO STREAMING IN TH</span>'}
                            </div>
                        </div>
                
                <button onclick="toggleWatchlist(${movie.id}).then(()=>openModal(${movie.id}))" 
                        class="mt-auto w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${isSaved ? 'bg-red-600 text-white' : 'bg-white text-black hover:bg-gray-200'}">
                    <i class="fa-solid ${isSaved ? 'fa-trash-can' : 'fa-plus'} mr-2"></i>
                    ${isSaved ? 'Remove from List' : 'Add to My List'}
                </button>
            </div>
        `;
    } catch (error) {
        console.error(error);
        body.innerHTML = '<p class="text-red-500 w-full text-center">Error loading movie data.</p>';
    }
}

function closeModal() {
    const modal = document.getElementById('movieModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = 'auto'; 
    
    document.getElementById('modalPoster').innerHTML = '';
    document.getElementById('modalBody').innerHTML = '';
}

// --- 5. ระบบสุ่มหนัง (Shuffle) ---
function toggleCustomYearInput(val) {
    const input = document.getElementById('custom-year-input');
    if (val === 'custom') {
        input.classList.remove('hidden');
    } else {
        input.classList.add('hidden');
    }
}

async function performAdvancedShuffle() {
    const genre = document.getElementById('shuffle-genre').value;
    const year = document.getElementById('shuffle-year').value;
    const duration = document.getElementById('shuffle-duration').value;
    const provider = document.getElementById('shuffle-provider').value;
    const customYearValue = document.getElementById('custom-year-input').value;
    
    const resultDiv = document.getElementById('shuffleResult');
    const gridDiv = document.getElementById('shuffleGrid');

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
            let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&watch_region=TH&include_adult=false&page=${i}&language=th-TH`;
            
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

        // กรองหนังที่ซ้ำกันออก
        const uniqueMovies = Array.from(new Map(allMovies.map(item => [item['id'], item])).values());

        if (uniqueMovies.length === 0) {
            gridDiv.innerHTML = `<div class="col-span-full py-20 text-center text-gray-600">ไม่พบหนังที่ตรงตามเงื่อนไข</div>`;
            return;
        }

           gridDiv.innerHTML = uniqueMovies.map(m => `
            <div onclick="openModal(${m.id})" 
                 class="group relative cursor-pointer transition-all duration-500 ease-out hover:-translate-y-3">
                
                <div class="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-lg transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(220,38,38,0.3)] group-hover:ring-2 group-hover:ring-red-600/50">
                    <img src="${m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/500x750'}" loading="lazy" decoding="async"
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
                        ${m.title || m.name}
                    </h3>
                    <p class="text-[10px] text-gray-500 font-medium">${m.release_date ? m.release_date.split('-')[0] : 'N/A'}</p>
                </div>
            </div>
        `).join('');

        showToast(`พบหนัง ${uniqueMovies.length} เรื่อง!`);
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error("Shuffle Error:", error);
        showToast("เกิดข้อผิดพลาดในการดึงข้อมูล");
    }
}