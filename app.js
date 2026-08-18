/* ─── Mobile menu ─────────────────────────────────────────────────── */
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
}
function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}
document.getElementById('hamburger').addEventListener('click', toggleMobileMenu);

/* Close mobile menu when clicking outside */
document.addEventListener('click', function (e) {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');
  if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
    menu.classList.remove('open');
  }
});

/* ─── Shipment Tracking ───────────────────────────────────────────── */
/* Demo tracking data — keyed by tracking number */
const TRACKING_DATA = {
  'LR-20240815-7823': {
    status: 'In Transit',
    origin: 'Shanghai, China',
    destination: 'Los Angeles, USA',
    eta: 'Aug 28, 2024',
    vessel: 'MV Liora Pacific',
    steps: [
      { label: 'Shipment Booked',        date: 'Aug 15, 2024 – 09:12',  done: true,  active: false },
      { label: 'Picked Up at Origin',    date: 'Aug 15, 2024 – 14:35',  done: true,  active: false },
      { label: 'Departed Port Shanghai', date: 'Aug 16, 2024 – 22:00',  done: true,  active: false },
      { label: 'In Transit – Pacific Ocean', date: 'Aug 17, 2024',      done: false, active: true  },
      { label: 'Arrived Port Los Angeles',   date: 'ETA Aug 28, 2024',  done: false, active: false },
      { label: 'Customs Clearance',          date: 'ETA Aug 29, 2024',  done: false, active: false },
      { label: 'Delivered',                  date: 'ETA Aug 30, 2024',  done: false, active: false },
    ],
  },
  'LR-20240810-4491': {
    status: 'Delivered',
    origin: 'Rotterdam, Netherlands',
    destination: 'New York, USA',
    eta: 'Aug 20, 2024',
    vessel: 'MV Liora Atlantic',
    steps: [
      { label: 'Shipment Booked',        date: 'Aug 10, 2024 – 08:00', done: true, active: false },
      { label: 'Picked Up at Origin',    date: 'Aug 10, 2024 – 12:15', done: true, active: false },
      { label: 'Departed Port Rotterdam',date: 'Aug 11, 2024 – 18:45', done: true, active: false },
      { label: 'In Transit – Atlantic Ocean', date: 'Aug 12–18, 2024', done: true, active: false },
      { label: 'Arrived Port New York',  date: 'Aug 19, 2024 – 06:30', done: true, active: false },
      { label: 'Customs Clearance',      date: 'Aug 19, 2024 – 14:00', done: true, active: false },
      { label: 'Delivered',              date: 'Aug 20, 2024 – 10:22', done: true, active: false },
    ],
  },
  'LR-20240818-0011': {
    status: 'Customs Clearance',
    origin: 'Dubai, UAE',
    destination: 'Hamburg, Germany',
    eta: 'Aug 22, 2024',
    vessel: 'Air Freight – LH Cargo',
    steps: [
      { label: 'Shipment Booked',            date: 'Aug 18, 2024 – 07:30', done: true,  active: false },
      { label: 'Picked Up at Origin',        date: 'Aug 18, 2024 – 11:00', done: true,  active: false },
      { label: 'Departed Dubai Airport',     date: 'Aug 18, 2024 – 21:15', done: true,  active: false },
      { label: 'Arrived Frankfurt Airport',  date: 'Aug 19, 2024 – 05:40', done: true,  active: false },
      { label: 'Customs Clearance Hamburg',  date: 'Aug 19, 2024',         done: false, active: true  },
      { label: 'Out for Delivery',           date: 'ETA Aug 20, 2024',     done: false, active: false },
      { label: 'Delivered',                  date: 'ETA Aug 22, 2024',     done: false, active: false },
    ],
  },
};

function trackShipment() {
  const input  = document.getElementById('trackingInput').value.trim().toUpperCase();
  const result = document.getElementById('trackingResult');

  if (!input) {
    showTrackingError(result, 'Please enter a tracking number.');
    return;
  }

  const data = TRACKING_DATA[input];
  if (!data) {
    showTrackingError(
      result,
      `No shipment found for <strong>${escapeHtml(input)}</strong>. ` +
      'Try <strong>LR-20240815-7823</strong>, <strong>LR-20240810-4491</strong>, or <strong>LR-20240818-0011</strong>.'
    );
    return;
  }

  result.className = 'tracking-result';

  const stepsHtml = data.steps.map(function (s) {
    const dotClass = s.done ? 'step-dot done' : (s.active ? 'step-dot active' : 'step-dot');
    return (
      '<div class="tracking-step">' +
        '<div class="' + dotClass + '"></div>' +
        '<div class="step-info">' +
          '<strong>' + escapeHtml(s.label) + '</strong>' +
          '<span>' + escapeHtml(s.date) + '</span>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  var statusStyles = {
    'Delivered':         { background: '#dcfce7', color: '#166534' },
    'Customs Clearance': { background: '#fef3c7', color: '#92400e' },
  };
  var statusStyle = statusStyles[data.status] || { background: '#dbeafe', color: '#1d4ed8' };
  var badgeStyle = 'background:' + statusStyle.background + ';color:' + statusStyle.color;

  result.innerHTML =
    '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem;">' +
      '<div>' +
        '<strong style="font-size:1rem;">' + escapeHtml(input) + '</strong>' +
        '<span style="margin-left:.75rem;padding:.2rem .6rem;border-radius:20px;font-size:.75rem;font-weight:700;' + badgeStyle + ';">' +
          escapeHtml(data.status) +
        '</span>' +
      '</div>' +
      '<div style="font-size:.85rem;color:#475569;">' +
        '📦 ' + escapeHtml(data.origin) + ' → ' + escapeHtml(data.destination) + ' &nbsp;|&nbsp; 🚢 ' + escapeHtml(data.vessel) + ' &nbsp;|&nbsp; 📅 ETA: ' + escapeHtml(data.eta) +
      '</div>' +
    '</div>' +
    '<div class="tracking-steps">' + stepsHtml + '</div>';
}

function showTrackingError(el, msg) {
  el.className = 'tracking-result error';
  el.innerHTML = '<p>⚠️ ' + msg + '</p>';
}

/* Allow pressing Enter in the tracking input */
document.getElementById('trackingInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') trackShipment();
});

/* ─── Quote form ──────────────────────────────────────────────────── */
function submitQuote(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  /* Simulate network request */
  setTimeout(function () {
    document.getElementById('quoteForm').reset();
    document.getElementById('quoteSuccess').classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Submit Quote Request';
    setTimeout(function () {
      document.getElementById('quoteSuccess').classList.add('hidden');
    }, 6000);
  }, 1000);
}

/* ─── Contact form ────────────────────────────────────────────────── */
function submitContact(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  setTimeout(function () {
    document.getElementById('contactForm').reset();
    document.getElementById('contactSuccess').classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Send Message';
    setTimeout(function () {
      document.getElementById('contactSuccess').classList.add('hidden');
    }, 6000);
  }, 1000);
}

/* ─── Utility ─────────────────────────────────────────────────────── */
function escapeHtml(str) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
