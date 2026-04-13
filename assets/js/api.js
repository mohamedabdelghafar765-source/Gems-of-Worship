// ==========================================
// 1. Quran API
// ==========================================
let surahsData = [];
let currentSurahNumber = null;
let currentSurahName = null;
let currentReciter = 'ar.alafasy';
let ayahsAudio = [];
let currentAyahIndex = 0;

// Variables targeting new audio elements
const reciterSelect = document.getElementById('reciterSelect');
const audioPlayer = document.getElementById('quranAudioPlayer');
const quranAudioHeader = document.getElementById('quranAudioHeader');

reciterSelect?.addEventListener('change', (e) => {
    currentReciter = e.target.value;
    if (currentSurahNumber) {
        loadSurah(currentSurahNumber, currentSurahName);
    }
});

audioPlayer?.addEventListener('ended', () => {
    currentAyahIndex++;
    if (currentAyahIndex < ayahsAudio.length) {
        playAyah(currentAyahIndex);
    }
});

audioPlayer?.addEventListener('play', () => {
    highlightAyah(currentAyahIndex);
});

function playAyah(index) {
    if(!audioPlayer) return;
    currentAyahIndex = index;
    audioPlayer.src = ayahsAudio[index];
    audioPlayer.play();
    highlightAyah(index);
}

function highlightAyah(index) {
    document.querySelectorAll('.ayah-text').forEach(el => el.style.color = '');
    const currentSpan = document.getElementById('ayah-' + index);
    if(currentSpan) {
        currentSpan.style.color = 'var(--secondary-color)';
    }
}

async function initQuran() {
    if (surahsData.length > 0) return; // Already loaded

    const surahList = document.getElementById('surahList');
    surahList.innerHTML = '<li>جاري التحميل...</li>';

    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        surahsData = data.data;
        renderSurahList(surahsData);
    } catch (error) {
        surahList.innerHTML = '<li>حدث خطأ في جلب بيانات القرآن.</li>';
    }
}

function renderSurahList(surahs) {
    const surahList = document.getElementById('surahList');
    surahList.innerHTML = '';
    
    surahs.forEach(surah => {
        const li = document.createElement('li');
        li.className = 'surah-item';
        li.innerHTML = `<strong>${surah.number}. سورة ${surah.name}</strong> - ${surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}`;
        li.addEventListener('click', () => {
            document.querySelectorAll('.surah-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            loadSurah(surah.number, surah.name);
        });
        surahList.appendChild(li);
    });
}

// Search functionality for Surahs (Optimized with Arabic Normalization)
function normalizeArabic(text) {
    if (!text) return '';
    return text
        .trim()
        .replace(/[أإآ]/g, 'ا') // توحيد الألف
        .replace(/ة/g, 'ه')   // توحيد التاء المربوطة والهاء
        .replace(/ى/g, 'ي')   // توحيد الألف اللينة والياء
        .replace(/[\u064B-\u065F]/g, ''); // إزالة التشكيل
}

document.getElementById('surahSearch')?.addEventListener('input', (e) => {
    const term = normalizeArabic(e.target.value);
    if (!term) {
        renderSurahList(surahsData);
        return;
    }
    const filtered = surahsData.filter(s => normalizeArabic(s.name).includes(term));
    renderSurahList(filtered);
});

async function loadSurah(number, name) {
    currentSurahNumber = number;
    currentSurahName = name;
    
    // Show audio header
    if(quranAudioHeader) quranAudioHeader.style.display = 'flex';

    const surahContent = document.getElementById('surahContent');
    surahContent.innerHTML = `<div class="placeholder-text">جاري تحميل سورة ${name}...</div>`;
    
    try {
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${number}/${currentReciter}`);
        const data = await response.json();
        const ayahs = data.data.ayahs;
        
        // Prepare audio array
        ayahsAudio = ayahs.map(a => a.audio);
        currentAyahIndex = 0;
        
        // Setup initial audio
        if(audioPlayer && ayahsAudio.length > 0) {
            audioPlayer.src = ayahsAudio[0];
        }
        
        let html = `<h3 style="color:var(--primary-color); margin-bottom:20px; font-family:'Cairo'; text-align:center;">سورة ${name}</h3>`;
        if (number !== 1 && number !== 9) {
            html += `<div style="text-align:center; margin-bottom:20px;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>`;
        }
        
        html += '<div style="text-align: justify; direction: rtl;">';
        ayahs.forEach((ayah, index) => {
            let text = ayah.text;
            if (number !== 1 && ayah.numberInSurah === 1 && text.startsWith('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ')) {
                text = text.replace('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ', '');
            }
            html += `<span id="ayah-${index}" class="ayah-text" style="cursor:pointer;" onclick="playAyah(${index})" title="انقر للاستماع">${text}</span> <span class="ayah-number" style="display:inline-flex; justify-content:center; align-items:center; width:30px; height:30px; background:var(--secondary-color); color:white; border-radius:50%; font-size:1rem; margin:0 5px; font-family:'Cairo';">${ayah.numberInSurah}</span> `;
        });
        html += '</div>';
        
        surahContent.innerHTML = html;
        
        // On mobile, scroll to content
        if (window.innerWidth <= 768) {
            document.getElementById('quranAudioHeader').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        surahContent.innerHTML = '<div class="placeholder-text">حدث خطأ في جلب السورة.</div>';
    }
}

// ==========================================
// 2. Prayer Times API
// ==========================================
function initPrayer() {
    const btn = document.getElementById('getLocationBtn');
    const status = document.getElementById('locationStatus');
    
    // Default load (Cairo)
    fetchPrayerTimesByCity('Cairo', 'Egypt');

    btn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            status.textContent = 'المتصفح الخاص بك لا يدعم تحديد الموقع.';
            return;
        }

        status.textContent = 'جاري تحديد الموقع...';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetchPrayerTimesByCoords(lat, lon);
                fetchQiblaDirection(lat, lon);
                status.textContent = 'تم جلب المواقيت والقبلة لموقعك الحالي.';
            },
            () => {
                status.textContent = 'تعذر الوصول لموقعك. تم عرض مواقيت القاهرة كافتراضي.';
                fetchPrayerTimesByCity('Cairo', 'Egypt');
                document.getElementById('qiblaContainer').style.display = 'none';
            }
        );
    });
}

async function fetchQiblaDirection(lat, lon) {
    try {
        const res = await fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lon}`);
        const data = await res.json();
        renderQibla(data.data.direction);
    } catch(e) {
        console.error('Error fetching Qibla', e);
    }
}

function renderQibla(direction) {
    const container = document.getElementById('qiblaContainer');
    const text = document.getElementById('qiblaText');
    const dial = document.getElementById('qiblaDial');
    
    if(!container || !text || !dial) return;

    container.style.display = 'block';
    // Format the number slightly nicely
    text.innerHTML = `الاتجاه: <strong>${direction.toFixed(1)}°</strong> درجة من مسار الشمال.`;
    dial.style.transform = `rotate(${direction}deg)`;
}

async function fetchPrayerTimesByCity(city, country) {
    try {
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=5`);
        const data = await res.json();
        renderPrayerTimes(data.data.timings);
    } catch(e) {
        console.error('Error fetching prayer times', e);
    }
}

async function fetchPrayerTimesByCoords(lat, lon) {
    try {
        const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=5`);
        const data = await res.json();
        renderPrayerTimes(data.data.timings);
    } catch(e) {
        console.error('Error fetching prayer times', e);
    }
}

function renderPrayerTimes(timings) {
    // Cache prayer times for countdown feature
    localStorage.setItem('qataif_prayer_times', JSON.stringify(timings));
    const grid = document.getElementById('prayerGrid');
    const prayers = [
        { key: 'Fajr', name: 'الفجر' },
        { key: 'Sunrise', name: 'الشروق' },
        { key: 'Dhuhr', name: 'الظهر' },
        { key: 'Asr', name: 'العصر' },
        { key: 'Maghrib', name: 'المغرب' },
        { key: 'Isha', name: 'العشاء' }
    ];

    grid.innerHTML = '';
    prayers.forEach(p => {
        // Convert to 12-hour format
        let [hours, minutes] = timings[p.key].split(':');
        let suffix = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12 || 12;
        
        const card = document.createElement('div');
        card.className = 'prayer-card';
        card.innerHTML = `
            <h4>${p.name}</h4>
            <p>${hours}:${minutes} ${suffix}</p>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// 3. Asmaul Husna API
// ==========================================
let asmaLoaded = false;

function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

async function initAsma() {
    if (asmaLoaded) return;
    const dayCard = document.getElementById('nameOfDayCard');
    const fullListContainer = document.getElementById('namesFullList');
    
    if (!dayCard || !fullListContainer) return;
    
    dayCard.innerHTML = 'جاري التحميل...';
    
    // Flatten all names from categories into a single array of 99 names
    const allNames = [];
    asmaulHusnaData.forEach(cat => {
        cat.names.forEach(n => {
            allNames.push({ ...n, category: cat.category });
        });
    });

    // 1. Render Name of the Day
    const dayOfYear = getDayOfYear();
    const pickIndex = dayOfYear % allNames.length;
    const nameOfTheDay = allNames[pickIndex];
    
    const imageUrl = `https://picsum.photos/seed/asma_${pickIndex}/800/400`;

    dayCard.innerHTML = `
        <div class="name-day-img" style="background-image: url('${imageUrl}');">
            <div class="name-day-overlay">
                <span class="badge" style="background:var(--secondary-color); color:var(--primary-color);">${nameOfTheDay.category}</span>
                <h3>اسم اليوم</h3>
                <h2>${nameOfTheDay.name}</h2>
            </div>
        </div>
        <div class="name-day-content">
            <div class="name-day-details">
                <h4><i class="fa-solid fa-book-open"></i> المعنى والشرح:</h4>
                <p style="font-size: 1.2rem; line-height: 1.8;">${nameOfTheDay.explanation}</p>
                
                <div style="margin-top:20px; padding-top:20px; border-top:1px dashed var(--border-color); display:flex; gap:15px; justify-content: center;">
                    <button onclick="shareAsma('${nameOfTheDay.name}', '${nameOfTheDay.explanation}')" class="btn secondary-btn" style="padding:10px 20px; font-size:0.9rem;"><i class="fa-solid fa-share-nodes"></i> مشاركة</button>
                    <button onclick="copyAsma('${nameOfTheDay.name}', '${nameOfTheDay.explanation}')" class="btn primary-btn" style="padding:10px 20px; font-size:0.9rem;"><i class="fa-solid fa-copy"></i> نسخ</button>
                </div>
            </div>
        </div>
    `;

    // 2. Render Full Categorized Grid
    fullListContainer.innerHTML = '';
    
    asmaulHusnaData.forEach(cat => {
        const catSection = document.createElement('div');
        catSection.className = 'asma-category-section';
        catSection.style.marginBottom = '40px';
        
        catSection.innerHTML = `
            <h3 class="category-title">${cat.category}</h3>
            <div class="asma-grid">
                <!-- Names will be injected here -->
            </div>
        `;
        
        const grid = catSection.querySelector('.asma-grid');
        cat.names.forEach(n => {
            const nameCard = document.createElement('div');
            nameCard.className = 'asma-mini-card';
            nameCard.innerHTML = `<h3>${n.name}</h3>`;
            nameCard.onclick = () => showAsmaDetail(n.name, n.explanation, cat.category);
            grid.appendChild(nameCard);
        });
        
        fullListContainer.appendChild(catSection);
    });

    asmaLoaded = true;
}

window.showAsmaDetail = function(name, explanation, category) {
    // Create a temporary modal for the detail view
    const modal = document.createElement('div');
    modal.className = 'modal showAsmaDetail';
    modal.style.cssText = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center;
        z-index: 3000; backdrop-filter: blur(5px);
    `;
    
    modal.innerHTML = `
        <div class="modal-content asma-detail-modal">
            <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            <div class="asma-detail-body">
                <span class="badge asma-detail-badge">${category}</span>
                <h2 class="asma-detail-title">${name}</h2>
                <div class="asma-detail-explanation">
                    ${explanation}
                </div>
                <div class="asma-detail-actions">
                    <button onclick="shareAsma('${name}', '${explanation}')" class="btn secondary-btn"><i class="fa-solid fa-share-nodes"></i> مشاركة</button>
                    <button onclick="copyAsma('${name}', '${explanation}')" class="btn primary-btn"><i class="fa-solid fa-copy"></i> نسخ</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
};

window.shareAsma = function(name, explanation) {
    const text = `اسم الله الحسنى: ${name}\nالشرح: ${explanation}\nعبر تطبيق قطايف الإسلامي`;
    if (navigator.share) {
        navigator.share({ title: 'أسماء الله الحسنى', text: text }).catch(() => {});
    } else {
        window.copyAsma(name, explanation);
    }
};

window.copyAsma = function(name, explanation) {
    const text = `اسم الله الحسنى: ${name}\nالشرح: ${explanation}`;
    navigator.clipboard.writeText(text).then(() => {
        if(window.showToast) window.showToast('تم نسخ الاسم والشرح بنجاح! ✨', 'success');
        else alert('تم النسخ بنجاح!');
    });
};

// ==========================================
// 4. Azkar (Comprehensive Multi-Category Data)
// ==========================================
const azkarData = {
    morning: [
        { text: "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", count: 1 },
        { text: "اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت وإليك النشور.", count: 1 },
        { text: "أصبحنا على فطرة الإسلام، وعلى كلمة الإخلاص، وعلى دين نبينا محمد صلى الله عليه وسلم.", count: 1 },
        { text: "اللهم إني أسألك العافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي.", count: 1 },
        { text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.", count: 3 },
        { text: "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً.", count: 3 },
        { text: "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.", count: 1 },
        { text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.", count: 7 },
        { text: "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت.", count: 3 },
        { text: "سبحان الله وبحمده عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته.", count: 3 },
        { text: "أعوذ بكلمات الله التامات من شر ما خلق.", count: 3 },
        { text: "اللهم إني أصبحت أشهدك، وأشهد حملة عرشك، وملائكتك، وجميع خلقك، أنك أنت الله لا إله إلا أنت.", count: 4 },
        { text: "اللهم ما أصبح بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.", count: 1 },
        { text: "سبحان الله وبحمده.", count: 100 },
        { text: "أستغفر الله وأتوب إليه.", count: 100 },
        { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير.", count: 10 },
        { text: "سيد الاستغفار: اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت...", count: 1 },
        { text: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه.", count: 3 },
        { text: "اللهم إني أسألك علماً نافعاً، ورزقاً طيباً، وعملاً متقبلاً.", count: 1 },
        { text: "يا رب لك الحمد كما ينبغي لجلال وجهك وعظيم سلطانك.", count: 3 }
    ],
    evening: [
        { text: "أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", count: 1 },
        { text: "اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت وإليك المصير.", count: 1 },
        { text: "أمسينا على فطرة الإسلام، وعلى كلمة الإخلاص، وعلى دين نبينا محمد صلى الله عليه وسلم.", count: 1 },
        { text: "اللهم إني أسألك العافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي.", count: 1 },
        { text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.", count: 3 },
        { text: "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً.", count: 3 },
        { text: "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.", count: 1 },
        { text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.", count: 7 },
        { text: "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت.", count: 3 },
        { text: "اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر، لا إله إلا أنت.", count: 3 },
        { text: "أعوذ بكلمات الله التامات من شر ما خلق.", count: 3 },
        { text: "اللهم إني أمسيت أشهدك، وأشهد حملة عرشك، وملائكتك، وجميع خلقك، أنك أنت الله لا إله إلا أنت.", count: 4 },
        { text: "اللهم ما أمسى بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.", count: 1 },
        { text: "سبحان الله وبحمده.", count: 100 },
        { text: "أستغفر الله وأتوب إليه.", count: 100 },
        { text: "أمسينا وأمسى الملك لله رب العالمين، اللهم إني أسألك خير هذه الليلة: فتحها، ونصرها، ونورها، وبركتها.", count: 1 },
        { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير.", count: 10 },
        { text: "سيد الاستغفار: اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت...", count: 1 },
        { text: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه.", count: 3 },
        { text: "يا رب لك الحمد كما ينبغي لجلال وجهك وعظيم سلطانك.", count: 3 }
    ],
    prayer: [
        { text: "دعاء الاستفتاح: سبحانك اللهم وبحمدك، وتبارك اسمك، وتعالى جدك، ولا إله غيرك.", count: 1 },
        { text: "أعوذ بالله من الشيطان الرجيم.", count: 1 },
        { text: "في الركوع: سبحان ربي العظيم.", count: 3 },
        { text: "في الركوع: سبوح قدوس رب الملائكة والروح.", count: 1 },
        { text: "الرفع من الركوع: سمع الله لمن حمده.", count: 1 },
        { text: "الاعتدال: ربنا ولك الحمد، حمداً كثيراً طيباً مباركاً فيه.", count: 1 },
        { text: "في السجود: سبحان ربي الأعلى.", count: 3 },
        { text: "في السجود: اللهم اغفر لي ذنبي كله دقه وجله وأوله وآخره وعلانيته وسره.", count: 1 },
        { text: "بين السجدتين: رب اغفر لي، رب اغفر لي.", count: 1 },
        { text: "بين السجدتين: اللهم اغفر لي وارحمني واهدني وعافني وارزقني.", count: 1 },
        { text: "التشهد الأول: التحيات لله والصلوات والطيبات، السلام عليك أيها النبي ورحمة الله وبركاته...", count: 1 },
        { text: "الصلاة الإبراهيمية: اللهم صل على محمد وعلى آل محمد كما صليت على إبراهيم وعلى آل إبراهيم...", count: 1 },
        { text: "الدعاء قبل السلام: اللهم إني أعوذ بك من عذاب القبر، ومن عذاب جهنم، ومن فتنة المحيا والممات...", count: 1 },
        { text: "الدعاء قبل السلام: اللهم إني ظلمت نفسي ظلماً كثيراً، ولا يغفر الذنوب إلا أنت، فاغفر لي مغفرة من عندك...", count: 1 },
        { text: "التسليم: السلام عليكم ورحمة الله.", count: 2 },
        { text: "عند سماع الأذان: الترديد مثل المؤذن إلا في حي على الصلاة والفلاح بقول: لا حول ولا قوة إلا بالله.", count: 1 },
        { text: "بعد الأذان: اللهم رب هذه الدعوة التامة، والصلاة القائمة، آت محمداً الوسيلة والفضيلة...", count: 1 },
        { text: "دعاء الاستفتاح (صيغة أخرى): اللهم باعد بيني وبين خطاياي كما باعدت بين المشرق والمغرب.", count: 1 },
        { text: "في الركوع: سبحانك اللهم ربنا وبحمدك، اللهم اغفر لي.", count: 3 },
        { text: "في السجود: اللهم لك سجدت، وبك آمنت، ولك أسلمت، سجد وجهي للذي خلقه وصوره...", count: 1 }
    ],
    after_prayer: [
        { text: "أستغفر الله. (ثلاثاً)", count: 3 },
        { text: "اللهم أنت السلام ومنك السلام تباركت يا ذا الجلال والإكرام.", count: 1 },
        { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. اللهم لا مانع لما أعطيت ولا معطي لما منعت.", count: 1 },
        { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. ولا حول ولا قوة إلا بالله.", count: 1 },
        { text: "سبحان الله. (تقال دبر كل صلاة)", count: 33 },
        { text: "الحمد لله. (تقال دبر كل صلاة)", count: 33 },
        { text: "الله أكبر. (تقال دبر كل صلاة)", count: 33 },
        { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير. (تمام المائة)", count: 1 },
        { text: "قراءة آية الكرسي: (اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...).", count: 1 },
        { text: "قراءة سورة الإخلاص.", count: 1 },
        { text: "قراءة سورة الفلق.", count: 1 },
        { text: "قراءة سورة الناس.", count: 1 },
        { text: "اللهم أعني على ذكرك وشكرك وحسن عبادتك.", count: 1 },
        { text: "اللهم إني أسألك علماً نافعاً، ورزقاً طيباً، وعملاً متقبلاً. (بعد الفجر)", count: 1 },
        { text: "اللهم أجرني من النار. (بعد المغرب والفجر)", count: 7 },
        { text: "لا إله إلا الله وحده لا شريك له، يحيي ويميت وهو على كل شيء قدير. (عشر مرات بعد الفجر والمغرب)", count: 10 },
        { text: "اللهم إني أسألك الجنة وأعوذ بك من النار.", count: 3 },
        { text: "اللهم اغفر لي ما قدمت وما أخرت وما أسررت وما أعلنت وما أسرفت وما أنت أعلم به مني.", count: 1 },
        { text: "اللهم بعلمك الغيب، وقدرتك على الخلق، أحيني ما علمت الحياة خيراً لي.", count: 1 },
        { text: "رب قني عذابك يوم تبعث عبادك.", count: 1 }
    ],
    sleep: [
        { text: "باسمك ربي وضعت جنبي، وبك أرفعه، فإن أمسكت نفسي فارحمها، وإن أرسلتها فاحفظها بما تحفظ به عبادك الصالحين.", count: 1 },
        { text: "اللهم خَلَقْتَ نفسي وأنت توفَّاها، لك مماتها ومحياها، إن أحييتها فاحفظها، وإن أمتها فاغفر لها.", count: 1 },
        { text: "باسمك اللهم أموت وأحيا.", count: 1 },
        { text: "يجمع كفيه ثم ينفث فيهما فيقرأ: سورة الإخلاص، وسورة الفلق، وسورة الناس، يمسح بها جسده.", count: 3 },
        { text: "قراءة آية الكرسي: تكفيك وتكون لك حرزاً ولا يقربك شيطان.", count: 1 },
        { text: "قراءة آخر آيتين من سورة البقرة: (آمن الرسول بما أنزل إليه...).", count: 1 },
        { text: "سبحان الله.", count: 33 },
        { text: "الحمد لله.", count: 33 },
        { text: "الله أكبر.", count: 34 },
        { text: "اللهم قني عذابك يوم تبعث عبادك.", count: 3 },
        { text: "اللهم أسلمت نفسي إليك، ووجهت وجهي إليك، وفوضت أمري إليك، وألجأت ظهري إليك رغبة ورهبة إليك.", count: 1 },
        { text: "اللهم رب السماوات السبع ورب العرش العظيم، ربنا ورب كل شيء، فالق الحب والنوى...", count: 1 },
        { text: "الحمد لله الذي أطعمنا وسقانا وكفانا وآوانا فكم ممن لا كافي له ولا مؤوي.", count: 1 },
        { text: "اللهم عالم الغيب والشهادة، فاطر السماوات والأرض، رب كل شيء ومليكه...", count: 1 },
        { text: "اللهم اكفني بحلالك عن حرامك، وأغنني بفضلك عمن سواك.", count: 1 },
        { text: "قراءة سورة تبارك (الملك) المانعة من عذاب القبر.", count: 1 },
        { text: "قراءة سورة السجدة قبل النوم.", count: 1 },
        { text: "اللهم إني أعوذ بوجهك الكريم، وكلماتك التامات من شر ما أنت آخذ بناصيته.", count: 1 },
        { text: "الحمد لله الذي كفاني وآواني وأطعمني وسقاني وكفاني.", count: 1 },
        { text: "لا إله إلا الله الواحد القهار، رب السماوات والأرض وما بينهما العزيز الغفار.", count: 1 }
    ],
    wake: [
        { text: "الحمد لله الذي أحيانا بعد ما أماتنا وإليه النشور.", count: 1 },
        { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير. سبحان الله، والحمد لله...", count: 1 },
        { text: "الحمد لله الذي عافاني في جسدي، وردّ عليّ روحي، وأذن لي بذكره.", count: 1 },
        { text: "سبحان الله وبحمده.", count: 10 },
        { text: "استغفر الله الذي لا إله إلا هو الحي القيوم وأتوب إليه.", count: 3 },
        { text: "اللهم ما أصبح بي من نعمة أو بأحد من خلقك فمنك وحدك.", count: 1 },
        { text: "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبيّاً.", count: 3 },
        { text: "اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت وإليك النشور.", count: 1 },
        { text: "سبحان الله وبحمده عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته.", count: 3 },
        { text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.", count: 3 },
        { text: "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله.", count: 1 },
        { text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.", count: 7 },
        { text: "ربي اغفر لي وارحمني.", count: 3 },
        { text: "لا حول ولا قوة إلا بالله العلي العظيم.", count: 10 },
        { text: "اللهم إني أسألك علماً نافعاً، ورزقاً طيباً، وعملاً متقبلاً.", count: 1 },
        { text: "لا إله إلا أنت سبحانك اللهم وبحمدك أستغفرك لذنبي، وأسألك رحمتك.", count: 1 },
        { text: "اللهم زدني علما، ولا تزغ قلبي بعد إذ هديتني وهب لي من لدنك رحمة إنك أنت الوهاب.", count: 1 },
        { text: "أصبحنا وأصبح الملك لله رب العالمين.", count: 1 },
        { text: "يا رب لك الحمد كما ينبغي لجلال وجهك وعظيم سلطانك.", count: 1 },
        { text: "اللهم إني أسألك خير هذا اليوم فتحه ونصره ونوره وبركته وهداه.", count: 1 }
    ]
};

function initAzkar() {
    renderAzkar('morning'); // default
}

function renderAzkar(type) {
    const azkarList = document.getElementById('azkarContent');
    const data = azkarData[type];
    
    azkarList.innerHTML = '';
    data.forEach((zekr, index) => {
        const card = document.createElement('div');
        card.className = 'zekr-card';
        card.innerHTML = `
            <div style="flex-grow: 1;">
                <p>${zekr.text}</p>
            </div>
            <div class="zekr-actions">
                <div style="display: flex; gap: 15px;">
                    <button class="zekr-btn like-btn" onclick="toggleZekrLike(this)" title="إعجاب"><i class="fa-regular fa-heart"></i></button>
                    <button class="zekr-btn" onclick="copyZekr('${zekr.text.replace(/'/g, "\\'")}')" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                    <button class="zekr-btn" onclick="shareZekr('${zekr.text.replace(/'/g, "\\'")}')" title="مشاركة"><i class="fa-solid fa-share-nodes"></i></button>
                </div>
                <button class="zekr-counter-btn" id="counter-${type}-${index}" onclick="incrementZekr('${type}', ${index}, ${zekr.count})">
                    <span id="count-val-${type}-${index}">0</span> / ${zekr.count} التكرار
                </button>
            </div>
        `;
        azkarList.appendChild(card);
    });
}

// Global functions attached to window for inline HTML onclick handlers
window.shareZekr = function(text) {
    if (navigator.share) {
        navigator.share({
            title: 'ذكر من موقع قطايف الإسلامي',
            text: text,
            url: window.location.href
        }).catch(err => console.log('Error sharing', err));
    } else {
        const tempInput = document.createElement("input");
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        alert('تم نسخ الذكر للحافظة بنجاح!');
    }
}

window.copyZekr = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        if(window.showToast) window.showToast('تم نسخ الذكر بنجاح! 📋', 'success');
        else alert('تم نسخ الذكر بنجاح!');
    });
}

window.toggleZekrLike = function(btn) {
    const icon = btn.querySelector('i');
    btn.classList.toggle('liked');
    if (btn.classList.contains('liked')) {
        icon.classList.replace('fa-regular', 'fa-solid');
        icon.style.color = 'var(--secondary-color)';
    } else {
        icon.classList.replace('fa-solid', 'fa-regular');
        icon.style.color = '';
    }
}

window.incrementZekr = function(type, index, maxCount) {
    const valSpan = document.getElementById(`count-val-${type}-${index}`);
    const btn = document.getElementById(`counter-${type}-${index}`);
    let current = parseInt(valSpan.textContent);
    
    if (current < maxCount) {
        current++;
        valSpan.textContent = current;
    }
    
    if (current >= maxCount) {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> اكتمل';
        btn.disabled = true;
    }
}

// ==========================================
// 5. Hadith (Curated, Extended & Categorized)
// ==========================================
// The categorizedHadiths and hadiths arrays are now loaded externally from assets/js/hadith-data.js

function initHadith() {
    renderCategorizedHadith("أحاديث الأخلاق");
    const hadithTabs = document.querySelectorAll('#hadithTabs .tab-btn');
    const searchInput = document.getElementById('hadithSearchInput');

    if(hadithTabs.length > 0) {
        hadithTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                if (searchInput) searchInput.value = ''; // clear search when tab changed
                hadithTabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderCategorizedHadith(btn.getAttribute('data-tab'));
            });
        });
    }

    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query === '') {
                const activeTab = document.querySelector('#hadithTabs .tab-btn.active');
                if (activeTab) renderCategorizedHadith(activeTab.getAttribute('data-tab'));
                else renderCategorizedHadith("أحاديث الأخلاق");
            } else {
                const results = hadiths.filter(h => h.text.toLowerCase().includes(query) || h.source.toLowerCase().includes(query));
                renderHadithList(results);
            }
        });
    }
}

function renderCategorizedHadith(category) {
    const items = categorizedHadiths[category] || [];
    renderHadithList(items);
}

function renderHadithList(items) {
    const container = document.getElementById('hadithContentList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; font-size: 1.2rem; color: #888; padding: 40px;">لا توجد أحاديث مطابقة لبحثك.</p>';
        return;
    }
    
    items.forEach(h => {
        const card = document.createElement('div');
        card.className = 'card box-shadowed';
        card.style.textAlign = 'right';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.justifyContent = 'space-between';
        card.style.position = 'relative';
        
        // Check if liked from localStorage
        const isLiked = localStorage.getItem(`hadith_like_${h.id}`) === 'true';
        const heartClass = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        const heartColor = isLiked ? 'var(--secondary-color)' : 'var(--text-color)';
        
        // Embed the hadith data securely inside the DOM for easy retrieval
        card.innerHTML = `
            <div id="hadith-capture-${h.id}">
                <p style="font-size: 1.15rem; line-height: 1.8; margin-bottom: 20px; color: var(--text-color);" id="hadith-text-${h.id}">"${h.text}"</p>
                <p style="text-align:left; color: var(--primary-color); font-size:1rem; font-family:'Cairo'; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <strong id="hadith-source-${h.id}">- ${h.source}</strong><br>
                    <span style="font-size:0.85rem; color:#888;" id="hadith-narrator-${h.id}">راوي الحديث: ${h.narrator || 'غير محدد'}</span>
                </p>
            </div>
            <div class="hadith-actions" style="display:flex; justify-content:flex-end; gap:20px; margin-top:15px; border-top:1px dashed var(--border-color); padding-top:15px;">
                <button onclick="toggleLike('${h.id}', this)" class="action-btn" title="إعجاب" style="background:none; border:none; cursor:pointer; font-size:1.3rem; color:${heartColor}; transition:color 0.3s;"><i class="${heartClass}"></i></button>
                <button onclick="copyHadithText('${h.id}')" class="action-btn hover-primary" title="نسخ الحديث" style="background:none; border:none; cursor:pointer; font-size:1.3rem; color:var(--text-color); transition:color 0.3s;"><i class="fa-regular fa-copy"></i></button>
                <button onclick="shareHadith('${h.id}')" class="action-btn hover-primary" title="مشاركة" style="background:none; border:none; cursor:pointer; font-size:1.3rem; color:var(--text-color); transition:color 0.3s;"><i class="fa-solid fa-share-nodes"></i></button>
                <button onclick="downloadHadithWallpaper('${h.id}')" class="action-btn hover-primary" title="تنزيل كصورة" style="background:none; border:none; cursor:pointer; font-size:1.3rem; color:var(--text-color); transition:color 0.3s;"><i class="fa-solid fa-image"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Interactive Hadith Functions

window.toggleLike = function(id, btnElement) {
    const isLiked = localStorage.getItem(`hadith_like_${id}`) === 'true';
    const icon = btnElement.querySelector('i');
    
    if (isLiked) {
        localStorage.setItem(`hadith_like_${id}`, 'false');
        icon.className = 'fa-regular fa-heart';
        btnElement.style.color = 'var(--text-color)';
    } else {
        localStorage.setItem(`hadith_like_${id}`, 'true');
        icon.className = 'fa-solid fa-heart';
        btnElement.style.color = 'var(--secondary-color)';
        // Optional animation
        icon.style.transform = 'scale(1.3)';
        setTimeout(() => icon.style.transform = 'scale(1)', 200);
    }
};

window.copyHadithText = function(id) {
    const text = document.getElementById(`hadith-text-${id}`).innerText;
    const source = document.getElementById(`hadith-source-${id}`).innerText;
    const fullText = `${text}\n${source}\n(تم النسخ من تطبيق قطايف)`;
    
    navigator.clipboard.writeText(fullText).then(() => {
        // Show lightweight toast or alert
        alert("تم نسخ الحديث بنجاح!");
    });
};

window.shareHadith = function(id) {
    const text = document.getElementById(`hadith-text-${id}`).innerText;
    const source = document.getElementById(`hadith-source-${id}`).innerText;
    const fullText = `${text}\n${source}\nعبر موقع قطايف الإسلامي`;
    
    if (navigator.share) {
        navigator.share({
            title: 'حديث نبوي شريف',
            text: fullText
        }).catch(err => console.log('Error sharing:', err));
    } else {
        window.copyHadithText(id);
        alert("تم نسخ الحديث! (المشاركة غير مدعومة في متصفحك الحالي)");
    }
};

window.downloadHadithWallpaper = function(id) {
    const textEl = document.getElementById(`hadith-text-${id}`);
    const sourceEl = document.getElementById(`hadith-source-${id}`);
    const narratorEl = document.getElementById(`hadith-narrator-${id}`);
    if (!textEl || !sourceEl) return;

    const hadithText = textEl.innerText;
    const hadithSource = sourceEl.innerText;
    const hadithNarrator = narratorEl ? narratorEl.innerText : '';

    // Canvas dimensions (phone wallpaper portrait)
    const W = 1080;
    const H = 1920;

    // Load background image first, then draw everything on canvas
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = 'assets/img/hadith_bg.png';

    bgImg.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // 1) Draw background image covering the full canvas
        ctx.drawImage(bgImg, 0, 0, W, H);

        // 2) Very light overlay so nature stays visible but text is readable
        ctx.fillStyle = 'rgba(0, 10, 30, 0.25)';
        ctx.fillRect(0, 0, W, H);

        // Text card area - semi-transparent panel in the center for readability
        const cardX = 40, cardY = 120, cardW = W - 80, cardH = H - 240;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        roundRect(ctx, cardX, cardY, cardW, cardH, 30);
        ctx.fill();

        // 3) Gold decorative border around the card
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
        ctx.lineWidth = 3;
        roundRect(ctx, cardX, cardY, cardW, cardH, 30);
        ctx.stroke();

        // Inner subtle border
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.lineWidth = 1;
        roundRect(ctx, cardX + 15, cardY + 15, cardW - 30, cardH - 30, 24);
        ctx.stroke();

        // 4) Top ornament – star and crescent unicode
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#D4AF37';
        ctx.font = '64px serif';
        ctx.textAlign = 'center';
        ctx.fillText('﴾ ﴿', W / 2, 220);

        // 5) Hadith text – auto-wrap with text shadow
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.font = '46px Amiri, serif';
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        const maxTextWidth = W - 200;
        const lines = wrapText(ctx, hadithText, maxTextWidth);
        const lineHeight = 78;
        // Center the text block vertically
        const totalTextH = lines.length * lineHeight;
        let startY = (H / 2) - (totalTextH / 2) + 30;
        lines.forEach((line, i) => {
            ctx.fillText(line, W / 2, startY + i * lineHeight);
        });

        // 6) Dashed separator line
        const sepY = startY + lines.length * lineHeight + 40;
        ctx.setLineDash([12, 8]);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(200, sepY);
        ctx.lineTo(W - 200, sepY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 7) Source
        ctx.fillStyle = '#D4AF37';
        ctx.font = '38px Cairo, sans-serif';
        ctx.fillText(hadithSource, W / 2, sepY + 60);

        // 8) Narrator
        if (hadithNarrator) {
            ctx.fillStyle = '#cccccc';
            ctx.font = '30px Cairo, sans-serif';
            ctx.fillText(hadithNarrator, W / 2, sepY + 115);
        }

        // 9) Footer branding
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '28px Cairo, sans-serif';
        ctx.fillText('☪  موقع قطايف الإسلامي', W / 2, H - 100);

        // 10) Download
        const link = document.createElement('a');
        link.download = `hadith_wallpaper_${id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    bgImg.onerror = function() {
        // Fallback: if the image fails to load, generate with a gradient
        alert('تعذر تحميل صورة الخلفية. سيتم استخدام خلفية افتراضية.');
        generateFallbackWallpaper(id, hadithText, hadithSource, hadithNarrator);
    };
};

// Utility: draw rounded rectangle path
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Utility: wrap text into lines that fit maxWidth
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

// Fallback wallpaper if background image fails
function generateFallbackWallpaper(id, text, source, narrator) {
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Gradient fallback
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0B3D6E');
    grad.addColorStop(1, '#041E42');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#D4AF37';
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.fillText('﴾ ﴿', W / 2, 180);

    ctx.fillStyle = '#fff';
    ctx.font = '46px Amiri, serif';
    ctx.direction = 'rtl';
    const lines = wrapText(ctx, text, W - 200);
    const lh = 78;
    const totalH = lines.length * lh;
    let sy = (H / 2) - (totalH / 2) + 30;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, sy + i * lh));

    const sepY = sy + lines.length * lh + 40;
    ctx.strokeStyle = 'rgba(212,175,55,0.5)';
    ctx.setLineDash([12, 8]);
    ctx.beginPath(); ctx.moveTo(200, sepY); ctx.lineTo(W - 200, sepY); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#D4AF37';
    ctx.font = '38px Cairo, sans-serif';
    ctx.fillText(source, W / 2, sepY + 60);

    if (narrator) {
        ctx.fillStyle = '#ccc';
        ctx.font = '30px Cairo, sans-serif';
        ctx.fillText(narrator, W / 2, sepY + 115);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '28px Cairo, sans-serif';
    ctx.fillText('☪  موقع قطايف الإسلامي', W / 2, H - 100);

    const link = document.createElement('a');
    link.download = `hadith_wallpaper_${id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ==========================================
// 6. Fatawa (Curated Array)
// ==========================================
const fatawaData = [
    // الطهارة والوضوء
    { q: "ما حكم قراءة القرآن من الهاتف المحمول بدون وضوء؟", a: "يجوز قراءة القرآن من الهاتف المحمول بدون وضوء، لأن مسّ الهاتف لا يعتبر كمسّ المصحف الورقي المباشر، ولكن الطهارة أفضل لتعظيم كلام الله. (الإسلام سؤال وجواب)" },
    { q: "هل يُنقض الوضوء بلمس المرأة؟", a: "اختلف الفقهاء في ذلك، والراجح عند كثير من العلماء أن لمس المرأة لا ينقض الوضوء ما لم يكن بشهوة، وهو اختيار شيخ الإسلام ابن تيمية. (فتاوى اللجنة الدائمة)" },
    { q: "هل خروج الدم ينقض الوضوء؟", a: "خروج الدم من غير السبيلين لا ينقض الوضوء على القول الراجح، سواء كان من جرح أو رعاف أو حجامة، وهو مذهب الشافعية واختيار ابن تيمية. (فتاوى ابن عثيمين)" },
    { q: "ما حكم المسح على الجوارب في الوضوء؟", a: "يجوز المسح على الجوارب (الشراب) إذا كانت ساترة للقدمين ومتماسكة، وذلك لمدة يوم وليلة للمقيم وثلاثة أيام بلياليها للمسافر. (فتاوى ابن باز)" },

    // الصلاة
    { q: "ما حكم تارك الصلاة؟", a: "تارك الصلاة عمداً تكاسلاً فيه خلاف بين العلماء، فمنهم من قال بكفره لحديث «بين الرجل وبين الكفر ترك الصلاة»، ومنهم من قال بعدم كفره لكنه على خطر عظيم. والواجب المسارعة إلى أدائها. (فتاوى ابن باز)" },
    { q: "هل يجوز الجمع بين الصلاتين بسبب المطر؟", a: "نعم يجوز الجمع بين الظهر والعصر وبين المغرب والعشاء في المسجد بسبب المطر الشديد الذي يبل الثياب ويشق معه الخروج. (فتاوى اللجنة الدائمة)" },
    { q: "ما حكم صلاة المرأة في المسجد؟", a: "يجوز للمرأة أن تصلي في المسجد، وصلاتها في بيتها أفضل لها لقوله ﷺ: «لا تمنعوا إماء الله مساجد الله وبيوتهن خير لهن». (صحيح أبي داود)" },
    { q: "ما حكم الصلاة بالحذاء؟", a: "تجوز الصلاة بالحذاء إذا كان طاهراً، لأن النبي ﷺ صلى في نعليه. ولكن في المساجد المفروشة ينبغي مراعاة نظافة المسجد. (فتاوى ابن عثيمين)" },
    { q: "هل يجوز قضاء الصلوات الفائتة جملة واحدة؟", a: "نعم من فاتته صلوات يقضيها بالترتيب مباشرة عند تذكرها لقوله ﷺ: «من نام عن صلاة أو نسيها فليصلها إذا ذكرها». ويجوز قضاؤها جملة واحدة. (صحيح مسلم)" },

    // الصيام
    { q: "ما حكم بَلع الريق أثناء الصيام؟", a: "بلع الريق لا يُفطر الصائم باتفاق العلماء، لأنه أمر طبيعي لا يمكن التحرز منه. (فتاوى ابن عثيمين)" },
    { q: "هل استخدام معجون الأسنان يُبطل الصيام؟", a: "لا يبطل الصيام باستخدام معجون الأسنان بشرط عدم بلع شيء منه، لكن الأحوط استخدام السواك تجنباً للخلاف. (فتاوى ابن باز)" },
    { q: "ما حكم الإفطار في رمضان بسبب المرض؟", a: "يجوز للمريض الإفطار في رمضان إذا كان الصيام يشق عليه أو يزيد مرضه أو يؤخر شفاءه، ويقضي ما أفطره بعد الشفاء. (الإسلام سؤال وجواب)" },
    { q: "هل الحقنة العضلية أو الوريدية تُفطر الصائم؟", a: "الحقنة العضلية والوريدية لا تفطر الصائم ما لم تكن مغذية. أما الحقن المغذية (مثل المحاليل) فتفطر لأنها تقوم مقام الطعام والشراب. (مجمع الفقه الإسلامي)" },
    { q: "ما حكم صيام ستة أيام من شوال؟", a: "صيام ست من شوال سنة مستحبة لقوله ﷺ: «من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر». ولا يشترط أن تكون متتابعة. (صحيح مسلم)" },

    // الزكاة والمال
    { q: "هل تجب الزكاة في الذهب الملبوس (الحلي)؟", a: "اختلف العلماء في ذلك: فذهب الحنابلة وبعض العلماء إلى وجوب الزكاة فيه، وذهب الجمهور إلى عدم وجوبها فيه إذا كان مُعداً للاستعمال. والأحوط إخراج زكاته. (فتاوى ابن باز)" },
    { q: "هل يجوز إخراج الزكاة للأقارب؟", a: "يجوز دفع الزكاة للأقارب الفقراء الذين لا تجب عليك نفقتهم كالأعمام والأخوال وأبنائهم، بل هم أولى بها لأنها صدقة وصلة. أما الوالدان والأولاد فلا تُدفع لهم الزكاة. (فتاوى ابن عثيمين)" },
    { q: "ما حكم تأخير إخراج الزكاة عن وقتها؟", a: "لا يجوز تأخير الزكاة بعد حولان الحول إلا لعذر شرعي كعدم وجود مستحقين أو غياب المال. ويجوز تعجيلها قبل الحول. (فتاوى اللجنة الدائمة)" },

    // الحج والعمرة
    { q: "هل يجوز أداء الحج عن الوالدين المتوفين؟", a: "نعم يجوز الحج عن الوالد المتوفى أو العاجز عن الحج بسبب مرض لا يُرجى شفاؤه، بشرط أن يكون الحاج قد حج عن نفسه أولاً. (فتاوى ابن باز)" },
    { q: "ما حكم العمرة في أشهر الحج؟", a: "تجوز العمرة في أشهر الحج (شوال، ذو القعدة، ذو الحجة) وقد اعتمر النبي ﷺ في ذي القعدة. (فتاوى اللجنة الدائمة)" },

    // الأذكار والدعاء
    { q: "ما هي أفضل أوقات استجابة الدعاء؟", a: "من أوقات الإجابة: ثلث الليل الأخير، بين الأذان والإقامة، في السجود، ساعة الاستجابة يوم الجمعة (آخر ساعة بعد العصر)، وعند نزول المطر. (فتاوى ابن باز وابن عثيمين)" },
    { q: "هل يشترط استقبال القبلة عند قراءة أذكار الصباح والمساء؟", a: "لا يشترط استقبال القبلة لقراءة الأذكار، بل يجوز ذكر الله في كل حال لقوله تعالى: {الَّذِينَ يَذْكُرُونَ اللَّهَ قِيَامًا وَقُعُودًا وَعَلَى جُنُوبِهِمْ}. لكن استقبال القبلة مستحب. (فتاوى ابن عثيمين)" },
    { q: "حكم الاستغفار بالسبحة الإلكترونية أو العادية؟", a: "لا حرج في استخدام السبحة العادية أو الإلكترونية لضبط عدد التسبيح والاستغفار، ولكن العقد بالأنامل (الأصابع) أفضل اتباعاً لسنة النبي ﷺ. (فتاوى ابن عثيمين)" },
    { q: "هل يجوز الدعاء بغير العربية في الصلاة؟", a: "الراجح جواز الدعاء بغير العربية لمن لا يستطيع العربية، أما من يستطيعها فالأفضل الدعاء بالعربية وبالأدعية المأثورة. (فتاوى اللجنة الدائمة)" },
    { q: "ما حكم رفع اليدين في الدعاء؟", a: "رفع اليدين في الدعاء سنة لقوله ﷺ: «إن الله حيي كريم يستحيي إذا رفع الرجل إليه يديه أن يردهما صفراً خائبتين». (سنن أبي داود)" },

    // اللباس والزينة
    { q: "ما حكم لبس الذهب للرجال؟", a: "يحرم على الرجال لبس الذهب بجميع أنواعه (خاتم، سلسلة، ساعة ذهبية) لقوله ﷺ وهو يمسك بحرير وذهب: «هذان حرام على ذكور أمتي حل لإناثها». (سنن أبي داود)" },
    { q: "ما حكم صبغ الشعر بالسواد؟", a: "اختلف العلماء في ذلك والراجح تحريمه لقوله ﷺ: «غيّروا هذا الشيب واجتنبوا السواد». ويجوز الصبغ بغير السواد كالحناء والبني. (صحيح مسلم)" },
    { q: "ما حكم تهذيب الحاجبين للمرأة؟", a: "النمص (إزالة شعر الحاجبين) محرم لأن النبي ﷺ لعن النامصة والمتنمصة. أما إزالة الشعر الذي ينبت بين الحاجبين أو الشعر الزائد الشاذ فلا بأس به. (فتاوى ابن عثيمين)" },

    // المعاملات المالية
    { q: "ما حكم الشراء بالتقسيط مع الزيادة في الثمن؟", a: "يجوز البيع بالتقسيط مع زيادة الثمن عن سعر النقد، لأنه بيع حلال بثمن مؤجل وهو من المعاملات المباحة شرعاً بشرط أن يُحدد الثمن والأقساط عند التعاقد. (مجمع الفقه الإسلامي)" },
    { q: "هل التأمين على السيارات حلال أم حرام؟", a: "التأمين التجاري فيه خلاف. ذهب كثير من العلماء إلى تحريمه لاشتماله على الغرر والجهالة. أما التأمين التعاوني (التكافلي) فهو جائز. وإذا أُلزم الإنسان بالتأمين الإجباري فلا إثم عليه. (مجمع الفقه الإسلامي)" },
    { q: "ما حكم العمل في البنوك الربوية؟", a: "العمل في البنوك الربوية في الأقسام التي تتعامل بالربا مباشرة (كقسم القروض) لا يجوز. أما الأعمال التي لا علاقة لها بالربا (كالحراسة والنظافة) ففيها خلاف والأحوط تركها. (فتاوى ابن عثيمين)" },
    { q: "ما حكم بيع وشراء العملات الرقمية (البيتكوين)؟", a: "اختلف العلماء المعاصرون فيها: منهم من أجازها بشرط التقابض الفوري عبر المنصات، ومنهم من حرّمها لما فيها من الغرر والمخاطرة العالية. والمسلم يحتاط لدينه. (هيئة كبار العلماء)" },

    // الأسرة والزواج
    { q: "هل يجوز للمرأة أن ترفض الزوج الذي اختاره لها والدها؟", a: "نعم، من حق المرأة البالغة أن ترفض من لا تريده، ولا يجوز إجبارها على الزواج بمن لا تريد لقوله ﷺ: «الأيم أحق بنفسها من وليها، والبكر تستأذن». (صحيح مسلم)" },
    { q: "ما حكم النظر إلى المخطوبة قبل الزواج؟", a: "يجوز بل يستحب للخاطب أن ينظر إلى مخطوبته لقوله ﷺ: «انظر إليها فإنه أحرى أن يؤدم بينكما». والنظر يكون بحضور محرم وبدون خلوة. (سنن الترمذي)" },
    { q: "هل يجب على الزوجة خدمة أهل زوجها؟", a: "لا يجب على الزوجة خدمة أهل زوجها شرعاً، ولكن إن فعلت ذلك بالمعروف فهو من حسن العشرة ومكارم الأخلاق. والزوج مطالب بأن يحسن التوفيق. (فتاوى ابن عثيمين)" },

    // الأطعمة والأشربة
    { q: "ما حكم أكل اللحوم المستوردة من بلاد غير إسلامية؟", a: "ذبائح أهل الكتاب (اليهود والنصارى) حلال بنص القرآن: {وَطَعَامُ الَّذِينَ أُوتُوا الْكِتَابَ حِلٌّ لَكُمْ}، بشرط أن تُذبح بطريقة لا تخالف الشريعة صراحة (كالخنق أو الصعق حتى الموت). (فتاوى ابن عثيمين)" },
    { q: "ما حكم أكل المأكولات البحرية؟", a: "جميع ما في البحر من أسماك وأحياء بحرية حلال بالإجماع لقوله ﷺ عن البحر: «هو الطهور ماؤه الحل ميتته». ويشمل ذلك الجمبري والأخطبوط ونحوها. (سنن أبي داود)" },
    { q: "ما حكم شرب القهوة والشاي؟", a: "شرب القهوة والشاي مباح ولا حرج فيه ما لم يصل إلى حد الإسراف أو الإضرار بالصحة. (فتاوى اللجنة الدائمة)" },

    // التكنولوجيا والمعاصر
    { q: "ما حكم استخدام وسائل التواصل الاجتماعي؟", a: "استخدام وسائل التواصل الاجتماعي مباح في الأصل، ويحرم استخدامها في المحرمات كالغيبة والنميمة ونشر الفتن والصور المحرمة. والمسلم مسؤول عما ينشره ويشاركه. (الإسلام سؤال وجواب)" },
    { q: "هل يجوز تصوير الإنسان بالكاميرا أو الهاتف؟", a: "التصوير الفوتوغرافي (الكاميرا) اختلف فيه العلماء المعاصرون، والراجح جوازه للحاجة وعدم التعظيم، لأنه حبس للظل وليس كالتصوير اليدوي. مع تجنب ما فيه محرم. (فتاوى ابن عثيمين)" },
    { q: "ما حكم الألعاب الإلكترونية (الفيديو جيمز)؟", a: "الأصل فيها الإباحة ما لم تشتمل على محرمات كالعري أو الموسيقى المحرمة أو تعظيم رموز الكفر، وما لم تُلهِ عن الصلاة والواجبات الشرعية. (الإسلام سؤال وجواب)" },
    { q: "هل يجوز بيع الحيوانات الأليفة كالقطط؟", a: "اختلف العلماء في بيع القطط: فذهب بعضهم إلى تحريمه لحديث النهي عن ثمن الهر، وأجازه آخرون لأنها حيوان منتفع به. والأحوط عدم المتاجرة بها. (فتاوى ابن باز)" },

    // الجنائز والموت
    { q: "هل يجوز زيارة القبور للنساء؟", a: "اختلف العلماء في زيارة النساء للقبور: فذهب الحنابلة إلى الكراهة أو التحريم لحديث «لعن رسول الله زائرات القبور»، وأجازه بعض العلماء للاتعاظ دون نياحة. (فتاوى ابن باز)" },
    { q: "ما حكم التعزية ومدتها؟", a: "التعزية سنة مؤكدة، وهي جائزة قبل الدفن وبعده. وليس لها مدة محددة شرعاً، لكن بعض العلماء استحبها في الثلاثة أيام الأولى. والمنهي عنه المبالغة في مراسم العزاء. (فتاوى ابن عثيمين)" },
    { q: "هل يصل ثواب قراءة القرآن للميت؟", a: "اختلف العلماء في ذلك: فالحنابلة يرون وصول ثوابها إذا أهداها القارئ للميت، والشافعية يرون عدم وصولها. والراجح جواز الدعاء للميت والصدقة عنه باتفاق. (فتاوى ابن تيمية)" },

    // السفر
    { q: "ما حكم قصر الصلاة في السفر؟", a: "قصر الصلاة الرباعية (الظهر والعصر والعشاء) إلى ركعتين في السفر سنة مؤكدة ورخصة من الله، والأفضل الأخذ بها لقوله ﷺ: «صدقة تصدق الله بها عليكم فاقبلوا صدقته». (صحيح مسلم)" },
    { q: "متى يبدأ المسافر في القصر والجمع؟", a: "يبدأ المسافر في القصر إذا فارق عامر بلده (خرج من حدود المدينة). ومسافة القصر عند الجمهور حوالي 80 كم. ويستمر القصر ما لم ينوِ الإقامة أكثر من 4 أيام عند الجمهور. (فتاوى ابن باز)" },

    // النوافل والعبادات
    { q: "ما حكم صلاة التهجد وكم عدد ركعاتها؟", a: "صلاة التهجد سنة مؤكدة وهي أفضل الصلوات بعد الفريضة. وليس لها عدد محدد لكن الأفضل إحدى عشرة أو ثلاث عشرة ركعة اقتداءً بالنبي ﷺ. (صحيح البخاري)" },
    { q: "ما حكم صلاة الضحى وأفضل وقتها؟", a: "صلاة الضحى سنة مؤكدة، أقلها ركعتان وأكثرها ثماني ركعات. وأفضل وقتها عند اشتداد الحر أي بعد ارتفاع الشمس بنحو ساعة. (صحيح مسلم)" },
    { q: "ما حكم صلاة الاستخارة وكيفيتها؟", a: "صلاة الاستخارة سنة مستحبة عند الحاجة لاتخاذ قرار. يصلي ركعتين ثم يدعو بدعاء الاستخارة المعروف. ولا يُشترط رؤية منام بعدها بل يمضي لما انشرح له صدره. (صحيح البخاري)" },

    // متفرقات
    { q: "ما حكم الاحتفال بعيد الميلاد (Birthday)؟", a: "اختلف العلماء فيه: فذهب كثير من العلماء إلى عدم جوازه لأنه من عادات غير المسلمين. وأجاز بعض المعاصرين إظهار الفرح دون اعتقاد أنه عبادة. والأحوط تركه. (فتاوى اللجنة الدائمة)" },
    { q: "هل يجوز تربية الكلاب في المنزل؟", a: "لا يجوز اقتناء الكلب إلا لحاجة كالحراسة أو الصيد أو الزراعة، لقوله ﷺ: «من اقتنى كلباً إلا كلب صيد أو ماشية أو زرع فإنه ينقص من أجره كل يوم قيراطان». (صحيح مسلم)" },
    { q: "ما حكم الوشم (التاتو)؟", a: "الوشم حرام شرعاً لقوله ﷺ: «لعن الله الواشمة والمستوشمة». ويشمل ذلك الوشم الدائم. أما الرسم المؤقت (كالحناء) فجائز. (صحيح البخاري)" },
    { q: "هل يأثم من أكل أو شرب ناسياً وهو صائم؟", a: "من أكل أو شرب ناسياً وهو صائم فصيامه صحيح ولا قضاء عليه ولا كفارة لقوله ﷺ: «من نسي وهو صائم فأكل أو شرب فليتم صومه فإنما أطعمه الله وسقاه». (صحيح البخاري)" }
];

let fatawaInit = false;
function initFatawa() {
    if (fatawaInit) return;
    const container = document.getElementById('fatawaContent');
    container.innerHTML = '';
    
    fatawaData.forEach(fatwa => {
        const card = document.createElement('details');
        card.className = 'fatwa-card';
        card.innerHTML = `
            <summary>${fatwa.q}</summary>
            <div class="fatwa-answer">
                <p>${fatwa.a}</p>
                <button class="action-btn" onclick="copyFatwa('${fatwa.q.replace(/'/g, "\\'")}', '${fatwa.a.replace(/'/g, "\\'")}')" style="margin-top:10px; font-size:0.9rem; color:var(--primary-color); border:1px solid var(--primary-color); padding:4px 10px; border-radius:15px; background:none; cursor:pointer;">
                    <i class="fa-regular fa-copy"></i> نسخ السؤال والإجابة
                </button>
            </div>
        `;
        container.appendChild(card);
    });
    fatawaInit = true;
}

window.copyFatwa = function(q, a) {
    const fullText = `السؤال: ${q}\nالإجابة: ${a}\n(تم النسخ من تطبيق قطايف)`;
    navigator.clipboard.writeText(fullText).then(() => {
        if(window.showToast) window.showToast('تم نسخ الفتوى بنجاح! 📋', 'success');
    });
}

// ==========================================
// 7. Home Page Specific Logic
// ==========================================
async function initHome() {
    // 1. Fetch Prayer Times for Home (Cairo by default)
    try {
        const res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Cairo&country=Egypt&method=5');
        const data = await res.json();
        const timings = data.data.timings;
        const grid = document.getElementById('homePrayerGrid');
        
        const prayers = [
            { key: 'Fajr', name: 'الفجر' },
            { key: 'Sunrise', name: 'الشروق' },
            { key: 'Dhuhr', name: 'الظهر' },
            { key: 'Asr', name: 'العصر' },
            { key: 'Maghrib', name: 'المغرب' },
            { key: 'Isha', name: 'العشاء' }
        ];
        
        if (grid) {
            grid.innerHTML = '';
            prayers.forEach(p => {
                let [hours, minutes] = timings[p.key].split(':');
                let suffix = hours >= 12 ? 'م' : 'ص';
                hours = hours % 12 || 12;
                
                grid.innerHTML += `
                    <div class="mini-prayer">
                        <strong>${p.name}</strong>
                        <span>${hours}:${minutes}</span> <span style="font-size: 0.8em; color: #666;">${suffix}</span>
                    </div>
                `;
            });
        }
    } catch(e) {
        console.error('Error fetching home prayer times', e);
        const grid = document.getElementById('homePrayerGrid');
        if(grid) grid.innerHTML = 'حدث خطأ في جلب المواقيت.';
    }
    
    // 2. Load random Hadith for Home
    const hadithContainer = document.getElementById('homeHadithContent');
    if (hadithContainer) {
        const randomIndex = Math.floor(Math.random() * hadiths.length);
        const hadith = hadiths[randomIndex];
        hadithContainer.innerHTML = `
            <p>"${hadith.text}"</p>
            <p style="text-align:left; color: var(--primary-color); margin-top:10px; font-size:1rem; font-family:'Cairo';"><strong>- ${hadith.source}</strong></p>
        `;
    }

    // 3. Load Daily Interactive Question
    const dailyQuestions = [
        { q: "ما هي أطول سورة في القرآن الكريم؟", options: ["سورة البقرة", "سورة آل عمران", "سورة النساء", "سورة الأعراف"], answer: 0, reason: "سورة البقرة هي أطول سورة وتتكون من 286 آية." },
        { q: "كم عدد أركان الإسلام؟", options: ["٤ أركان", "٥ أركان", "٦ أركان", "٧ أركان"], answer: 1, reason: "أركان الإسلام خمسة: الشهادتان، إقام الصلاة، إيتاء الزكاة، صوم رمضان، وحج البيت." },
        { q: "من هو أول من آمن بالرسول ﷺ من الرجال؟", options: ["عمر بن الخطاب", "علي بن أبي طالب", "أبو بكر الصديق", "عثمان بن عفان"], answer: 2, reason: "أبو بكر الصديق رضي الله عنه هو أول من أسلم من الرجال الأحرار." },
        { q: "في أي شهر هجري فُرض صيام رمضان؟", options: ["شوال", "رجب", "شعبان", "رمضان"], answer: 2, reason: "فُرض صيام رمضان في شهر شعبان من السنة الثانية للهجرة." },
        { q: "ما هي السورة التي تعدل ثلث القرآن؟", options: ["سورة الفاتحة", "سورة الكوثر", "سورة الإخلاص", "سورة الكافرون"], answer: 2, reason: "سورة الإخلاص (قُلۡ هُوَ ٱللَّهُ أَحَدٌ)، قال النبي ﷺ: (والذي نفسي بيده إنها لتعدل ثلث القرآن)." },
        { q: "من هو الصحابي الملقب بذي النورين؟", options: ["أبو بكر الصديق", "عمر بن الخطاب", "عثمان بن عفان", "علي بن أبي طالب"], answer: 2, reason: "عثمان بن عفان رضي الله عنه، لأنه تزوج ابنتي رسول الله ﷺ رقية وأم كلثوم." },
        { q: "ما هو اسم ناقة النبي صلى الله عليه وسلم؟", options: ["القصواء", "العضباء", "الجدعاء", "البيداء"], answer: 0, reason: "اسمت ناقة النبي ﷺ القصواء، وهي التي هاجر عليها." },
        { q: "كم عدد سور القرآن الكريم؟", options: ["110 سورة", "112 سورة", "114 سورة", "116 سورة"], answer: 2, reason: "القرآن الكريم يتكون من 114 سورة." },
        { q: "ما هي السورة التي تسمى عروس القرآن؟", options: ["سورة يس", "سورة الرحمن", "سورة الواقعة", "سورة الملك"], answer: 1, reason: "سورة الرحمن تسمى عروس القرآن لجمال نسيجها وتكرار نداءاتها الإلهية." },
        { q: "من هو خطيب الأنبياء؟", options: ["هود عليه السلام", "صالح عليه السلام", "شعيب عليه السلام", "موسى عليه السلام"], answer: 2, reason: "شعيب عليه السلام لقبه خطيب الأنبياء لفصاحته وحسن مراجعته لقومه." },
        { q: "ما هي المعركة التي استشهد فيها حمزة بن عبد المطلب؟", options: ["بدر", "أحد", "الخندق", "خيبر"], answer: 1, reason: "استشهد أسد الله حمزة رضي الله عنه في غزوة أحد." },
        { q: "من هو النبي الذي ابتلعه الحوت؟", options: ["يوسف عليه السلام", "أيوب عليه السلام", "يونس عليه السلام", "زكريا عليه السلام"], answer: 2, reason: "يونس عليه السلام (ذا النون) ابتلعه الحوت فدعا ربه في الظلمات فنجاه." },
        { q: "كم عدد ركعات صلاة الفجر (الفريضة)؟", options: ["ركعة واحدة", "ركعتان", "ثلاث ركعات", "أربع ركعات"], answer: 1, reason: "صلاة الفجر ركعتان جهرية." },
        { q: "ما هو أطول لفظ في القرآن الكريم؟", options: ["فأحييناكم", "فأسقيناكموه", "فسيكفيكهم", "فسيقولون"], answer: 1, reason: "قوله تعالى (فَأَسۡقَيۡنَٰكُمُوهُ) في سورة الحجر هي أطول كلمة في القرآن." },
        { q: "ما هي السورة التي بدأت بدون بسملة؟", options: ["سورة الأنفال", "سورة التوبة", "سورة النمل", "سورة الممتحنة"], answer: 1, reason: "سورة التوبة (براءة) هي الوحيدة التي لا تبدأ بالبسملة." },
        { q: "من هي أم البشر؟", options: ["آدم عليه السلام", "مريم عليها السلام", "حواء عليها السلام", "آسيا عليها السلام"], answer: 2, reason: "حواء عليها السلام هي أم البشر وزوج آدم عليه السلام." },
        { q: "كم عدد أركان الإيمان؟", options: ["٥ أركان", "٦ أركان", "٧ أركان", "٨ أركان"], answer: 1, reason: "أركان الإيمان ستة: الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقدر خيره وشره." },
        { q: "ما هي قبلة المسلمين الأولى؟", options: ["الكعبة المشرفة", "المسجد النبوي", "المسجد الأقصى", "مقام إبراهيم"], answer: 2, reason: "المسجد الأقصى في القدس كان هو القبلة الأولى قبل تحويلها للكعبة." },
        { q: "من هو الذي لقب بسيف الله المسلول؟", options: ["خالد بن الوليد", "حمزة بن عبد المطلب", "جعفر بن أبي طالب", "زيد بن حارثة"], answer: 0, reason: "خالد بن الوليد رضي الله عنه لقبه النبي ﷺ بسيف الله المسلول." },
        { q: "ما هي السورة التي تنجي من عذاب القبر؟", options: ["سورة الكهف", "سورة الملك", "سورة السجدة", "سورة يس"], answer: 1, reason: "سورة الملك (تبارك)، قال عنها النبي ﷺ أنها المانعة المنجية من عذاب القبر." }
    ];

    const qText = document.getElementById('dailyQuestionText');
    const qOptions = document.getElementById('dailyQuestionOptions');
    
    if (qText && qOptions) {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        
        const qIndex = dayOfYear % dailyQuestions.length;
        const question = dailyQuestions[qIndex];
        
        qText.innerText = question.q;
        qOptions.innerHTML = '';
        
        question.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-btn';
            btn.innerText = opt;
            btn.onclick = function() {
                const allBtns = qOptions.querySelectorAll('.quiz-btn');
                allBtns.forEach(b => {
                    b.disabled = true;
                    b.style.cursor = 'default';
                });
                
                const feedback = document.getElementById('quizFeedback');
                feedback.style.display = 'block';
                
                if (idx === question.answer) {
                    btn.classList.add('correct');
                    feedback.innerHTML = `<span style="color: #046A38;"><i class="fa-solid fa-circle-check"></i> إجابة صحيحة!</span><br><span style="font-size:0.95rem; font-weight:normal; display:block; margin-top:5px;">${question.reason}</span>`;
                    feedback.style.backgroundColor = 'rgba(4, 106, 56, 0.1)';
                } else {
                    btn.classList.add('wrong');
                    allBtns[question.answer].classList.add('correct');
                    feedback.innerHTML = `<span style="color: #e74c3c;"><i class="fa-solid fa-circle-xmark"></i> إجابة خاطئة.</span><br><span style="font-size:0.95rem; font-weight:normal; display:block; margin-top:5px;">الجواب الصحيح هو: ${question.options[question.answer]}.<br>${question.reason}</span>`;
                    feedback.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
                }
            };
            qOptions.appendChild(btn);
        });
    }
}

// Initial Call to initialize home specific logic if any
document.addEventListener("DOMContentLoaded", () => {
    initHome();
    initNewFeatures();
});

// ==========================================
// NEW FEATURES
// ==========================================

function initNewFeatures() {
    initHijriDate();
    initPrayerCountdown();
    initTasbeeh();
    initStories();
    initDashboard();
    initStreakTracker();
    syncBottomNav();
}

// --- TOAST NOTIFICATION SYSTEM ---
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
};

// Replace all alert() calls with toast
window.copyHadithText = function(id) {
    const text = document.getElementById(`hadith-text-${id}`).innerText;
    const source = document.getElementById(`hadith-source-${id}`).innerText;
    const fullText = `${text}\n${source}\n(تم النسخ من تطبيق قطايف)`;
    navigator.clipboard.writeText(fullText).then(() => showToast('تم نسخ الحديث بنجاح! ✅', 'success'));
};

// --- HIJRI DATE ---
function initHijriDate() {
    const el = document.getElementById('hijriDate');
    if (!el) return;
    const months = ['محرم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
    const today = new Date();
    // Simple Hijri approximation (for display)
    fetch(`https://api.aladhan.com/v1/gpiToH/${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}`)
        .then(r=>r.json()).then(data => {
            const h = data.data.hijri;
            el.innerHTML = `<i class="fa-solid fa-calendar-days"></i> ${h.day} ${months[parseInt(h.month.number)-1]} ${h.year} هـ`;
        }).catch(() => {
            el.innerHTML = `<i class="fa-solid fa-calendar-days"></i> التقويم الهجري غير متاح حالياً`;
        });
}

// --- PRAYER COUNTDOWN ---
function initPrayerCountdown() {
    // Try to get prayer times from cached data
    setInterval(updatePrayerCountdown, 1000);
    updatePrayerCountdown();
}

function updatePrayerCountdown() {
    const el = document.getElementById('prayerCountdown');
    if (!el) return;
    const cached = localStorage.getItem('qataif_prayer_times');
    if (!cached) { el.innerHTML = '<i class="fa-solid fa-bell"></i> اضغط على المواقيت أولاً لتفعيل العداد'; return; }
    try {
        const timings = JSON.parse(cached);
        const prayerNames = {Fajr:'الفجر', Dhuhr:'الظهر', Asr:'العصر', Maghrib:'المغرب', Isha:'العشاء'};
        const now = new Date();
        for (const [key, name] of Object.entries(prayerNames)) {
            if (!timings[key]) continue;
            const [h,m] = timings[key].split(':').map(Number);
            const pTime = new Date(now); pTime.setHours(h,m,0,0);
            if (pTime > now) {
                const diff = pTime - now;
                const hrs = Math.floor(diff/3600000);
                const mins = Math.floor((diff%3600000)/60000);
                const secs = Math.floor((diff%60000)/1000);
                el.innerHTML = `<i class="fa-solid fa-bell"></i> ${name} بعد ${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
                return;
            }
        }
        el.innerHTML = '<i class="fa-solid fa-bell"></i> انتهت صلوات اليوم. غداً إن شاء الله';
    } catch(e) { el.innerHTML = '<i class="fa-solid fa-bell"></i> اضغط على المواقيت أولاً'; }
}

// --- TASBEEH COUNTER ---
let tasbeehCount = 0;
let tasbeehDailyTotal = parseInt(localStorage.getItem('qataif_tasbeeh_total') || '0');
const tasbeehDate = localStorage.getItem('qataif_tasbeeh_date');
if (tasbeehDate !== new Date().toDateString()) {
    tasbeehDailyTotal = 0;
    localStorage.setItem('qataif_tasbeeh_date', new Date().toDateString());
    localStorage.setItem('qataif_tasbeeh_total', '0');
}

function initTasbeeh() {
    document.getElementById('tasbeehTotal').textContent = `الإجمالي اليومي: ${tasbeehDailyTotal} تسبيحة`;
}

const tasbeehFadlData = {
    'سبحان الله': 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم.',
    'الحمد لله': 'أفضل الدعاء الحمد لله، وهي تملأ الميزان بالخير والبركة.',
    'الله أكبر': 'أحب الكلام إلى الله أربع: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر.',
    'لا إله إلا الله': 'أفضل الذكر لا إله إلا الله، وهي حصن المؤمن ومفتاح الجنة.',
    'أستغفر الله': 'من لزم الاستغفار جعل الله له من كل ضيق مخرجاً، ومن كل هم فرجاً.',
    'اللهم صلِ على محمد': 'من صلى عليّ صلاة واحدة صلى الله عليه بها عشراً.',
    'لا حول ولا قوة إلا بالله': 'هي كنز من كنوز الجنة، وبها تُصرف الهموم وتُقضى الحوائج.'
};

window.setTasbeehText = function(btn, text) {
    document.querySelectorAll('#tasbeeh .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tasbeehLabel').textContent = text;
    
    // Update Fadl text
    const fadlEl = document.getElementById('tasbeehFadl');
    if (fadlEl) {
        fadlEl.style.opacity = '0';
        setTimeout(() => {
            fadlEl.querySelector('span').textContent = tasbeehFadlData[text] || 'فضل الذكر عظيم عند الله.';
            fadlEl.style.opacity = '1';
        }, 200);
    }
    
    tasbeehCount = 0;
    document.getElementById('tasbeehCount').textContent = '0';
};

window.incrementTasbeeh = function() {
    tasbeehCount++;
    tasbeehDailyTotal++;
    document.getElementById('tasbeehCount').textContent = tasbeehCount;
    document.getElementById('tasbeehTotal').textContent = `الإجمالي اليومي: ${tasbeehDailyTotal} تسبيحة`;
    localStorage.setItem('qataif_tasbeeh_total', tasbeehDailyTotal.toString());
    // Vibrate on mobile
    if (navigator.vibrate) navigator.vibrate(30);
    // Milestone notification
    if (tasbeehCount === 33) showToast('ماشاء الله! أكملت 33 تسبيحة 🌟', 'success');
    if (tasbeehCount === 100) showToast('بارك الله فيك! 100 تسبيحة 🏆', 'success');
};

window.resetTasbeeh = function() {
    tasbeehCount = 0;
    document.getElementById('tasbeehCount').textContent = '0';
    showToast('تم إعادة العداد', 'info');
};

// --- ISLAMIC STORIES ---
const storiesData = [
    { title: "قصة هجرة النبي ﷺ", text: "لما اشتد إيذاء قريش للمسلمين أذن الله لنبيه بالهجرة إلى المدينة. خرج ﷺ مع أبي بكر الصديق ليلاً واختبأ في غار ثور ثلاثة أيام، حتى أن قريشاً وقفت على باب الغار فقال أبو بكر: لو نظر أحدهم تحت قدميه لرآنا. فقال ﷺ: «يا أبا بكر، ما ظنك باثنين الله ثالثهما».", category: "السيرة النبوية" },
    { title: "صبر بلال بن رباح", text: "كان بلال رضي الله عنه عبداً حبشياً أسلم فعذبه سيده أمية بن خلف بوضع الصخرة العظيمة على صدره في حر الشمس. وكان بلال يردد: «أحد.. أحد». حتى اشتراه أبو بكر الصديق وأعتقه، فأصبح مؤذن الرسول ﷺ.", category: "الصحابة" },
    { title: "خالد بن الوليد (سيف الله المسلول)", text: "لم يُهزم في أكثر من مئة معركة خاضها. في معركة مؤتة، تكسرت في يده تسع سيوف من شدة القتال. قال عنه النبي ﷺ: «نعم عبد الله خالد بن الوليد، سيف من سيوف الله سله الله على المشركين». كان عبقرياً في التخطيط العسكري وفتح بلاد الشام والعراق.", category: "أبطال الإسلام" },
    { title: "علي بن أبي طالب (الفدائي الأول)", text: "عندما هاجر النبي ﷺ، نام علي رضي الله عنه في فراش النبي ليؤدي الأمانات إلى أهلها ويُعمي بصر قريش. وهو زوج ابنة الرسول فاطمة الزهراء، وأول من أسلم من الصبيان. عُرف بشجاعته الفائقة في غزوات النبي وحكمته وعلمه الغزير.", category: "الصحابة" },
    { title: "أبو عبيدة عامر بن الجراح (أمين الأمة)", text: "قال عنه النبي ﷺ: «إن لكل أمة أميناً، وأمين هذه الأمة أبو عبيدة عامر بن الجراح». هاجر للهجرتين، وشهد المشاهد كلها. كان يتسم بالزهد والتواضع الشديد مع قوته في الحق، وهو الغالب لبلاد الشام وقائد جيوشها في عهد عمر رضي الله عنه.", category: "الصحابة" },
    { title: "صدق أبو بكر الصديق", text: "في رحلة الإسراء والمعراج، كذب المشركون النبي ﷺ، فذهبوا لأبي بكر ليختبروه، فقال: «إن كان قال فقد صدق». فلقبه النبي بالصديق. كان أول من آمن من الرجال ورفيق النبي في الهجرة، وأنفق ماله كله في سبيل الله.", category: "الصحابة" },
    { title: "عثمان بن عفان (ذو النورين)", text: "اشتهر عثمان رضي الله عنه بشدة الحياء والكرم. جهز جيش العسرة من ماله الخاص، واشترى بئر رومة وجعلها وقفاً للمسلمين. تستحي منه ملائكة الرحمن كما أخبر النبي ﷺ، وكان يختم القرآن في ركعة واحدة.", category: "الصحابة" },
    { title: "شجاعة السيدة زينب بنت علي", text: "عُرفت زينب رضي الله عنها بـ 'بطلة كربلاء'، وقفت بكل قوة وبلاغة أمام الطغاة لتدافع عن الحق بعد استشهاد أخيها الحسين. كانت عالمة، زاهدة، وفصيحة اللسان، ومثالاً يحتذى به في الصبر والثبات.", category: "أبطال الإسلام" },
    { title: "شهامة صلاح الدين الأيوبي", text: "قائد محرر القدس، عُرف بفروسيته ونبله. يُحكى أنه أرسل الفواكه والثلج لعدوه ريتشارد قلب الأسد عندما علم بمرضه أثناء الحروب. كان مثالاً للقائد المسلم الذي يجمع بين القوة والرحمة والعدل.", category: "من التاريخ" },
    { title: "الإمام البخاري وطلب الحديث", text: "سافر آلاف الكيلومترات لجمع أحاديث النبي ﷺ. يُحكى أنه رأى رجلاً يوهم فرسه بالطعام ليصيده، فرفض البخاري أن يأخذ منه حديثاً قائلاً: 'من يكذب على حيوان لا يؤمن أن يكذب على رسول الله'. مثال في الأمانة العلمية.", category: "من التاريخ" },
    { title: "قصة نملة سليمان", text: "ذكر القرآن قول نملة: {يَا أَيُّهَا النَّمْلُ ادْخُلُوا مَسَاكِنَكُمْ لَا يَحْطِمَنَّكُمْ سُلَيْمَانُ وَجُنُودُهُ}. فتبسم سليمان عليه السلام من قولها شاكراً لله. علمتنا النملة الإيجابية والحرص على الجماعة وحسن الظن بالأنبياء.", category: "قصص القرآن" },
    { title: "الغلام وأصحاب الأخدود", text: "غلام آمن بالله فآمن بسببه أهل قرية كاملة. غضب الملك الظالم وحفر الأخدود وألقى فيه المؤمنين، لكنهم ثبتوا على دينهم حتى النفس الأخير. قصة عظيمة في التضحية من أجل المبدأ والإيمان الحق.", category: "قصص القرآن" },
    { title: "جعفر الطيار أمام النجاشي", text: "في هجرة الحبشة، وقف جعفر بن أبي طالب رضي الله عنه أمام ملك الحبشة بطلاقة، فقرأ عليه سورة مريم، فبكى النجاشي وقال: 'إن هذا والذي جاء به موسى ليخرج من مشكاة واحدة'. فحمى المسلمين وأكرمهم.", category: "الصحابة" },
    { title: "معجزة الإسراء والمعراج", text: "أسرى الله بنبيه ليلاً من مكة للقدس، ثم عرج به للسماوات العلا. رأى فيها الأنبياء والجنة والنار، وفُرضت فيها الصلوات الخمس. كانت رحلة مواساة للنبي وتكريماً له بعد عام الحزن وتضييق قريش.", category: "السيرة النبوية" },
    { title: "قصة نبي الله يوسف عليه السلام", text: "ألقاه إخوته في البئر حسداً، ثم بِيع عبداً في مصر، ثم دخل السجن ظلماً، لكنه صبر واتقى الله حتى مكّنه الله في الأرض وصار عزيز مصر. قصة عظيمة في الصبر على البلاء والتوكل على الله.", category: "قصص الأنبياء" },
    { title: "قصة أصحاب الكهف", text: "فتية آمنوا بربهم في زمن ملك كافر، ففروا بدينهم إلى كهف فأنامهم الله 309 سنين ثم بعثهم ليعلم الناس أن وعد الله حق وأن الساعة لا ريب فيها. قصة إيمان وثبات على الحق.", category: "قصص القرآن" },
    { title: "كرم حاتم الطائي", text: "اشتهر حاتم الطائي بالكرم حتى ضُرب به المثل. وقد امتدح النبي ﷺ كرمه لما جاءته ابنة حاتم أسيرة فأكرمها وقال: «إن أباها كان يحب مكارم الأخلاق». ثم أسلم ابنه عدي بن حاتم.", category: "من التاريخ" },
    { title: "قصة نبي الله أيوب عليه السلام", text: "ضُرب به المثل في الصبر، فقد ابتلاه الله في ماله وأهله وجسده لسنوات طويلة فصبر ولم يتذمر وقال: {أَنِّي مَسَّنِيَ الضُّرُّ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ}. فكشف الله ما به ورد عليه كل ما فقده وزيادة.", category: "قصص الأنبياء" }
];

function initStories() {
    const container = document.getElementById('storiesContent');
    const homeStory = document.getElementById('homeStoryContent');
    if (!container) return;

    // Daily story for home
    const dayIndex = new Date().getDate() % storiesData.length;
    const todaysStory = storiesData[dayIndex];
    if (homeStory) {
        homeStory.innerHTML = `<strong>${todaysStory.title}</strong><br>${todaysStory.text.substring(0, 150)}...`;
    }

    // Full stories page
    storiesData.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card box-shadowed';
        card.style.textAlign = 'right';
        card.innerHTML = `
            <span style="display:inline-block; background:var(--primary-color); color:white; padding:3px 12px; border-radius:20px; font-size:0.8rem; margin-bottom:12px;">${s.category}</span>
            <h3 style="color:var(--primary-color); margin-bottom:10px; font-size:1.2rem;">${s.title}</h3>
            <p style="line-height:1.9; color:var(--text-color);">${s.text}</p>
        `;
        container.appendChild(card);
    });
}

// --- DASHBOARD ---
function initDashboard() { updateDashboard(); }

function updateDashboard() {
    // Streak
    const streak = parseInt(localStorage.getItem('qataif_streak') || '0');
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.textContent = streak;

    // Tasbeeh total
    const tasbeehEl = document.getElementById('totalTasbeehStat');
    if (tasbeehEl) tasbeehEl.textContent = localStorage.getItem('qataif_tasbeeh_total') || '0';

    // Liked hadiths
    let likedCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('hadith_like_') && localStorage.getItem(key) === 'true') likedCount++;
    }
    const likedEl = document.getElementById('likedHadithsStat');
    if (likedEl) likedEl.textContent = likedCount;

    // Quiz correct
    const quizEl = document.getElementById('quizCorrectStat');
    if (quizEl) quizEl.textContent = localStorage.getItem('qataif_quiz_correct') || '0';
}

// --- STREAK TRACKER ---
function initStreakTracker() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('qataif_last_visit');
    let streak = parseInt(localStorage.getItem('qataif_streak') || '0');

    if (lastVisit !== today) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (lastVisit === yesterday.toDateString()) {
            streak++;
        } else if (lastVisit !== today) {
            streak = 1;
        }
        localStorage.setItem('qataif_streak', streak.toString());
        localStorage.setItem('qataif_last_visit', today);
    }
}

// --- BOTTOM NAV SYNC ---
function syncBottomNav() {
    const origNav = window.navigateTo;
    if (typeof origNav === 'function') {
        window._origNavigateTo = origNav;
    }
    window.navigateTo = function(target) {
        if (window._origNavigateTo) window._origNavigateTo(target);
        // Sync bottom nav
        document.querySelectorAll('.bottom-nav-item').forEach(a => {
            a.classList.toggle('active', a.getAttribute('data-target') === target);
        });
        // Update dashboard when switching to it
        if (target === 'dashboard') updateDashboard();
    };
}

