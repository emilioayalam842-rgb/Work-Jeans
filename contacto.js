// Formulario de contacto y de cotización rápida. Valida antes de enviar y explica los errores en claro.
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const estado = document.getElementById('contactStatus');
  const boton = form.querySelector('button[type="submit"]');
  const val = (id) => (document.getElementById(id)?.value || '').trim();

  function error(msg, id) {
    estado.textContent = msg;
    estado.className = 'form-status is-error';
    document.getElementById(id)?.focus();
    return false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    estado.textContent = '';
    estado.className = 'form-status';
    const nombre = val('cfNombre');
    const correo = val('cfCorreo');
    const telefono = val('cfTelefono');
    const mensaje = val('cfMensaje');
    if (nombre.length < 3) return error('Escribe tu nombre completo.', 'cfNombre');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return error('Revisa tu correo: parece incompleto.', 'cfCorreo');
    if (telefono && telefono.replace(/\D/g, '').length < 10) return error('El teléfono debe tener 10 dígitos.', 'cfTelefono');
    if (mensaje.length < 10) return error('Cuéntanos un poco más para poder ayudarte.', 'cfMensaje');

    boton.disabled = true;
    const textoOriginal = boton.textContent;
    boton.textContent = 'Enviando…';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, contacto: correo, telefono, empresa: val('cfEmpresa'), mensaje, website: val('cfSitio') }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos por WhatsApp.');
      form.hidden = true;
      estado.className = 'form-status is-ok';
      estado.innerHTML = `Gracias, ${nombre.split(' ')[0]}. Recibimos tu mensaje y te respondemos en horario de tienda, de lunes a viernes de 9:00 a. m. a 6:00 p. m. Si es urgente, escríbenos por <a href="https://wa.me/528128613551?text=${encodeURIComponent(`Hola, acabo de enviar un mensaje desde la página. Soy ${nombre}.`)}" target="_blank" rel="noopener">WhatsApp</a>.`;
      window.wjTrack?.('b2b_quote_submitted', { where: 'contacto' });
    } catch (err) {
      estado.textContent = err.message;
      estado.className = 'form-status is-error';
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });

  form.addEventListener('focusin', () => {
    if (form.dataset.iniciado) return;
    form.dataset.iniciado = '1';
    window.wjTrack?.('b2b_quote_started', { where: 'contacto' });
  }, { once: true });
})();
