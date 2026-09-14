// Navegación móvil, formulario de contacto (WhatsApp) y animación de aparición.

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// El formulario arma el mensaje y lo abre en WhatsApp (sin servidor de correo).
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(contactForm);
    const nombre = (data.get('nombre') || '').toString().trim();
    const contacto = (data.get('contacto') || '').toString().trim();
    const mensaje = (data.get('mensaje') || '').toString().trim();
    const number = (typeof WHATSAPP_NUMBER !== 'undefined' && WHATSAPP_NUMBER) || '528128613551';
    const text = `Hola, soy ${nombre}.\n${mensaje}\n\nContacto: ${contacto}`;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    const win = window.open(url, '_blank', 'noopener');
    if (formStatus) {
      formStatus.textContent = win
        ? 'Se abrió WhatsApp con tu mensaje. Si no lo ves, revisa las ventanas emergentes.'
        : 'No se pudo abrir WhatsApp. Escríbenos al 81 2861 3551.';
    }
    if (win) contactForm.reset();
  });
}

// Aparición suave al hacer scroll (se desactiva si el usuario prefiere menos movimiento).
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion || !('IntersectionObserver' in window)) {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
} else {
  window.revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        window.revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => window.revealObserver.observe(el));
}
