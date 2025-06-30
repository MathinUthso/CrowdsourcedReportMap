// Homepage JavaScript functionality
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Get backend URL from settings
const API_BASE_URL = settings.backendUrl || 'http://127.0.0.1:3000';

// Initialize homepage
document.addEventListener('DOMContentLoaded', function() {
    loadLeaderboard();
    loadStats();
    setupMobileMenu();
    checkAuthStatus();
});

// Mobile menu functionality
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
}

// Load leaderboard data
async function loadLeaderboard() {
    try {
        console.log('Loading leaderboard from:', `${API_BASE_URL}/users/leaderboard`);
        const response = await fetch(`${API_BASE_URL}/users/leaderboard`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayLeaderboard(data.leaderboard);
        } else {
            console.error('Leaderboard API error:', data.error);
            displayLeaderboard([]);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        displayLeaderboard([]);
    }
}

// Display leaderboard
function displayLeaderboard(leaderboard) {
    const leaderboardList = document.getElementById('leaderboard-list');
    
    if (!leaderboardList) {
        console.error('Leaderboard list element not found');
        return;
    }
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = `
            <div class="leaderboard-item">
                <div class="rank">-</div>
                <div class="user-info">
                    <div class="user-details">
                        <h4>No data available</h4>
                        <p>Be the first to contribute!</p>
                    </div>
                </div>
                <div class="points">-</div>
                <div class="reports">-</div>
            </div>
        `;
        return;
    }
    
    leaderboardList.innerHTML = leaderboard.map((user, index) => {
        const rankClass = index < 3 ? `top-${index + 1}` : '';
        const rank = index + 1;
        
        return `
            <div class="leaderboard-item">
                <div class="rank ${rankClass}">${rank}</div>
                <div class="user-info">
                    <div class="user-avatar">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details">
                        <h4>${user.username}</h4>
                        <p>Member since ${new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="points">${user.total_points}</div>
                <div class="reports">${user.total_reports}</div>
            </div>
        `;
    }).join('');
}

// Load homepage stats
async function loadStats() {
    try {
        console.log('Loading stats from:', `${API_BASE_URL}/stats/homepage`);
        const response = await fetch(`${API_BASE_URL}/stats/homepage`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('total-reports').textContent = data.stats.reports_today || 0;
            document.getElementById('active-users').textContent = data.stats.active_users || 0;
            document.getElementById('cities-covered').textContent = data.stats.cities_covered || 0;
        } else {
            console.error('Stats API error:', data.error);
            setDefaultStats();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        setDefaultStats();
    }
}

// Set default stats when API is not available
function setDefaultStats() {
    document.getElementById('total-reports').textContent = '150+';
    document.getElementById('active-users').textContent = '1,200+';
    document.getElementById('cities-covered').textContent = '25+';
}

// Check authentication status
function checkAuthStatus() {
    if (authToken) {
        // Verify token and get user info
        fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Token invalid');
            }
            return response.json();
        })
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                updateAuthUI();
            } else {
                localStorage.removeItem('authToken');
                authToken = null;
            }
        })
        .catch(error => {
            console.error('Auth check error:', error);
            localStorage.removeItem('authToken');
            authToken = null;
        });
    }
}

// Update authentication UI
function updateAuthUI() {
    const authButtons = document.querySelector('.nav-menu');
    
    if (!authButtons) {
        console.error('Auth buttons element not found');
        return;
    }
    
    if (currentUser) {
        authButtons.innerHTML = `
            <a href="#features" class="nav-link">Features</a>
            <a href="#leaderboard" class="nav-link">Leaderboard</a>
            <a href="#about" class="nav-link">About</a>
            <span class="user-welcome">Welcome, ${currentUser.username}</span>
            <button class="btn btn-primary" onclick="viewMap()">View Map</button>
            <button class="btn btn-secondary" onclick="logout()">Logout</button>
        `;
    } else {
        authButtons.innerHTML = `
            <a href="#features" class="nav-link">Features</a>
            <a href="#leaderboard" class="nav-link">Leaderboard</a>
            <a href="#about" class="nav-link">About</a>
            <button class="btn btn-primary" onclick="showLoginModal()">Login</button>
            <button class="btn btn-secondary" onclick="showSignupModal()">Sign Up</button>
        `;
    }
}

// Show login modal
function showLoginModal() {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (modal && loginForm && signupForm) {
        modal.classList.remove('hidden');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    }
}

// Show signup modal
function showSignupModal() {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (modal && loginForm && signupForm) {
        modal.classList.remove('hidden');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

// Close auth modal
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Show login form
function showLoginForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (loginForm && signupForm) {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    }
}

// Show signup form
function showSignupForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (loginForm && signupForm) {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

// Login function
async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            updateAuthUI();
            closeAuthModal();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Signup function
async function signup(event) {
    event.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateAuthUI();
            closeAuthModal();
            showNotification('Account created successfully!', 'success');
            loadLeaderboard(); // Refresh leaderboard
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    updateAuthUI();
    showNotification('Logged out successfully', 'success');
}

// View map function
function viewMap() {
    if (currentUser) {
        // User is logged in, redirect to main map
        window.location.href = './index.html';
    } else {
        // User is not logged in, show login modal
        showLoginModal();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 3000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
        font-family: courier, courier new, serif;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
    }
    
    .notification-content button {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .user-welcome {
        color: #ccc;
        font-weight: bold;
    }
`;
document.head.appendChild(style);

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('auth-modal');
    if (event.target === modal) {
        closeAuthModal();
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll effect to navbar
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(0, 0, 0, 0.95)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.background = 'rgba(0, 0, 0, 0.9)';
            navbar.style.boxShadow = 'none';
        }
    }
});

// Animate stats on scroll
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateNumbers();
        }
    });
}, observerOptions);

// Observe stats section
const statsSection = document.querySelector('.hero-stats');
if (statsSection) {
    observer.observe(statsSection);
}

// Animate numbers
function animateNumbers() {
    const numbers = document.querySelectorAll('.stat-number');
    numbers.forEach(number => {
        const target = parseInt(number.textContent.replace(/\D/g, ''));
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            number.textContent = Math.floor(current) + (number.textContent.includes('+') ? '+' : '');
        }, 16);
    });
} 