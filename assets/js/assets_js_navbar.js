// navbar.js - Gestione navbar e menu utente

document.addEventListener('DOMContentLoaded', function() {
    // Aggiorna informazioni utente nella navbar
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Aggiorna nome utente
    const userNameElements = document.querySelectorAll('.navbar .user-name');
    userNameElements.forEach(el => {
        el.textContent = user.name || 'Utente';
    });
    
    // Aggiorna avatar
    const userAvatarElements = document.querySelectorAll('.navbar .user-avatar');
    userAvatarElements.forEach(el => {
        if (el.tagName === 'IMG') {
            el.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}`;
        }
    });
    
    // Gestisci logout
    const logoutLinks = document.querySelectorAll('[data-action="logout"], .logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof window.performLogout === 'function') {
                window.performLogout();
            } else {
                if (confirm('Vuoi uscire?')) {
                    localStorage.clear();
                    window.location.href = 'login.html';
                }
            }
        });
    });
    
    // Evidenzia pagina attiva
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach(link => {
        if (link.href.includes(currentPage)) {
            link.classList.add('active');
        }
    });
});