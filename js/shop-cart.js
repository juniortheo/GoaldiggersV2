(function () {
  const form = document.getElementById('shop-checkout');
  if (!form) return;
  const cart = new Map();
  const lines = document.getElementById('cart-lines');

  function render() {
    if (!cart.size) {
      lines.textContent = 'Your cart is empty.';
      document.getElementById('cart-total').textContent = 'Total: 0 RWF';
      return;
    }
    lines.replaceChildren();
    let total = 0;
    cart.forEach((entry, id) => {
      const row = document.createElement('div');
      row.className = 'cart-line';
      const label = document.createElement('span');
      label.textContent = `${entry.product.name} · ${entry.product.price_rwf.toLocaleString()} RWF`;
      const quantity = document.createElement('input');
      quantity.type = 'number'; quantity.min = '1'; quantity.max = String(Math.min(entry.product.stock, 20)); quantity.value = String(entry.quantity); quantity.setAttribute('aria-label', `${entry.product.name} quantity`);
      quantity.addEventListener('change', () => {
        const next = Math.max(1, Math.min(Number(quantity.value) || 1, Number(quantity.max)));
        entry.quantity = next;
        render();
      });
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'btn btn-outline-green btn-sm'; remove.textContent = 'Remove';
      remove.addEventListener('click', () => { cart.delete(id); render(); });
      row.append(label, quantity, remove);
      lines.appendChild(row);
      total += entry.product.price_rwf * entry.quantity;
    });
    document.getElementById('cart-total').textContent = `Total: ${total.toLocaleString()} RWF`;
  }

  window.ShopCart = {
    add(product, quantity) {
      const entry = cart.get(product.id) || { product, quantity: 0 };
      entry.quantity = Math.min(Number(product.stock), entry.quantity + quantity);
      cart.set(product.id, entry);
      render();
      window.showToast(`${product.name} added to cart.`);
    },
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!cart.size) {
      window.GoalPayments.showError('Add an item to your cart first.', 'shop-payment-message');
      return;
    }
    window.GoalPayments.startCheckout('order', {
      currency: 'RWF',
      items: [...cart.entries()].map(([id, entry]) => ({ id, quantity: entry.quantity })),
      donor_name: document.getElementById('shop-buyer-name').value.trim(),
      donor_email: document.getElementById('shop-buyer-email').value.trim(),
      donor_phone: document.getElementById('shop-buyer-phone').value.trim(),
    }, document.getElementById('shop-checkout-button'), 'shop-payment-message');
  });
})();