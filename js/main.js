// Formulář: demo režim neodesílá nic, ostrý režim posílá na endpoint ze site.json (data-endpoint).
(function () {
  document.querySelectorAll('form.formular').forEach(function (f) {
    var stav = f.querySelector('.formular-stav');
    f.addEventListener('submit', function (e) {
      var endpoint = f.getAttribute('data-endpoint');
      var demo = f.getAttribute('data-demo') === '1';
      if (f.querySelector('.past input').value) { e.preventDefault(); return; }   // robot
      if (demo || !endpoint) {
        e.preventDefault();
        stav.textContent = 'Ukázka formuláře: nic se neodesílá. Po spuštění webu bude zpráva doručena na e-mail firmy.';
        return;
      }
      e.preventDefault();
      stav.textContent = 'Odesílám…';
      fetch(endpoint, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); f.reset(); stav.textContent = 'Děkujeme, zpráva byla odeslána.'; })
        .catch(function () { stav.textContent = 'Odeslání se nepodařilo. Napište nám prosím e-mailem.'; });
    });
  });
})();
