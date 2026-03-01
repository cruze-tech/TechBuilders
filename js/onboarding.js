/**
 * onboarding.js
 * Self-contained onboarding overlay controller.
 * Works alongside app.js — does NOT duplicate the button bindings
 * that app.js already handles in bindButtons(). This module only
 * handles the progress bar animation and exposes initOnboarding()
 * for app.js to call after DOMContentLoaded.
 */
(function (root) {
    function updateProgressBar(index, total) {
        const fill = document.querySelector('.onboarding-progress-fill');
        if (!fill) return;
        const pct = total <= 1 ? 100 : Math.round((index / (total - 1)) * 100);
        fill.style.width = `${pct}%`;
    }

    function syncProgressBar() {
        // Reads from app state via the exposed window globals
        if (
            typeof root.ONBOARDING_STEPS === 'undefined' ||
            typeof root.app === 'undefined'
        ) return;
        const total = root.ONBOARDING_STEPS.length;
        // app object is not public — read from the counter text instead
        const counterEl = document.querySelector('.onboarding-counter');
        if (!counterEl) return;
        const match = counterEl.textContent.match(/(\d+)\s*\/\s*(\d+)/);
        if (!match) return;
        const index = parseInt(match[1], 10) - 1;
        const parsedTotal = parseInt(match[2], 10);
        updateProgressBar(index, parsedTotal || total);
    }

    function patchNextOnboarding() {
        // Wrap the existing nextOnboarding to also update the progress bar
        const original = root.nextOnboarding;
        if (typeof original !== 'function') return;
        root.nextOnboarding = function () {
            original();
            // Small delay to let the DOM update
            requestAnimationFrame(syncProgressBar);
        };
    }

    function patchPrevOnboarding() {
        const original = root.prevOnboarding;
        if (typeof original !== 'function') return;
        root.prevOnboarding = function () {
            original();
            requestAnimationFrame(syncProgressBar);
        };
    }

    function initOnboarding() {
        // Attempt to patch — these will be available because app.js exposes them
        // on window before calling Onboarding.initOnboarding()
        patchNextOnboarding();
        patchPrevOnboarding();

        // Initial progress bar state
        requestAnimationFrame(syncProgressBar);

        // Keyboard navigation: Escape = skip, Arrow keys = prev/next
        document.addEventListener('keydown', function (e) {
            const overlay = document.getElementById('onboardingOverlay');
            if (!overlay || overlay.hidden) return;

            if (e.key === 'Escape') {
                if (typeof root.hideOnboarding === 'function') root.hideOnboarding();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                if (typeof root.nextOnboarding === 'function') root.nextOnboarding();
            } else if (e.key === 'ArrowLeft') {
                if (typeof root.prevOnboarding === 'function') root.prevOnboarding();
            }
        });

        // Tap outside the card to skip
        const overlay = document.getElementById('onboardingOverlay');
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) {
                    if (typeof root.hideOnboarding === 'function') root.hideOnboarding();
                }
            });
        }
    }

    // Expose as a module
    root.Onboarding = { initOnboarding };
})(typeof window !== 'undefined' ? window : globalThis);