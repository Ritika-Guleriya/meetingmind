/* ===================================
   AUTHENTICATION UTILITIES
   =================================== */

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.userEmail = localStorage.getItem('userEmail');
        this.userName = localStorage.getItem('userName');
        this.guestMode = localStorage.getItem('guestMode') === 'true';
    }

    isAuthenticated() {
        return !!this.token || this.guestMode;
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('guestMode');
        localStorage.removeItem('rememberMe');
        window.location.href = 'login.html';
    }

    getToken() {
        return this.token;
    }

    getUserInfo() {
        return {
            email: this.userEmail,
            name: this.userName,
            isGuest: this.guestMode
        };
    }
}

const authManager = new AuthManager();

// Check if user is authenticated
function checkAuth() {
    if (!authManager.isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Add auth header to fetch requests
async function authenticatedFetch(url, options = {}) {
    const headers = {
        ...options.headers,
    };

    if (authManager.getToken()) {
        headers['Authorization'] = `Bearer ${authManager.getToken()}`;
    }

    return fetch(url, {
        ...options,
        headers
    });
}
