// Calculadora de talla: el cliente escribe su medida (cintura o pecho) y se le sugiere la talla según las tablas.
(function () {
  const boxes = document.querySelectorAll('.size-calc');
  if (!boxes.length) return;
  const inches = (s) => parseFloat(String(s).replace(/[^0-9.]/g, ''));

  fetch('/api/size-tables').then((r) => r.json()).then((tables) => {
    boxes.forEach((box) => build(box, tables));
  }).catch(() => {});

  function build(box, tables) {
    const kind = box.dataset.kind || 'both';
    const showPant = kind === 'both' || kind === 'pantalon';
    const showShirt = kind === 'both' || kind === 'camisas';
    box.innerHTML = `
      <div class="size-calc-head"><span class="kicker">Calculadora de talla</span><p>Mide una prenda que te quede bien, extendida sobre una mesa, y escribe la medida. Te decimos qué talla pedir.</p></div>
      <div class="size-calc-unit" role="group" aria-label="Unidad"><button type="button" class="is-active" data-unit="cm">cm</button><button type="button" data-unit="in">pulgadas</button></div>
      <div class="size-calc-grid">
        ${showPant ? `<label class="size-calc-field"><span>Cintura del pantalón (de lado a lado × 2)</span><input type="number" inputmode="decimal" min="40" max="200" step="0.5" data-calc="waist" placeholder="Ej. 86"></label>` : ''}
        ${showShirt ? `<label class="size-calc-field"><span>Pecho de la camisa (de costura a costura × 2)</span><input type="number" inputmode="decimal" min="60" max="220" step="0.5" data-calc="chest" placeholder="Ej. 110"></label>` : ''}
      </div>
      <div class="size-calc-result" aria-live="polite"></div>`;
    let unit = 'cm';
    const result = box.querySelector('.size-calc-result');
    box.querySelectorAll('[data-unit]').forEach((b) => b.addEventListener('click', () => {
      unit = b.dataset.unit;
      box.querySelectorAll('[data-unit]').forEach((x) => x.classList.toggle('is-active', x === b));
      box.querySelectorAll('input[data-calc]').forEach((i) => { i.placeholder = i.dataset.calc === 'waist' ? (unit === 'cm' ? 'Ej. 86' : 'Ej. 34') : (unit === 'cm' ? 'Ej. 110' : 'Ej. 43'); });
      compute();
    }));
    box.querySelectorAll('input[data-calc]').forEach((i) => i.addEventListener('input', compute));

    function toIn(v) { return unit === 'cm' ? v / 2.54 : v; }
    function pick(rows, col, value) {
      // La talla cuya medida es igual o la siguiente mayor (en el trabajo conviene espacio); si se pasa del máximo, la mayor.
      const list = rows.map((r) => ({ size: r[0], m: inches(r[col]) }));
      const exact = list.find((x) => Math.abs(x.m - value) <= 0.5);
      if (exact) return { size: exact.size, note: 'Queda justo con tu medida.' };
      const next = list.find((x) => x.m > value);
      if (!next) return { size: list[list.length - 1].size, note: 'Es la talla más grande que fabricamos; si tu medida es mayor, escríbenos.' };
      const prev = [...list].reverse().find((x) => x.m < value);
      return { size: next.size, note: prev ? `Entre ${prev.size} y ${next.size}: te sugerimos ${next.size}, la mezclilla no da de sí y en el trabajo conviene espacio.` : 'Es la talla más chica; queda con espacio.' };
    }
    function compute() {
      const out = [];
      const waist = box.querySelector('input[data-calc="waist"]');
      const chest = box.querySelector('input[data-calc="chest"]');
      if (waist && waist.value) {
        const v = toIn(parseFloat(waist.value));
        if (v >= 20 && v <= 70) { const r = pick(tables.pantalon.rows, 1, v); out.push(`<div class="size-calc-card"><span>Pantalón</span><b>Talla ${r.size}</b><small>${r.note}</small></div>`); }
      }
      if (chest && chest.value) {
        const v = toIn(parseFloat(chest.value));
        if (v >= 30 && v <= 80) { const r = pick(tables.camisas.rows, 2, v); out.push(`<div class="size-calc-card"><span>Camisa</span><b>Talla ${r.size}</b><small>${r.note}</small></div>`); }
      }
      result.innerHTML = out.join('');
    }
  }
})();
