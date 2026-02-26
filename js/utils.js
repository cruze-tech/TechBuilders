(function (root) {
    function addFeedback(message, type) {
        const feedbackContainer = document.getElementById('feedbackMessages');
        if (!feedbackContainer) {
            return;
        }

        const entry = document.createElement('div');
        entry.className = `feedback-message feedback-${type || 'info'}`;
        entry.textContent = message;

        feedbackContainer.prepend(entry);

        while (feedbackContainer.children.length > 20) {
            feedbackContainer.removeChild(feedbackContainer.lastChild);
        }
    }

    function showSuccessModal(score, passScore) {
        const modal = document.getElementById('successModal');
        if (!modal) {
            return;
        }

        const roundedScore = Math.round(score);
        const scoreElement = document.getElementById('modalScore');
        const messageElement = document.getElementById('modalMessage');

        if (scoreElement) {
            scoreElement.textContent = `${roundedScore}/100`;
        }

        if (messageElement) {
            if (roundedScore >= 90) {
                messageElement.textContent = `Outstanding system design. You exceeded the pass target of ${passScore}.`;
            } else if (roundedScore >= passScore) {
                messageElement.textContent = `Challenge passed. Keep refining for a higher mastery score.`;
            } else {
                messageElement.textContent = `Keep iterating to pass the ${passScore}-point threshold.`;
            }
        }

        modal.style.display = 'flex';
    }

    function closeModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function showMenuScreen() {
        const menu = document.getElementById('menuScreen');
        const game = document.getElementById('gameScreen');
        if (menu) {
            menu.classList.add('active');
        }
        if (game) {
            game.hidden = true;
        }
    }

    function hideMenuScreen() {
        const menu = document.getElementById('menuScreen');
        const game = document.getElementById('gameScreen');
        if (menu) {
            menu.classList.remove('active');
        }
        if (game) {
            game.hidden = false;
        }
    }

    function showHelpScreen() {
        const help = document.getElementById('helpScreen');
        if (help) {
            help.classList.add('active');
        }
    }

    function hideHelpScreen() {
        const help = document.getElementById('helpScreen');
        if (help) {
            help.classList.remove('active');
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            addFeedback,
            showSuccessModal,
            closeModal,
            showMenuScreen,
            hideMenuScreen,
            showHelpScreen,
            hideHelpScreen
        };
    }

    root.addFeedback = addFeedback;
    root.showSuccessModal = showSuccessModal;
    root.closeModal = closeModal;
    root.showMenuScreen = showMenuScreen;
    root.hideMenuScreen = hideMenuScreen;
    root.showHelpScreen = showHelpScreen;
    root.hideHelpScreen = hideHelpScreen;
})(typeof window !== 'undefined' ? window : globalThis);
