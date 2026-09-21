// Botones de impresión sin manejadores en línea, para poder aplicar una política estricta de scripts.
document.addEventListener('click', (e) => { if (e.target.closest('[data-print]')) window.print(); });
