/* =========================================================
   script.js — ใช้ร่วมกันทุกหน้า (product.html / order.html / admin.html)
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) {
    initProductPage();
  }
  if (document.getElementById('orderForm')) {
    initOrderPage();
  }
  if (document.querySelector('#ordersTable tbody')) {
    initAdminPage();
  }
});

/* =========================================================
   1) PRODUCT PAGE
   ========================================================= */
function initProductPage() {
  var filterBar = document.getElementById('filter-bar');
  var productList = document.getElementById('product-list');
  var allProducts = [];

  var moods = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'refresh', label: 'Refresh' },
    { key: 'detox', label: 'Detox' },
    { key: 'glow', label: 'Glow' },
    { key: 'energy', label: 'Energy' }
  ];

  // สร้างปุ่มกรอง
  moods.forEach(function (mood) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.textContent = mood.label;
    btn.setAttribute('data-mood', mood.key);
    btn.addEventListener('click', function () {
      setActiveFilterButton(mood.key);
      renderProducts(filterProducts(allProducts, mood.key));
    });
    filterBar.appendChild(btn);
  });

  function setActiveFilterButton(moodKey) {
    var buttons = filterBar.querySelectorAll('.filter-btn');
    buttons.forEach(function (b) {
      if (b.getAttribute('data-mood') === moodKey) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  function filterProducts(products, moodKey) {
    if (moodKey === 'all') return products;
    return products.filter(function (p) {
      return p.mood === moodKey;
    });
  }

  function buildItemLabel(product) {
    if (product.size) {
      return product.name + ' ' + product.size;
    }
    return product.name;
  }

  function renderProducts(products) {
    productList.innerHTML = '';

    if (!products.length) {
      var empty = document.createElement('p');
      empty.className = 'product-empty';
      empty.textContent = 'ไม่พบสินค้าในหมวดนี้';
      productList.appendChild(empty);
      return;
    }

    products.forEach(function (product) {
      var card = document.createElement('div');
      card.className = 'product-card';

      var itemLabel = buildItemLabel(product);
      var orderUrl = 'order.html?item=' + encodeURIComponent(itemLabel) +
        '&price=' + encodeURIComponent(product.price);

      card.innerHTML =
        '<img class="product-card__image" src="' + product.image + '" alt="' + itemLabel + '">' +
        '<div class="product-card__body">' +
          '<span class="mood-badge mood-' + product.mood + '"><span class="mood-dot"></span>' +
            product.mood.charAt(0).toUpperCase() + product.mood.slice(1) +
          '</span>' +
          '<h3 class="product-card__name">' + product.name + '</h3>' +
          (product.size ? '<span class="product-card__size">' + product.size + '</span>' : '') +
          '<p class="product-card__desc">' + (product.description || '') + '</p>' +
          '<div class="product-card__footer">' +
            '<span class="product-card__price">฿' + product.price + '</span>' +
            '<a class="btn btn-primary btn-sm" href="' + orderUrl + '">สั่งซื้อ</a>' +
          '</div>' +
        '</div>';

      productList.appendChild(card);
    });
  }

  fetch('products.json')
    .then(function (res) { return res.json(); })
    .then(function (products) {
      allProducts = products;

      var params = new URLSearchParams(window.location.search);
      var moodParam = params.get('mood');
      var validMoods = moods.map(function (m) { return m.key; });
      var initialMood = (moodParam && validMoods.indexOf(moodParam) !== -1) ? moodParam : 'all';

      setActiveFilterButton(initialMood);
      renderProducts(filterProducts(allProducts, initialMood));
    })
    .catch(function (error) {
      console.error(error);
      productList.innerHTML = '<p class="product-empty">ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่อีกครั้ง</p>';
    });
}

/* =========================================================
   2) ORDER PAGE
   ========================================================= */
function initOrderPage() {
  var form = document.getElementById('orderForm');
  var itemsField = document.getElementById('items');
  var totalField = document.getElementById('total');
  var customerNameField = document.getElementById('customerName');
  var contactField = document.getElementById('contact');
  var noteField = document.getElementById('note');

  var params = new URLSearchParams(window.location.search);
  var item = params.get('item');
  var price = params.get('price');

  if (item !== null && itemsField) {
    itemsField.value = item;
  }
  if (price !== null && totalField) {
    totalField.value = price;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var payload = {
      customerName: customerNameField ? customerNameField.value : '',
      contact: contactField ? contactField.value : '',
      items: itemsField ? itemsField.value : '',
      total: totalField ? totalField.value : '',
      note: noteField ? noteField.value : ''
    };

    fetch('https://script.google.com/macros/s/AKfycbwZYCnI4r30bpVfItYJziVbHyOY8CVUVYeEFFnvx2b4pid2-Ba2ANmuOLScHIj5EIUB/exec', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(function () {
        window.location.href = 'thankyou.html';
      })
      .catch(function (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
  });
}

/* =========================================================
   3) ADMIN PAGE
   ========================================================= */
function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');
  var csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQVX1ZbDi1j3LMCGVPGhNWbf_TXyO0tOHsy56RZJe07-rMc0vXgfzdQANELMwxyW1ygAKSFxCm80wtV/pub?gid=0&single=true&output=csv';

  // Parser CSV แบบง่าย รองรับ field ที่ครอบด้วย double quote และมี comma/ขึ้นบรรทัดใหม่อยู่ข้างใน
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var insideQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var char = text[i];
      var nextChar = text[i + 1];

      if (insideQuotes) {
        if (char === '"' && nextChar === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          insideQuotes = false;
        } else {
          field += char;
        }
      } else {
        if (char === '"') {
          insideQuotes = true;
        } else if (char === ',') {
          row.push(field);
          field = '';
        } else if (char === '\r') {
          // ข้าม \r เฉยๆ รอ \n ตัดบรรทัด
        } else if (char === '\n') {
          row.push(field);
          rows.push(row);
          row = [];
          field = '';
        } else {
          field += char;
        }
      }
    }

    // เก็บ field/row สุดท้ายถ้ายังไม่ว่าง
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter(function (r) {
      return r.length > 1 || (r.length === 1 && r[0] !== '');
    });
  }

  function renderRows(rows) {
    tbody.innerHTML = '';

    if (!rows.length) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="6">ยังไม่มีรายการสั่งซื้อ</td>';
      tbody.appendChild(tr);
      return;
    }

    rows.forEach(function (cols) {
      var tr = document.createElement('tr');
      // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
      for (var i = 0; i < 6; i++) {
        var td = document.createElement('td');
        td.textContent = cols[i] !== undefined ? cols[i] : '';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  }

  fetch(csvUrl)
    .then(function (res) { return res.text(); })
    .then(function (csvText) {
      var allRows = parseCSV(csvText);

      if (!allRows.length) {
        renderRows([]);
        return;
      }

      // แถวแรกเป็น header ให้ตัดออก
      var dataRows = allRows.slice(1);

      // เรียงจากล่าสุดขึ้นก่อน โดยอิงคอลัมน์แรก (วันเวลา)
      dataRows.sort(function (a, b) {
        var dateA = new Date(a[0]);
        var dateB = new Date(b[0]);

        var timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        var timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

        return timeB - timeA;
      });

      renderRows(dataRows);
    })
    .catch(function (error) {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</td></tr>';
    });
}
