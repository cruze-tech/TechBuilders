function addFeedback(message, type = 'info') {
    const feedbackContainer = document.getElementById('feedbackMessages');
    if (!feedbackContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `feedback-message feedback-${type}`;
    messageDiv.textContent = message;
    
    feedbackContainer.insertBefore(messageDiv, feedbackContainer.firstChild);
    
    while (feedbackContainer.children.length > 10) {
        feedbackContainer.removeChild(feedbackContainer.lastChild);
    }
}

function showSuccessModal(score, objectives) {
    const modal = document.getElementById('successModal');
    if (!modal) return;
    
    document.getElementById('modalScore').textContent = `${score}/100`;
    
    let message = score >= 90 ? 'Outstanding engineering!' :
                 score >= 80 ? 'Great work on your design!' :
                 'Good job! Keep optimizing.';
    
    document.getElementById('modalMessage').textContent = message;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showMenuScreen() {
    const menuScreen = document.getElementById('menuScreen');
    const gameScreen = document.getElementById('gameScreen');
    if (menuScreen && gameScreen) {
        menuScreen.classList.add('active');
        gameScreen.style.display = 'none';
    }
}

function hideMenuScreen() {
    const menuScreen = document.getElementById('menuScreen');
    const gameScreen = document.getElementById('gameScreen');
    if (menuScreen && gameScreen) {
        menuScreen.classList.remove('active');
        gameScreen.style.display = 'flex';
    }
}

function showHelpScreen() {
    const helpScreen = document.getElementById('helpScreen');
    if (helpScreen) {
        helpScreen.classList.add('active');
    }
}

function hideHelpScreen() {
    const helpScreen = document.getElementById('helpScreen');
    if (helpScreen) {
        helpScreen.classList.remove('active');
    }
}
