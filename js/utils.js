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
        while (feedbackContainer.children.length > 30) {
            feedbackContainer.removeChild(feedbackContainer.lastChild);
        }
    }

    function clearFeedback() {
        const feedbackContainer = document.getElementById('feedbackMessages');
        if (feedbackContainer) {
            feedbackContainer.innerHTML = '';
        }
    }

    function downloadJson(filename, payload) {
        const json = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    const Utils = {
        addFeedback,
        clearFeedback,
        downloadJson
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Utils;
    }

    root.addFeedback = addFeedback;
    root.clearFeedback = clearFeedback;
    root.downloadJson = downloadJson;
})(typeof window !== 'undefined' ? window : globalThis);
