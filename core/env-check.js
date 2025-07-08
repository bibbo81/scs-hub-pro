(function() {
    'use strict';
    const host = window.location.hostname;
    window.isDemoEnv = host === 'localhost' || host === '127.0.0.1' || host.includes('demo');
})();
