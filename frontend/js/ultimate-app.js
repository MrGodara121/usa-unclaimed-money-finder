// ========================================
// ULTIMATE APP - All 50 Features Frontend
// ========================================

// Global Variables
let currentUser = null;
let voiceRecognition = null;
let synth = window.speechSynthesis;
let chatMessages = [];

// ========================================
// Feature 2 & 28: Voice Search & Navigation
// ========================================

function initVoiceSearch() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRecognition();
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;
        voiceRecognition.lang = 'en-US';
        
        voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            handleVoiceInput(transcript);
        };
        
        voiceRecognition.onerror = (event) => {
            console.error('Voice error:', event.error);
            document.getElementById('voiceBtn')?.classList.remove('listening');
            showToast('Voice recognition error. Please try again.', 'error');
        };
    }
}

function startVoiceSearch() {
    if (!voiceRecognition) {
        initVoiceSearch();
    }
    
    const btn = document.getElementById('voiceBtn');
    btn.classList.add('listening');
    
    try {
        voiceRecognition.start();
    } catch (e) {
        console.error('Voice start error:', e);
    }
    
    // Auto-stop after 5 seconds
    setTimeout(() => {
        btn.classList.remove('listening');
        voiceRecognition.stop();
    }, 5000);
}

function handleVoiceInput(transcript) {
    document.getElementById('voiceBtn')?.classList.remove('listening');
    
    const lower = transcript.toLowerCase();
    
    // Check for navigation commands
    if (lower.includes('go to') || lower.includes('open')) {
        navigateByVoice(lower);
    } 
    // Check for search
    else if (lower.includes('search') || lower.includes('find')) {
        const name = lower.replace('search', '').replace('find', '').trim();
        if (name) {
            document.getElementById('searchInput').value = name;
            performSearch();
        }
    }
    // Default - treat as search
    else {
        document.getElementById('searchInput').value = transcript;
        performSearch();
    }
}

function startVoiceNavigation() {
    if (!voiceRecognition) {
        initVoiceSearch();
    }
    
    showToast('Say "go to [page]" to navigate', 'info');
    voiceRecognition.start();
}

function navigateByVoice(command) {
    const pages = {
        'home': '/',
        'search': '/search',
        'premium': '/premium',
        'stories': '/stories',
        'resources': '/resources',
        'blog': '/blog',
        'faq': '/resources/faq',
        'contact': '/contact',
        'about': '/about',
        'login': '/login',
        'signup': '/signup'
    };
    
    for (const [key, url] of Object.entries(pages)) {
        if (command.includes(key)) {
            window.location.href = url;
            return;
        }
    }
    
    showToast('Page not found. Try: home, search, premium', 'warning');
}

// ========================================
// Feature 1: AI Name Match Search
// ========================================

async function performSearch() {
    const input = document.getElementById('searchInput').value;
    if (!input) {
        showToast('Please enter a name', 'warning');
        return;
    }
    
    showLoader();
    
    try {
        // Try AI search first
        const aiResponse = await fetch('/api/ai-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input })
        });
        
        const aiData = await aiResponse.json();
        
        // Then do standard search
        const names = input.split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';
        
        const searchResponse = await fetch(`/api/search?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
        const searchData = await searchResponse.json();
        
        displayResults(aiData, searchData);
        
    } catch (error) {
        console.error('Search error:', error);
        showToast('Search failed. Please try again.', 'error');
    } finally {
        hideLoader();
    }
}

function displayResults(aiData, searchData) {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    
    let html = '<div class="results-container">';
    
    // AI Suggestions
    if (aiData.ai && aiData.ai.length > 0) {
        html += '<h3>🤖 AI Suggested Matches</h3>';
        html += '<div class="ai-results">';
        aiData.ai.forEach(match => {
            html += `
                <div class="result-card ai-highlight">
                    <div class="result-amount">$${match.amount}</div>
                    <div class="result-name">${match.name}</div>
                    <div class="result-location">${match.state}</div>
                    <div class="result-confidence">AI confidence: ${Math.round(match.similarity * 100)}%</div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    // Standard Results
    if (searchData.results && searchData.results.length > 0) {
        html += '<h3>📋 Exact Matches</h3>';
        html += '<div class="search-results">';
        searchData.results.forEach(result => {
            html += `
                <div class="result-card">
                    <div class="result-amount">$${result.amount}</div>
                    <div class="result-name">${result.firstName} ${result.lastName}</div>
                    <div class="result-location">${result.city}, ${result.state}</div>
                    <div class="result-type">${result.type}</div>
                    <button onclick="claimMoney('${result.id}')" class="btn-claim">Claim Now</button>
                </div>
            `;
        });
        html += '</div>';
    }
    
    if ((!aiData.ai || aiData.ai.length === 0) && (!searchData.results || searchData.results.length === 0)) {
        html += '<div class="no-results">No matches found. Try different spelling or check family names.</div>';
    }
    
    html += '</div>';
    resultsDiv.innerHTML = html;
}

// ========================================
// Feature 5: Document OCR Upload
// ========================================

function openUpload() {
    document.getElementById('fileUpload').click();
}

document.getElementById('fileUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoader();
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/ocr', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.names && data.names.length > 0) {
            document.getElementById('searchInput').value = data.names[0];
            showToast(`Found name: ${data.names[0]}`, 'success');
            performSearch();
        } else {
            showToast('No names found in document', 'warning');
        }
        
    } catch (error) {
        console.error('OCR error:', error);
        showToast('Failed to process document', 'error');
    } finally {
        hideLoader();
    }
});

// ========================================
// Feature 3: Family Tree Scan
// ========================================

async function scanFamily() {
    if (!currentUser) {
        showToast('Please login to use family scan', 'warning');
        return;
    }
    
    // Prompt for family names
    const names = prompt('Enter family names (comma separated):');
    if (!names) return;
    
    const familyList = names.split(',').map(n => n.trim());
    
    showLoader();
    
    try {
        const response = await fetch('/api/family-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: currentUser.userId,
                names: familyList 
            })
        });
        
        const data = await response.json();
        
        let message = `Found ${data.length} matches! Total: $${data.total}`;
        showToast(message, 'success');
        
        // Display results
        displayFamilyResults(data);
        
    } catch (error) {
        console.error('Family scan error:', error);
        showToast('Failed to scan family names', 'error');
    } finally {
        hideLoader();
    }
}

function displayFamilyResults(results) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    let html = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Family Scan Results</h3>
                <button onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div class="modal-body">
    `;
    
    results.forEach(result => {
        html += `
            <div class="family-result">
                <h4>${result.name}</h4>
                <p>Found $${result.total} in ${result.results.length} properties</p>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// ========================================
// Feature 4: AI Amount Predictor
// ========================================

async function predictAmount(state, type) {
    try {
        const response = await fetch(`/api/predict?state=${state}&type=${type}`);
        const data = await response.json();
        
        showToast(`Predicted amount: $${data.predicted} ($${data.min}-$${data.max})`, 'info');
        
    } catch (error) {
        console.error('Prediction error:', error);
    }
}

// ========================================
// Feature 6: AI Chatbot
// ========================================

function toggleChatbot() {
    document.getElementById('aiChatbot').classList.toggle('collapsed');
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    try {
        const response = await fetch('/api/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message,
                userId: currentUser?.userId 
            })
        });
        
        const data = await response.json();
        
        // Add bot response
        addChatMessage(data, 'bot');
        
    } catch (error) {
        console.error('Chatbot error:', error);
        addChatMessage('Sorry, I\'m having trouble. Please try again.', 'bot');
    }
}

function addChatMessage(text, sender) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ========================================
// Feature 8: AI Tax Calculator
// ========================================

async function calculateTax(amount, state) {
    try {
        const response = await fetch('/api/tax-calculator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, state })
        });
        
        const data = await response.json();
        
        showModal('Tax Calculation', `
            <p>Gross Amount: $${data.grossAmount}</p>
            <p>Federal Tax: $${data.federalTax}</p>
            <p>State Tax: $${data.stateTax}</p>
            <p>Total Tax: $${data.totalTax}</p>
            <p><strong>Net Amount: $${data.netAmount}</strong></p>
            <p>Effective Rate: ${data.effectiveRate}%</p>
        `);
        
    } catch (error) {
        console.error('Tax calculation error:', error);
    }
}

// ========================================
// Feature 9: AI Success Predictor
// ========================================

async function predictSuccess(recordId) {
    if (!currentUser) {
        showToast('Please login to see prediction', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/success-predictor?recordId=${recordId}&userId=${currentUser.userId}`);
        const data = await response.json();
        
        showModal('Success Probability', `
            <div class="probability-meter">
                <div class="meter-fill" style="width: ${data.probability}%"></div>
            </div>
            <p class="probability-text">${data.probability}% - ${data.level}</p>
            <h4>Factors:</h4>
            <ul>
                ${data.factors.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <p class="recommendation">${data.recommendation}</p>
        `);
        
    } catch (error) {
        console.error('Success predictor error:', error);
    }
}

// ========================================
// Feature 7: AI Fraud Detector (Admin)
// ========================================

async function checkFraud(claimData) {
    if (!currentUser?.isAdmin) return;
    
    try {
        const response = await fetch('/api/fraud-detector', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(claimData)
        });
        
        const data = await response.json();
        
        if (data.riskLevel === 'High') {
            showToast(`⚠️ High Risk: ${data.flags.join(', ')}`, 'error');
        } else if (data.riskLevel === 'Medium') {
            showToast(`⚠️ Medium Risk: Requires review`, 'warning');
        }
        
        return data;
        
    } catch (error) {
        console.error('Fraud detection error:', error);
    }
}

// ========================================
// Feature 10: AI Auto-Translate
// ========================================

async function translatePage(targetLang) {
    const elements = document.querySelectorAll('[data-translate]');
    
    for (const el of elements) {
        const text = el.textContent;
        
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, target: targetLang })
            });
            
            const data = await response.json();
            el.textContent = data.translated;
            
        } catch (error) {
            console.error('Translation error:', error);
        }
    }
}

// ========================================
// Feature 27: Dark/Light Mode
// ========================================

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const btn = document.querySelector('.theme-toggle');
    btn.textContent = newTheme === 'dark' ? '☀️' : '🌓';
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const btn = document.querySelector('.theme-toggle');
    if (btn) {
        btn.textContent = savedTheme === 'dark' ? '☀️' : '🌓';
    }
}

// ========================================
// Feature 31: SMS Alerts
// ========================================

async function subscribeSMS(phone) {
    if (!currentUser) {
        showToast('Please login first', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/sms-subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: currentUser.userId,
                phone 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('SMS alerts activated!', 'success');
        }
        
    } catch (error) {
        console.error('SMS subscription error:', error);
    }
}

// ========================================
// Feature 32: Email Weekly Report
// ========================================

async function subscribeEmail() {
    if (!currentUser) {
        showToast('Please login first', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/email-subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Weekly report subscribed!', 'success');
        }
        
    } catch (error) {
        console.error('Email subscription error:', error);
    }
}

// ========================================
// Feature 30: One-Click Claim
// ========================================

async function claimMoney(recordId) {
    if (!currentUser) {
        showToast('Please login to claim', 'warning');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        return;
    }
    
    // Check fraud first
    const fraudCheck = await checkFraud({ recordId, userId: currentUser.userId });
    
    if (fraudCheck?.riskLevel === 'High') {
        showModal('Claim Blocked', 'This claim has been flagged for review. Our team will contact you.');
        return;
    }
    
    if (fraudCheck?.requires2FA) {
        // Trigger 2FA
        verify2FA();
    }
    
    try {
        const response = await fetch('/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                recordId, 
                userId: currentUser.userId,
                premium: currentUser.premium 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showModal('Claim Started!', `
                <p>Your claim has been submitted.</p>
                ${data.form ? `<pre>${data.form}</pre>` : ''}
                <p>Check your email for next steps.</p>
            `);
        } else {
            showToast(data.error || 'Claim failed', 'error');
        }
        
    } catch (error) {
        console.error('Claim error:', error);
        showToast('Failed to submit claim', 'error');
    }
}

// ========================================
// Feature 37: 2-Factor Auth
// ========================================

async function verify2FA() {
    const code = prompt('Enter 2FA code:');
    if (!code) return;
    
    try {
        const response = await fetch('/api/verify-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: currentUser.userId,
                code 
            })
        });
        
        const data = await response.json();
        
        if (data.verified) {
            showToast('2FA verified', 'success');
        } else {
            showToast('Invalid code', 'error');
        }
        
    } catch (error) {
        console.error('2FA error:', error);
    }
}

// ========================================
// Feature 39: Auto Logout
// ========================================

let logoutTimer;

function resetLogoutTimer() {
    if (logoutTimer) clearTimeout(logoutTimer);
    
    if (currentUser) {
        logoutTimer = setTimeout(() => {
            showToast('Session expired. Please login again.', 'warning');
            window.location.href = '/login';
        }, 15 * 60 * 1000); // 15 minutes
    }
}

['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
    document.addEventListener(event, resetLogoutTimer);
});

// ========================================
// Feature 43: Viral Share Cards
// ========================================

function share(platform) {
    const url = window.location.href;
    const text = encodeURIComponent('I found my unclaimed money with USA Unclaimed Finder! You might have money too. Search for free: https://usaunclaimed.com');
    
    const shareUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${text}`,
        twitter: `https://twitter.com/intent/tweet?text=${text}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        whatsapp: `https://wa.me/?text=${text}`,
        reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${text}`
    };
    
    if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
}

function copyShareLink() {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied to clipboard!', 'success');
}

// ========================================
// Feature 45: Leaderboard
// ========================================

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        
        const leaderboardEl = document.getElementById('leaderboard');
        if (!leaderboardEl) return;
        
        let html = '<h3>🏆 Top Finders</h3><ol>';
        data.forEach((user, i) => {
            html += `<li>${user.name} - $${user.amount} (${user.state})</li>`;
        });
        html += '</ol>';
        
        leaderboardEl.innerHTML = html;
        
    } catch (error) {
        console.error('Leaderboard error:', error);
    }
}

// ========================================
// Feature 46: Badge System
// ========================================

function displayBadges(badges) {
    if (!badges || badges.length === 0) return;
    
    const badgeContainer = document.createElement('div');
    badgeContainer.className = 'badge-container';
    
    badges.forEach(badge => {
        const badgeEl = document.createElement('span');
        badgeEl.className = 'badge';
        badgeEl.textContent = badge;
        badgeContainer.appendChild(badgeEl);
    });
    
    const profileEl = document.querySelector('.user-profile');
    if (profileEl) {
        profileEl.appendChild(badgeContainer);
    }
}

// ========================================
// Feature 50: Social Auto-Post
// ========================================

async function autoPostStory(storyId) {
    if (!currentUser?.premium) {
        showToast('Premium required for auto-posting', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/auto-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storyId, userId: currentUser.userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Posted to social media!', 'success');
        }
        
    } catch (error) {
        console.error('Auto-post error:', error);
    }
}

// ========================================
// Utility Functions
// ========================================

function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.id = 'globalLoader';
    document.body.appendChild(loader);
}

function hideLoader() {
    document.getElementById('globalLoader')?.remove();
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ========================================
// Load Premium Plans from Google Sheets
// ========================================

async function loadPremiumPlans() {
    try {
        const response = await fetch('/api/premium-plans');
        const plans = await response.json();
        
        const grid = document.getElementById('plansGrid');
        if (!grid) return;
        
        let html = '';
        plans.forEach(plan => {
            html += `
                <div class="plan-card ${plan.popular ? 'popular' : ''}">
                    ${plan.popular ? '<div class="popular-badge">Most Popular</div>' : ''}
                    <div class="plan-name">${plan.name}</div>
                    <div class="plan-price">$${plan.price}<span>/${plan.duration} days</span></div>
                    <ul class="plan-features">
                        <li><i>✓</i> ${plan.maxSearches === -1 ? 'Unlimited' : plan.maxSearches} searches</li>
                        <li><i>✓</i> Family tracker (${plan.familyTracker} names)</li>
                        <li><i>✓</i> ${plan.autoFill ? 'Form auto-fill' : 'Basic forms'}</li>
                        <li><i>✓</i> ${plan.smsAlerts ? 'SMS alerts' : 'Email only'}</li>
                        <li><i>✓</i> ${plan.prioritySupport ? 'Priority support' : 'Standard support'}</li>
                        ${plan.api ? '<li><i>✓</i> API access</li>' : ''}
                    </ul>
                    <button class="btn-plan ${plan.popular ? 'pro-btn' : ''}" onclick="selectPlan('${plan.id}')">
                        Get Started
                    </button>
                </div>
            `;
        });
        
        grid.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading plans:', error);
    }
}

function selectPlan(planId) {
    if (!currentUser) {
        window.location.href = `/login?redirect=/premium&plan=${planId}`;
    } else {
        window.location.href = `/checkout?plan=${planId}`;
    }
}

// ========================================
// Load Success Stories
// ========================================

async function loadSuccessStories() {
    try {
        const response = await fetch('/api/success-stories');
        const stories = await response.json();
        
        const grid = document.getElementById('storiesGrid');
        if (!grid) return;
        
        let html = '';
        stories.slice(0, 3).forEach(story => {
            html += `
                <div class="story-card">
                    <img src="${story.screenshot || '/default-story.jpg'}" alt="${story.name}" class="story-image">
                    <div class="story-content">
                        <p class="story-quote">"${story.caption}"</p>
                        <div class="story-author">
                            <div class="author-info">
                                <h4>${story.name}</h4>
                                <p>${story.state} • Found $${story.amount}</p>
                            </div>
                        </div>
                        <div class="story-stats">
                            <span>❤️ ${story.likes}</span>
                            <span>🔄 ${story.shares}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading stories:', error);
    }
}

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initVoiceSearch();
    loadPremiumPlans();
    loadSuccessStories();
    loadLeaderboard();
    
    // Check for logged in user
    const userStr = localStorage.getItem('user');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        resetLogoutTimer();
    }
    
    // Mobile menu
    document.querySelector('.mobile-menu')?.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('mobile-active');
    });
});

// Export for use in other scripts
window.ultimateApp = {
    startVoiceSearch,
    performSearch,
    claimMoney,
    share,
    toggleTheme,
    sendChatMessage,
    toggleChatbot,
    scanFamily,
    predictAmount,
    calculateTax,
    predictSuccess
};
