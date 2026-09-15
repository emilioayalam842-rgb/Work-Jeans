// Cotizador de mayoreo: el cliente elige prenda, captura cantidades por talla y envía
// la cotización armada por WhatsApp. No requiere servidor.

(function () {
  const productSelect = document.getElementById('cotProduct');
  const sizesEl = document.getElementById('cotSizes');
  const addBtn = document.getElementById('cotAdd');
  const listEl = document.getElementById('cotList');
  const totalEl = document.getElementById('cotTotal');
  const sendBtn = document.getElementById('cotSend');
  const nameInput = document.getElementById('cotName');
  const logoSelect = document.getElementById('cotLogo');
  const statusEl = document.getElementById('cotStatus');
  if (!productSelect || !sizesEl) return;

  let products = [];
  const lines = [];

  function renderSizes() {
    const product = products.find((p) => p.id === productSelect.value);
    if (!product) return;
    sizesEl.innerHTML = product.sizes.map((s) => `
      <label class="cot-size">
        <span>${s.size}</span>
        <input type="number" inputmode="numeric" min="0" step="1" placeholder="0" data-size="${s.size}">
      </label>
    `).join('');
  }

  function renderList() {
    if (lines.length === 0) {
      listEl.innerHTML = '<p class="cotizador-empty">Aún no has agregado prendas.</p>';
    } else {
      listEl.innerHTML = lines.map((line, i) => `
        <div class="cot-line">
          <div>
            <strong>${line.name}</strong>
            <span>${Object.entries(line.sizes).map(([size, qty]) => `${size} × ${qty}`).join(' · ')}</span>
          </div>
          <b>${line.total} pzas</b>
          <button type="button" class="cot-remove" data-index="${i}" aria-label="Quitar">✕</button>
        </div>
      `).join('');
    }
    totalEl.textContent = lines.reduce((sum, l) => sum + l.total, 0);
  }

  function addLine() {
    const product = products.find((p) => p.id === productSelect.value);
    if (!product) return;
    const sizes = {};
    let total = 0;
    sizesEl.querySelectorAll('input').forEach((input) => {
      const qty = parseInt(input.value, 10) || 0;
      if (qty > 0) {
        sizes[input.dataset.size] = qty;
        total += qty;
      }
    });
    if (total === 0) {
      statusEl.textContent = 'Captura al menos una cantidad por talla.';
      return;
    }
    const existing = lines.find((l) => l.id === product.id);
    if (existing) {
      Object.entries(sizes).forEach(([size, qty]) => {
        existing.sizes[size] = (existing.sizes[size] || 0) + qty;
      });
      existing.total += total;
    } else {
      lines.push({ id: product.id, name: product.name, sizes, total });
    }
    sizesEl.querySelectorAll('input').forEach((input) => { input.value = ''; });
    statusEl.textContent = '';
    renderList();
  }

  function buildMessage() {
    const parts = ['Hola, quiero cotizar un pedido por mayoreo:'];
    lines.forEach((line) => {
      const detail = Object.entries(line.sizes).map(([size, qty]) => `${size} x${qty}`).join(', ');
      parts.push(`- ${line.name}: ${detail} (${line.total} pzas)`);
    });
    parts.push('', `Total: ${lines.reduce((sum, l) => sum + l.total, 0)} piezas`);
    if (logoSelect.value) parts.push(`Personalización: ${logoSelect.value}`);
    if (nameInput.value.trim()) parts.push(`Nombre/Empresa: ${nameInput.value.trim()}`);
    return parts.join('\n');
  }

  fetch('products.json')
    .then((res) => res.json())
    .then((data) => {
      products = data;
      productSelect.innerHTML = products.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
      renderSizes();
    })
    .catch(() => {
      statusEl.textContent = 'No se pudo cargar el catálogo. Escríbenos por WhatsApp.';
    });

  productSelect.addEventListener('change', renderSizes);
  addBtn.addEventListener('click', addLine);
  sizesEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLine();
    }
  });
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.cot-remove');
    if (!btn) return;
    lines.splice(parseInt(btn.dataset.index, 10), 1);
    renderList();
  });
  sendBtn.addEventListener('click', () => {
    if (lines.length === 0) {
      statusEl.textContent = 'Agrega al menos una prenda a la cotización.';
      return;
    }
    const number = (typeof WHATSAPP_NUMBER !== 'undefined' && WHATSAPP_NUMBER) || '528128613551';
    const url = `https://wa.me/${number}?text=${encodeURIComponent(buildMessage())}`;
    const win = window.open(url, '_blank', 'noopener');
    statusEl.textContent = win
      ? 'Se abrió WhatsApp con tu cotización. Si no lo ves, revisa las ventanas emergentes.'
      : 'No se pudo abrir WhatsApp. Escríbenos al 81 2861 3551.';
  });

  renderList();
})();
