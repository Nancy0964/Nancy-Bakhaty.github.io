document.addEventListener("DOMContentLoaded", () => {
    const fadeIns = document.querySelectorAll('.fade-in');
    const options = { threshold: 0.3 };

    const observer = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                entry.target.classList.add('show');
                observer.unobserve(entry.target);
            }
        });
    }, options);

    fadeIns.forEach(section => {
        observer.observe(section);
    });
});