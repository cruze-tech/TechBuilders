(function (root) {
    function initOnboarding() {
        const overlay = document.getElementById('onboardingOverlay');
        if (!overlay) return;
        overlay.querySelector('#onboardingNext').addEventListener('click', () => {
            if (typeof window.nextOnboarding === 'function') window.nextOnboarding();
        });
        overlay.querySelector('#onboardingPrev').addEventListener('click', () => {
            if (typeof window.prevOnboarding === 'function') window.prevOnboarding();
        });
        overlay.querySelector('#onboardingSkip').addEventListener('click', () => {
            if (typeof window.hideOnboarding === 'function') window.hideOnboarding();
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { initOnboarding };
    }

    root.Onboarding = { initOnboarding };
})(typeof window !== 'undefined' ? window : globalThis);
