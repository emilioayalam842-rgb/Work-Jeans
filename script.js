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
  const readForm = () => {
    const data = new FormData(contactForm);
    return {
      nombre: (data.get('nombre') || '').toString().trim(),
      contacto: (data.get('contacto') || '').toString().trim(),
      mensaje: (data.get('mensaje') || '').toString().trim(),
      website: (data.get('website') || '').toString(),
    };
  };

  const openWhatsapp = () => {
    const { nombre, contacto, mensaje } = readForm();
    const number = (typeof WHATSAPP_NUMBER !== 'undefined' && WHATSAPP_NUMBER) || '19562313696';
    const text = `Hola, soy ${nombre || '...'}.\n${mensaje}\n\nContacto: ${contacto}`;
    const win = window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    if (formStatus) {
      formStatus.textContent = win
        ? 'Se abrió WhatsApp con tu mensaje. Si no lo ves, revisa las ventanas emergentes.'
        : 'No se pudo abrir WhatsApp. Escríbenos al 956 231 3696.';
    }
  };

  document.getElementById('contactWhatsappBtn')?.addEventListener('click', () => {
    if (!contactForm.reportValidity()) return;
    openWhatsapp();
  });

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = document.getElementById('contactSubmit');
    submit.disabled = true;
    formStatus.textContent = 'Enviando…';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readForm()),
      });
      const data = await res.json();
      if (!res.ok) {
        formStatus.textContent = data.error || 'No se pudo enviar. Prueba por WhatsApp.';
        return;
      }
      if (data.emailed) {
        formStatus.textContent = 'Mensaje enviado. Te respondemos en horario de tienda.';
        contactForm.reset();
      } else {
        // Sin correo configurado: se abre WhatsApp con el mensaje.
        openWhatsapp();
      }
    } catch {
      formStatus.textContent = 'Sin conexión. Prueba con el botón de WhatsApp.';
    } finally {
      submit.disabled = false;
    }
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
