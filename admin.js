let supabase;
let currentRestaurant = null;
let currentUser = null;
let ordersInterval = null;

async function init() {
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    document.body.innerHTML = '<div class="container" style="padding:40px;text-align:center"><h2>âš™ï¸ Setup Required</h2><p>Configure Supabase URL and Anon Key in config.js</p></div>';
    return;
  }
  supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  currentUser = session.user;
  document.getElementById('restaurantName').textContent = 'ðŸ‘¤ ' + (session.user.email || '');
  await loadCities();
  const { data: restaurants } = await supabase.from('restaurants').select('*').eq('owner_id', session.user.id);
  if (!restaurants || restaurants.length === 0) {
    document.getElementById('noRestaurant').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    populateCitySelect('newRestCity');
  } else {
    currentRestaurant = restaurants[0];
    document.getElementById('noRestaurant').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadDashboard();
  }
}

async function loadCities() {
  const { data } = await supabase.from('cities').select('*').order('name');
  if (data) window._cities = data;
}

function populateCitySelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const cities = window._cities || [];
  sel.innerHTML = cities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if (currentRestaurant) sel.value = currentRestaurant.city_id;
}

async function registerRestaurant() {
  const name = document.getElementById('newRestName').value.trim();
  const cityId = document.getElementById('newRestCity').value;
  const phone = document.getElementById('newRestPhone').value.trim();
  const address = document.getElementById('newRestAddress').value.trim();
  const err = document.getElementById('regError');
  if (!name || !cityId) { err.textContent = 'Restaurant name and city are required.'; err.style.display = 'block'; return; }
  const { data, error } = await supabase.from('restaurants').insert({
    name, city_id: parseInt(cityId), phone, address, is_open: true, owner_id: currentUser.id
  }).select().single();
  if (error) { err.textContent = error.message; err.style.display = 'block'; return; }
  currentRestaurant = data;
  document.getElementById('noRestaurant').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  loadDashboard();
}

function loadDashboard() {
  if (!currentRestaurant) return;
  document.getElementById('restaurantName').textContent = 'ðŸª ' + currentRestaurant.name;
  const toggle = document.getElementById('openToggle');
  toggle.checked = currentRestaurant.is_open;
  updateOpenLabel(currentRestaurant.is_open);
  populateCitySelect('editCity');
  document.getElementById('editName').value = currentRestaurant.name || '';
  document.getElementById('editPhone').value = currentRestaurant.phone || '';
  document.getElementById('editAddress').value = currentRestaurant.address || '';
  document.getElementById('editPhoto').value = currentRestaurant.photo_url || '';
  if (currentRestaurant.city_id) document.getElementById('editCity').value = currentRestaurant.city_id;

  const ft = document.getElementById('featuredToggle');
  if (ft) {
    ft.checked = currentRestaurant.is_featured || false;
    document.getElementById('featuredLabel').textContent = currentRestaurant.is_featured ? 'â­ Featured' : 'Not featured';
  }

  loadOrders();
  loadMenuItems();
  loadReviews();
  if (ordersInterval) clearInterval(ordersInterval);
  ordersInterval = setInterval(loadOrders, 15000);
}

function updateOpenLabel(isOpen) {
  document.getElementById('openLabel').textContent = isOpen ? 'ðŸŸ¢ Accepting Orders' : 'ðŸ”´ Closed';
}

async function toggleOpen() {
  if (!currentRestaurant) return;
  const isOpen = document.getElementById('openToggle').checked;
  updateOpenLabel(isOpen);
  const { error } = await supabase.from('restaurants').update({ is_open: isOpen }).eq('id', currentRestaurant.id);
  if (error) { console.error(error); document.getElementById('openToggle').checked = !isOpen; updateOpenLabel(!isOpen); }
  else { currentRestaurant.is_open = isOpen; }
}

async function toggleFeatured() {
  if (!currentRestaurant) return;
  const isFeatured = document.getElementById('featuredToggle').checked;
  document.getElementById('featuredLabel').textContent = isFeatured ? 'â­ Featured' : 'Not featured';
  const { error } = await supabase.from('restaurants').update({ is_featured: isFeatured }).eq('id', currentRestaurant.id);
  if (error) console.error(error);
  else currentRestaurant.is_featured = isFeatured;
}

async function loadOrders() {
  if (!currentRestaurant) return;
  const { data, error } = await supabase.from('orders')
    .select('*').eq('restaurant_id', currentRestaurant.id)
    .order('created_at', { ascending: false }).limit(50);
  if (error) { console.error(error); return; }
  const list = document.getElementById('ordersList');
  if (!data || data.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="emoji">ðŸ“¦</span>No orders yet</div>';
    return;
  }
  const newCount = data.filter(o => o.status === 'new').length;
  list.innerHTML = '<p style="font-size:0.85rem;color:gray;margin-bottom:12px">' + (newCount > 0 ? 'ðŸ†• ' + newCount + ' new order(s)' : 'No new orders') + ' â€” auto-refreshes every 15s</p>';
  list.innerHTML += data.map(o => {
    const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
    const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
    const itemsStr = items.map(i => `${i.name} x${i.qty}`).join(', ');
    return `
      <div class="order-card status-${o.status}">
        <div class="order-header">
          <span class="customer">ðŸ‘¤ ${escapeHtml(o.customer_name)}</span>
          <span class="time">${formatTime(o.created_at)}</span>
        </div>
        <div>ðŸ“ž ${escapeHtml(o.customer_phone)}</div>
        <div class="items-list">${escapeHtml(itemsStr)}</div>
        ${o.tracking_code ? '<div style="font-size:0.8rem;color:#999">ðŸ”‘ ' + o.tracking_code + '</div>' : ''}
        ${o.note ? '<div style="font-size:0.85rem;color:#666">ðŸ“ ' + escapeHtml(o.note) + '</div>' : ''}
        <div class="order-total">${formatMoney(total)}</div>
        <div class="order-actions" style="margin-top:8px">
          ${o.status === 'new' ? `
            <button class="btn btn-primary btn-sm" onclick="updateOrder(${o.id}, 'confirmed')">âœ… Confirm</button>
            <button class="btn btn-danger btn-sm" onclick="updateOrder(${o.id}, 'cancelled')">âŒ Cancel</button>
          ` : ''}
          ${o.status === 'confirmed' ? `
            <button class="btn btn-yellow btn-sm" onclick="updateOrder(${o.id}, 'completed')">âœ… Complete</button>
            <button class="btn btn-danger btn-sm" onclick="updateOrder(${o.id}, 'cancelled')">âŒ Cancel</button>
          ` : ''}
          <span style="font-size:0.8rem;color:gray;align-self:center">${o.status}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function updateOrder(id, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) { console.error(error); return; }
  loadOrders();
}

async function loadMenuItems() {
  if (!currentRestaurant) return;
  const { data, error } = await supabase.from('menu_items')
    .select('*').eq('restaurant_id', currentRestaurant.id).order('category').order('name');
  if (error) { console.error(error); return; }
  const list = document.getElementById('menuList');
  if (!data || data.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="emoji">ðŸ“‹</span>No menu items yet. Click "+ Add Item" to start.</div>';
    return;
  }
  list.innerHTML = data.map(item => `
    <div class="menu-item-row">
      <input type="text" class="name" value="${escapeHtml(item.name)}" onchange="updateMenuItem(${item.id}, 'name', this.value)">
      <input type="number" class="price" value="${item.price}" onchange="updateMenuItem(${item.id}, 'price', parseInt(this.value))">
      <select onchange="updateMenuItem(${item.id}, 'category', this.value)" style="padding:6px;border:1px solid #ddd;border-radius:4px;font-size:0.85rem">
        <option value="Breakfast" ${item.category === 'Breakfast' ? 'selected' : ''}>Breakfast</option>
        <option value="Lunch" ${item.category === 'Lunch' ? 'selected' : ''}>Lunch</option>
        <option value="Dinner" ${item.category === 'Dinner' ? 'selected' : ''}>Dinner</option>
        <option value="Drinks" ${item.category === 'Drinks' ? 'selected' : ''}>Drinks</option>
        <option value="Dessert" ${item.category === 'Dessert' ? 'selected' : ''}>Dessert</option>
        <option value="General" ${item.category === 'General' ? 'selected' : ''}>General</option>
      </select>
      <label style="display:flex;align-items:center;gap:4px;font-size:0.85rem;white-space:nowrap">
        <input type="checkbox" ${item.is_available ? 'checked' : ''} onchange="updateMenuItem(${item.id}, 'is_available', this.checked)"> Available
      </label>
      <button class="btn btn-danger btn-sm" onclick="deleteMenuItem(${item.id})">ðŸ—‘ï¸</button>
    </div>
  `).join('');
}

function showAddItem() { document.getElementById('addItemForm').style.display = 'flex'; }
function hideAddItem() {
  document.getElementById('addItemForm').style.display = 'none';
  document.getElementById('itemName').value = '';
  document.getElementById('itemPrice').value = '';
  document.getElementById('itemPhoto').value = '';
}

async function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const price = parseInt(document.getElementById('itemPrice').value);
  const category = document.getElementById('itemCategory').value;
  const photo = document.getElementById('itemPhoto').value.trim() || null;
  if (!name || !price) { alert('Name and price required'); return; }
  const { error } = await supabase.from('menu_items').insert({
    restaurant_id: currentRestaurant.id, name, price, category, photo_url: photo, is_available: true
  });
  if (error) { console.error(error); return; }
  hideAddItem();
  loadMenuItems();
}

async function updateMenuItem(id, field, value) {
  const { error } = await supabase.from('menu_items').update({ [field]: value }).eq('id', id);
  if (error) console.error(error);
}

async function deleteMenuItem(id) {
  if (!confirm('Delete this item?')) return;
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) { console.error(error); return; }
  loadMenuItems();
}

async function loadReviews() {
  if (!currentRestaurant) return;
  const { data, error } = await supabase.from('reviews')
    .select('*').eq('restaurant_id', currentRestaurant.id).order('created_at', { ascending: false });
  const list = document.getElementById('reviewsList');
  if (!data || !data.length) {
    list.innerHTML = '<div class="empty-state"><span class="emoji">ðŸ’¬</span>No reviews yet.</div>';
    return;
  }
  list.innerHTML = data.map(r => `
    <div style="background:white;border-radius:8px;padding:12px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-weight:600">${escapeHtml(r.customer_name)}</span>
          <span style="color:var(--yellow);margin-left:8px">${'â˜…'.repeat(r.rating)}${'â˜†'.repeat(5-r.rating)}</span>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteReview(${r.id})">ðŸ—‘ï¸</button>
      </div>
      ${r.comment ? '<div style="color:var(--gray);margin-top:4px">' + escapeHtml(r.comment) + '</div>' : ''}
      <div style="font-size:0.8rem;color:#aaa;margin-top:4px">${formatTime(r.created_at)}</div>
    </div>
  `).join('');
}

async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) { console.error(error); return; }
  loadReviews();
}

async function saveSettings() {
  const name = document.getElementById('editName').value.trim();
  const cityId = document.getElementById('editCity').value;
  const phone = document.getElementById('editPhone').value.trim();
  const address = document.getElementById('editAddress').value.trim();
  const photo = document.getElementById('editPhoto').value.trim() || null;
  if (!name) { alert('Name is required'); return; }
  const { error } = await supabase.from('restaurants')
    .update({ name, city_id: parseInt(cityId), phone, address, photo_url: photo })
    .eq('id', currentRestaurant.id);
  if (error) { alert('Error: ' + error.message); return; }
  currentRestaurant = { ...currentRestaurant, name, city_id: parseInt(cityId), phone, address, photo_url: photo };
  document.getElementById('restaurantName').textContent = 'ðŸª ' + name;
  alert('âœ… Settings saved!');
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const map = { orders: 0, menu: 1, reviews: 2, settings: 3 };
  const tabs = document.querySelectorAll('.tab');
  if (tabs[map[tab]]) tabs[map[tab]].classList.add('active');
  const contentId = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
  document.getElementById(contentId).classList.add('active');
}

async function logout() {
  if (ordersInterval) clearInterval(ordersInterval);
  await supabase.auth.signOut();
  window.location.href = '/';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
