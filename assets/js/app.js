// Navigation Logic
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.page-section');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebar = document.getElementById('closeSidebar');

// Function to Toggle Sidebar
function toggleSidebar(show) {
    if (show) {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    } else {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Simple Router
function navigateTo(targetId) {
    if (!targetId) return;

    // Update active class on links (Sidebar & Bottom Nav)
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(link => {
        if (link.getAttribute('data-target') === targetId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update active class on sections
    sections.forEach(section => {
        if (section.id === targetId) {
            section.classList.add('active-section');
        } else {
            section.classList.remove('active-section');
        }
    });

    // Close sidebar after navigation
    toggleSidebar(false);
    
    // Close modal if open
    const loginModal = document.getElementById('loginModal');
    if(loginModal) loginModal.classList.remove('show');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Call section specific initialization
    const inits = {
        'quran': typeof initQuran === 'function' ? initQuran : null,
        'prayer': typeof initPrayer === 'function' ? initPrayer : null,
        'asma': typeof initAsma === 'function' ? initAsma : null,
        'hadith': typeof initHadith === 'function' ? initHadith : null,
        'azkar': typeof initAzkar === 'function' ? initAzkar : null,
        'fatawa': typeof initFatawa === 'function' ? initFatawa : null,
        'dashboard': typeof updateDashboard === 'function' ? updateDashboard : null
    };

    if (inits[targetId]) inits[targetId]();
}

// Sidebar Event Listeners
menuToggle.addEventListener('click', () => toggleSidebar(true));
closeSidebar.addEventListener('click', () => toggleSidebar(false));
sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

// Add click events to nav links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        navigateTo(targetId);
    });
});


// Tabs logic for Azkar
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        renderAzkar(tab);
    });
});

// Utility to create HTML elements easily
function createElement(tag, className, text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
}

// UI Controls (Theme, Font Size, Login)

// Font Size Logic
let currentFontSize = parseFloat(localStorage.getItem('baseFontSize')) || 16;
document.documentElement.style.fontSize = currentFontSize + 'px';

document.getElementById('btnIncreaseFont')?.addEventListener('click', () => {
    if (currentFontSize < 24) {
        currentFontSize += 1;
        document.documentElement.style.fontSize = currentFontSize + 'px';
        localStorage.setItem('baseFontSize', currentFontSize);
    }
});

document.getElementById('btnDecreaseFont')?.addEventListener('click', () => {
    if (currentFontSize > 12) {
        currentFontSize -= 1;
        document.documentElement.style.fontSize = currentFontSize + 'px';
        localStorage.setItem('baseFontSize', currentFontSize);
    }
});

// Theme Logic
const themeBtn = document.getElementById('btnThemeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

applyTheme(savedTheme);

themeBtn?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
});

// Login Modal Logic
const loginModal = document.getElementById('loginModal');
const btnLogin = document.getElementById('btnLogin');
const closeLoginModal = document.getElementById('closeLoginModal');

btnLogin?.addEventListener('click', () => {
    loginModal.classList.add('show');
});

closeLoginModal?.addEventListener('click', () => {
    loginModal.classList.remove('show');
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.classList.remove('show');
    }
});

// Generic Form Submit
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if(window.showToast) window.showToast('تم تسجيل الدخول بنجاح! 👋', 'success');
    else alert('تم تسجيل الدخول بنجاح!');
    document.getElementById('loginModal')?.classList.remove('show');
});

// Social Login Simulation
window.simulateSocialLogin = function(provider) {
    if(window.showToast) window.showToast(`تم تسجيل الدخول عبر ${provider} بنجاح!`, 'success');
    else alert(`تم تسجيل الدخول عبر ${provider} بنجاح!`);
    document.getElementById('loginModal')?.classList.remove('show');
};
