(function (root) {
    const DEVELOPER_MESSAGE = 'From all of us at Cruze Tech, thank you for building with us. Tech Builders was created to help young innovators see that engineering is not only about machines, but about people, communities, and hope. Every system you design here can inspire solutions in the real world. Keep experimenting, keep questioning, and keep building the future.';

    function getAboutModel() {
        return {
            title: 'About Tech Builders',
            sections: [
                {
                    heading: 'What This Game Teaches',
                    lines: [
                        'Systems thinking across energy, water, mobility, and resilience.',
                        'Practical tradeoffs between reliability, efficiency, and sustainability.',
                        'Engineering iteration through objectives, simulation, and feedback.'
                    ]
                },
                {
                    heading: 'How To Use In Classrooms And Clubs',
                    lines: [
                        'Run each experiment as a timed challenge with team discussion.',
                        'Use debrief panels to compare design decisions and outcomes.',
                        'Export local pilot analytics for facilitator reflection and planning.'
                    ]
                },
                {
                    heading: 'Built By Cruze Tech',
                    lines: [
                        'Main site: https://cruze-tech.com',
                        'Games portal: https://games.cruze-tech.com'
                    ]
                }
            ],
            developerMessage: DEVELOPER_MESSAGE
        };
    }

    function renderAbout(container) {
        if (!container) {
            return;
        }

        const model = getAboutModel();
        container.innerHTML = '';

        const title = document.createElement('h2');
        title.id = 'aboutTitle';
        title.className = 'about-title';
        title.textContent = model.title;
        container.appendChild(title);

        model.sections.forEach((section) => {
            const card = document.createElement('section');
            card.className = 'about-card';

            const heading = document.createElement('h3');
            heading.className = 'about-card-title';
            heading.textContent = section.heading;
            card.appendChild(heading);

            const list = document.createElement('ul');
            list.className = 'about-list';
            section.lines.forEach((line) => {
                const item = document.createElement('li');
                if (line.startsWith('http')) {
                    const anchor = document.createElement('a');
                    anchor.href = line;
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    anchor.textContent = line;
                    item.appendChild(anchor);
                } else if (line.includes('http')) {
                    const [prefix, url] = line.split(': ');
                    item.textContent = `${prefix}: `;
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    anchor.textContent = url;
                    item.appendChild(anchor);
                } else {
                    item.textContent = line;
                }
                list.appendChild(item);
            });

            card.appendChild(list);
            container.appendChild(card);
        });

        const messageCard = document.createElement('section');
        messageCard.className = 'about-message';

        const messageHeading = document.createElement('h3');
        messageHeading.className = 'about-card-title';
        messageHeading.textContent = 'A Message From The Developers';

        const messageText = document.createElement('p');
        messageText.textContent = model.developerMessage;

        messageCard.appendChild(messageHeading);
        messageCard.appendChild(messageText);
        container.appendChild(messageCard);
    }

    const AboutPage = {
        DEVELOPER_MESSAGE,
        getAboutModel,
        renderAbout
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AboutPage;
    }

    root.AboutPage = AboutPage;
})(typeof window !== 'undefined' ? window : globalThis);
