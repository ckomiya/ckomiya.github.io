(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var nf = new Intl.NumberFormat('es-PE');
  var DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var data = null;
  var charts = {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
  }
  function ago(iso) {
    if (!iso) return '—';
    var d = Math.floor((Date.now() - new Date(iso)) / 864e5);
    if (d < 1) return 'hoy';
    if (d === 1) return 'ayer';
    if (d < 30) return 'hace ' + d + ' días';
    return fmtDate(iso);
  }

  // ---- Tema
  function effectiveTheme() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }
  function syncThemeButton() {
    $('theme').textContent = effectiveTheme() === 'dark' ? '☀' : '☾';
  }
  $('theme').addEventListener('click', function () {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncThemeButton();
    if (data) drawCharts();
  });
  syncThemeButton();

  // ---- KPIs
  function renderKpis() {
    var k = data.kpis;
    var items = [
      [k.commits_30d, 'Commits · últimos 30 días'],
      [k.commits_year, 'Commits · ' + new Date().getFullYear()],
      [k.active_repos, 'Repos activos (último mes)'],
      [k.streak + (k.streak === 1 ? ' día' : ' días'), 'Racha actual'],
      [k.public_repos, 'Repos públicos'],
      [k.private_commits_year, 'Commits privados · ' + new Date().getFullYear()]
    ];
    $('kpis').innerHTML = items.map(function (i) {
      return '<div class="kpi"><b>' + esc(typeof i[0] === 'number' ? nf.format(i[0]) : i[0]) + '</b><span>' + esc(i[1]) + '</span></div>';
    }).join('');
  }

  // ---- Gráficos
  function chart(id) {
    if (!charts[id]) charts[id] = echarts.init($(id));
    return charts[id];
  }
  var common = function () {
    return { textStyle: { color: css('--muted'), fontFamily: 'inherit' }, animation: false };
  };
  function axisStyle() {
    return {
      axisLine: { lineStyle: { color: css('--border') } },
      axisLabel: { color: css('--muted') },
      splitLine: { lineStyle: { color: css('--border'), opacity: 0.6 } }
    };
  }
  var tooltipBase = function () {
    return { backgroundColor: css('--surface'), borderColor: css('--border'), textStyle: { color: css('--text') } };
  };

  function drawCharts() {
    var scale = [css('--s0'), css('--s1'), css('--s2'), css('--s3'), css('--s4')];
    var cal = data.calendar;
    var max = Math.max.apply(null, cal.map(function (d) { return d[1]; }).concat([1]));

    chart('c-heat').setOption(Object.assign(common(), {
      tooltip: Object.assign(tooltipBase(), {
        formatter: function (p) { return fmtDate(p.value[0]) + '<br><b>' + p.value[1] + '</b> contribuciones'; }
      }),
      visualMap: { show: false, min: 0, max: max, inRange: { color: scale }, type: 'continuous' },
      calendar: {
        top: 28, left: 38, right: 8, bottom: 4, cellSize: ['auto', 14], range: [cal[0][0], cal[cal.length - 1][0]],
        itemStyle: { borderWidth: 3, borderColor: css('--bg'), color: scale[0] },
        splitLine: { show: false }, yearLabel: { show: false },
        dayLabel: { firstDay: 1, nameMap: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], color: css('--muted'), fontSize: 10 },
        monthLabel: { nameMap: MONTHS, color: css('--muted'), fontSize: 11 }
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: cal }]
    }), true);

    chart('c-weekly').setOption(Object.assign(common(), {
      grid: { left: 36, right: 12, top: 16, bottom: 28 },
      tooltip: Object.assign(tooltipBase(), {
        trigger: 'axis',
        formatter: function (p) { return 'Semana del ' + fmtDate(p[0].value[0]) + '<br><b>' + p[0].value[1] + '</b> commits'; }
      }),
      xAxis: Object.assign({ type: 'time', axisLabel: { color: css('--muted'), hideOverlap: true,
        formatter: function (v) { return MONTHS[new Date(v).getUTCMonth()]; } } }, { axisLine: axisStyle().axisLine }),
      yAxis: Object.assign({ type: 'value', minInterval: 1 }, axisStyle()),
      series: [{ type: 'bar', data: data.weekly, barMaxWidth: 10,
        itemStyle: { color: css('--accent'), borderRadius: [2, 2, 0, 0] } }]
    }), true);

    var hmax = Math.max.apply(null, data.hourly.map(function (d) { return d[2]; }).concat([1]));
    var hours = []; for (var h = 0; h < 24; h++) hours.push(h + '');
    chart('c-hours').setOption(Object.assign(common(), {
      grid: { left: 40, right: 12, top: 8, bottom: 28 },
      tooltip: Object.assign(tooltipBase(), {
        formatter: function (p) { return DAYS[p.value[1]] + ' ' + p.value[0] + ':00<br><b>' + p.value[2] + '</b> commits'; }
      }),
      xAxis: { type: 'category', data: hours, splitArea: { show: false }, axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: css('--muted'), interval: 2 } },
      yAxis: { type: 'category', data: DAYS, inverse: true, axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: css('--muted') } },
      visualMap: { show: false, min: 0, max: hmax, inRange: { color: scale } },
      series: [{ type: 'heatmap',
        data: data.hourly.map(function (d) { return [d[1], d[0], d[2]]; }),
        itemStyle: { borderWidth: 2, borderColor: css('--bg'), borderRadius: 2 } }]
    }), true);

    var t = data.traffic.total;
    chart('c-traffic').setOption(Object.assign(common(), {
      grid: { left: 36, right: 12, top: 16, bottom: 28 },
      tooltip: Object.assign(tooltipBase(), {
        trigger: 'axis',
        formatter: function (p) { return fmtDate(p[0].value[0]) + '<br><b>' + p[0].value[1] + '</b> vistas'; }
      }),
      xAxis: { type: 'time', axisLine: axisStyle().axisLine, axisLabel: { color: css('--muted'), hideOverlap: true } },
      yAxis: Object.assign({ type: 'value', minInterval: 1 }, axisStyle()),
      series: [{ type: 'bar', barMaxWidth: 14, data: t.map(function (d) { return [d.date, d.views]; }),
        itemStyle: { color: css('--link'), borderRadius: [2, 2, 0, 0] } }]
    }), true);
  }
  window.addEventListener('resize', function () {
    Object.keys(charts).forEach(function (k) { charts[k].resize(); });
  });

  // ---- Proyectos
  function fillSelect(sel, values) {
    values.forEach(function (v) {
      var o = document.createElement('option');
      o.value = o.textContent = v;
      sel.appendChild(o);
    });
  }
  function renderProjects() {
    var st = $('f-status').value, lg = $('f-lang').value;
    var rows = data.repos.filter(function (r) {
      return (!st || r.status === st) && (!lg || r.language === lg);
    });
    $('count').textContent = rows.length + ' de ' + data.repos.length;
    $('projects').tBodies[0].innerHTML = rows.map(function (r) {
      var home = r.homepage ? ' · <a href="' + esc(r.homepage) + '" rel="noopener">sitio ↗</a>' : '';
      return '<tr>' +
        '<td class="proj"><a class="name" href="' + esc(r.url) + '" rel="noopener">' + esc(r.name) + '</a>' + home +
        (r.description ? '<div class="desc">' + esc(r.description) + '</div>' : '') + '</td>' +
        '<td data-label="Estado"><span class="badge ' + r.status + '">' + r.status + '</span></td>' +
        '<td data-label="Último commit" title="' + (r.last_commit ? esc(fmtDate(r.last_commit)) : '') + '">' + esc(ago(r.last_commit)) + '</td>' +
        '<td data-label="Lenguaje">' + esc(r.language || '—') + '</td>' +
        '<td class="num" data-label="Estrellas">' + r.stars + '</td>' +
        '<td class="num" data-label="Issues">' + r.open_issues + '</td>' +
        '<td class="num" data-label="Vistas 14 d">' + r.views_14d + '</td></tr>';
    }).join('');
  }

  // ---- Carga
  fetch('data/data.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      data = d;
      $('updated').textContent = 'Última actualización: ' + new Date(d.generated_at).toLocaleString('es-PE', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });
      renderKpis();
      var langs = Array.from(new Set(d.repos.map(function (r) { return r.language; }).filter(Boolean))).sort();
      fillSelect($('f-lang'), langs);
      fillSelect($('f-status'), ['activo', 'pausado', 'archivado']);
      $('f-status').addEventListener('change', renderProjects);
      $('f-lang').addEventListener('change', renderProjects);
      renderProjects();
      drawCharts();
    })
    .catch(function (e) {
      var el = $('error');
      el.hidden = false;
      el.textContent = 'No se pudieron cargar los datos (' + e.message + ').';
    });
})();
