// Formulario de reseña: solo abre con el enlace único que recibe el cliente al entregarse su pedido.
(function () {
  const token = new URLSearchParams(location.search).get('t') || '';
  const intro = document.getElementById('reviewIntro');
  const forms = document.getElementById('reviewForms');
  const status = document.getElementById('reviewStatus');
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  if (!/^[a-f0-9]{24}$/.test(token)) {
    intro.textContent = 'Este enlace no es válido. Si compraste con nosotros, escríbenos por WhatsApp y te mandamos uno nuevo.';
    return;
  }

  fetch(`/api/reviews/invite/${token}`).then((r) => r.json()).then((data) => {
    if (data.error) { intro.textContent = data.error; return; }
    intro.textContent = `Hola ${data.firstName || ''}. Califica cada prenda de tu pedido ${data.orderId}; nos ayuda a mejorar y ayuda a otros a elegir.`;
    if (!data.items.length) { intro.textContent = 'Ya calificaste todas las prendas de este pedido. ¡Gracias!'; return; }
    forms.innerHTML = data.items.map((it, i) => `
      <form class="review-card" data-product="${esc(it.productId)}">
        <div class="review-card-head">
          ${it.image ? `<img src="/img/320/${esc(it.image)}" alt="" width="64" height="80">` : ''}
          <div><strong>${esc(it.name)}</strong><span class="admin-muted">${it.size ? `Talla ${esc(it.size)} · ` : ''}${it.quantity} pza${it.quantity > 1 ? 's' : ''}</span></div>
        </div>
        <fieldset class="review-stars" role="radiogroup" aria-label="Calificación">
          ${[1, 2, 3, 4, 5].map((n) => `<label title="${n} de 5"><input type="radio" name="rating-${i}" value="${n}" required><span>★</span></label>`).join('')}
        </fieldset>
        <label class="review-field">Tu comentario (mínimo 10 letras)
          <textarea name="comment" rows="3" minlength="10" maxlength="600" required placeholder="Cómo te quedó, cómo aguanta el trabajo, qué mejorarías…"></textarea>
        </label>
        <button type="submit" class="btn btn-primary">Enviar reseña</button>
        <p class="form-status"></p>
      </form>`).join('');

    forms.querySelectorAll('.review-card').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const st = form.querySelector('.form-status');
        const rating = form.querySelector('input[type="radio"]:checked')?.value;
        const comment = form.querySelector('textarea').value.trim();
        if (!rating) { st.textContent = 'Elige de 1 a 5 estrellas.'; return; }
        if (comment.length < 10) { st.textContent = 'Cuéntanos un poco más (mínimo 10 letras).'; return; }
        const btn = form.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Enviando…';
        try {
          const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, productId: form.dataset.product, rating: Number(rating), comment }) });
          const d = await res.json();
          if (!res.ok) { st.textContent = d.error || 'No se pudo enviar.'; btn.disabled = false; btn.textContent = 'Enviar reseña'; return; }
          form.innerHTML = `<div class="review-card-head"><strong>¡Gracias!</strong><span>Tu reseña quedó registrada y se publica en cuanto la revisemos.</span></div>`;
        } catch {
          st.textContent = 'Sin conexión. Intenta de nuevo.';
          btn.disabled = false; btn.textContent = 'Enviar reseña';
        }
      });
    });
  }).catch(() => { intro.textContent = 'No se pudo cargar el pedido. Intenta más tarde.'; });
})();
