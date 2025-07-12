// auth-utils.js - Utilità per autenticazione

(function() {
    'use strict';

    // Funzione di logout globale
    window.performLogout = function() {
        // Conferma logout
        const confirmLogout = confirm('Sei sicuro di voler uscire?');
        if (!confirmLogout) return;

        // Pulisci storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        sessionStorage.clear();

        // Redirect a login
        window.location.href = '/login.html';
    };

    // Aggiungi listener ai link di logout quando DOM è pronto
    document.addEventListener('DOMContentLoaded', function() {
        // Seleziona tutti i possibili link/bottoni di logout
        const logoutElements = document.querySelectorAll(
            '[data-action="logout"], ' +
            '[onclick*="logout"], ' +
            'a[href="#logout"], ' +
            '.logout-btn, ' +
            '#logoutBtn'
        );

        logoutElements.forEach(element => {
            element.addEventListener('click', function(e) {
                e.preventDefault();
                window.performLogout();
            });
        });
    });

    // Funzione per ottenere i dati dell'utente corrente
    window.getCurrentUser = function() {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return null;
        
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Errore parsing user data:', e);
            return null;
        }
    };

    // Funzione per verificare se l'utente ha un ruolo specifico
    window.hasRole = function(role) {
        const user = getCurrentUser();
        return user && user.role === role;
    };

    // Funzione per aggiornare UI con dati utente
    window.updateUserUI = function() {
        const user = getCurrentUser();
        if (!user) return;

        // Aggiorna nome utente
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = user.name || user.email;
        });

        // Aggiorna email
        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(el => {
            el.textContent = user.email;
        });

        // Aggiorna avatar
        const userAvatarElements = document.querySelectorAll('.user-avatar');
        userAvatarElements.forEach(el => {
            if (el.tagName === 'IMG') {
                el.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`;
            }
        });

        // Aggiorna ruolo
        const userRoleElements = document.querySelectorAll('.user-role');
        userRoleElements.forEach(el => {
            el.textContent = user.role || 'user';
        });
    };
})();