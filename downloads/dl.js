(function () {
  var base = document.currentScript.src.replace(/dl\.js([?#].*)?$/, '');
  function fail(btn, label, msg) { btn.textContent = label; alert(msg); }
  function assemble(ed, btn) {
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    var label = btn.textContent;
    btn.textContent = 'Preparing download...';
    fetch(base + ed + '/manifest.json').then(function (r) { return r.json(); }).then(function (m) {
      var parts = new Array(m.chunks), done = 0, idx = 0;
      function worker() {
        if (idx >= m.chunks) return Promise.resolve();
        var i = idx++;
        var name = 'c' + ('0000' + i).slice(-4) + '.txt';
        return fetch(base + ed + '/' + name).then(function (r) { return r.text(); }).then(function (t) {
          var bin = atob(t), arr = new Uint8Array(bin.length);
          for (var j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
          parts[i] = arr; done++;
          btn.textContent = 'Downloading... ' + Math.round(done / m.chunks * 100) + '%';
          return worker();
        });
      }
      var pool = [];
      for (var k = 0; k < 6; k++) pool.push(worker());
      return Promise.all(pool).then(function () {
        var blob = new Blob(parts, { type: 'application/pdf' });
        if (blob.size !== m.size) { delete btn.dataset.busy; fail(btn, label, 'Download was incomplete (' + blob.size + ' of ' + m.size + ' bytes). Please try again.'); return; }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = m.file;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
        btn.textContent = label; delete btn.dataset.busy;
      });
    }).catch(function (e) { delete btn.dataset.busy; fail(btn, label, 'Download failed: ' + e.message); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-edition]') : null;
    if (!t) return;
    e.preventDefault();
    assemble(t.getAttribute('data-edition'), t);
  });
})();
