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
    // "YYYY-MM-DD" es un día de calendario: en Lima (UTC-5) se correría al día anterior
    var tz = iso.length === 10 ? 'UTC' : 'America/Lima';
    return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz });
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

  // ---- Récords
  function renderRecords() {
    var r = data.records;
    $('records-sec').hidden = !r;
    if (!r) return;
    var s = r.longest_streak, hr = r.top_hour;
    var cards = [
      [s.days + (s.days === 1 ? ' día' : ' días'), 'Racha más larga con commits', fmtDate(s.start) + ' – ' + fmtDate(s.end)],
      [r.busiest_day.count + ' commits', 'Día con más commits', fmtDate(r.busiest_day.date)],
      [hr.hour + ':00–' + hr.hour + ':59', 'Hora más frecuente', hr.count + ' commits (' + Math.round(100 * hr.count / r.total) + ' %)'],
      [(100 - r.weekend_pct) + ' % / ' + r.weekend_pct + ' %', 'Entre semana / fin de semana', nf.format(r.total) + ' commits en total']
    ];
    $('records').innerHTML = cards.map(function (c) {
      return '<div class="kpi"><b>' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span><small>' + esc(c[2]) + '</small></div>';
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

    drawPhase2();

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
  function drawPhase2() {
    // Líneas agregadas vs. eliminadas por semana
    var lw = data.lines_weekly || [];
    chart('c-lines').setOption(Object.assign(common(), {
      grid: { left: 48, right: 12, top: 16, bottom: 28 },
      tooltip: Object.assign(tooltipBase(), {
        trigger: 'axis',
        formatter: function (p) {
          return 'Semana del ' + fmtDate(p[0].value[0]) + '<br><span style="color:' + css('--accent') + '">+' + nf.format(p[0].value[1]) +
            '</span> · <span style="color:' + css('--del') + '">−' + nf.format(-p[1].value[1]) + '</span>';
        }
      }),
      xAxis: { type: 'time', axisLine: { lineStyle: { color: css('--border') } },
        axisLabel: { color: css('--muted'), hideOverlap: true, formatter: function (v) { return MONTHS[new Date(v).getUTCMonth()]; } } },
      yAxis: Object.assign({ type: 'value' }, axisStyle(), {
        axisLabel: { color: css('--muted'), formatter: function (v) { return nf.format(Math.abs(v)); } } }),
      series: [
        { type: 'bar', stack: 'l', barMaxWidth: 10, data: lw.map(function (w) { return [w[0], w[1]]; }),
          itemStyle: { color: css('--accent') } },
        { type: 'bar', stack: 'l', barMaxWidth: 10, data: lw.map(function (w) { return [w[0], -w[2]]; }),
          itemStyle: { color: css('--del') } }
      ]
    }), true);

    // Tamaño de commits
    var cs = data.commit_sizes || { labels: [], counts: [], pending: 0 };
    var csTotal = cs.counts.reduce(function (a, b) { return a + b; }, 0);
    chart('c-sizes').setOption(Object.assign(common(), {
      grid: { left: 36, right: 12, top: 24, bottom: 28 },
      tooltip: Object.assign(tooltipBase(), {
        formatter: function (p) {
          return p.name + ' líneas<br><b>' + nf.format(p.value) + '</b> commits' + (csTotal ? ' (' + Math.round(100 * p.value / csTotal) + ' %)' : '');
        }
      }),
      xAxis: { type: 'category', data: cs.labels, axisTick: { show: false }, axisLine: axisStyle().axisLine,
        axisLabel: { color: css('--muted') } },
      yAxis: Object.assign({ type: 'value', minInterval: 1 }, axisStyle()),
      series: [{ type: 'bar', data: cs.counts, barMaxWidth: 44,
        label: { show: true, position: 'top', color: css('--muted') },
        itemStyle: { color: css('--link'), borderRadius: [3, 3, 0, 0] } }]
    }), true);
    $('sizes-note').textContent = (cs.pending ? 'Calculando el historial: faltan ' + nf.format(cs.pending) + ' commits. ' : '') +
      'Sin merges ni archivos generados (lockfiles, data/*.json, notebooks, CSV…).';

    // Línea de tiempo de proyectos (Gantt)
    var rs = data.repos.filter(function (r) { return r.created_at; })
      .sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    $('c-gantt').style.height = (rs.length * 24 + 56) + 'px';
    var now = Date.now();
    var statusColor = { activo: css('--active'), pausado: css('--paused'), archivado: css('--archived') };
    function ganttSeries(status) {
      return {
        type: 'custom', name: status,
        encode: { x: [1, 2], y: 0 },
        itemStyle: { color: statusColor[status] },
        data: rs.map(function (r, i) {
          if (r.status !== status) return null;
          var a = new Date(r.created_at).getTime();
          var b = Math.max(a, r.last_commit ? new Date(r.last_commit).getTime() : a);
          return { value: [i, a, b, r.name, r.language, r.commits, status] };
        }).filter(Boolean),
        renderItem: function (params, api) {
          var y = api.value(0), s = api.coord([api.value(1), y]), e = api.coord([api.value(2), y]);
          var h = api.size([0, 1])[1] * 0.62;
          return { type: 'rect', shape: { x: s[0], y: s[1] - h / 2, width: Math.max(e[0] - s[0], 4), height: h, r: 2 },
            style: api.style() };
        }
      };
    }
    chart('c-gantt').resize();
    chart('c-gantt').setOption(Object.assign(common(), {
      grid: { left: 8, right: 16, top: 34, bottom: 24, containLabel: true },
      legend: { top: 0, right: 0, textStyle: { color: css('--muted') }, itemWidth: 14, itemHeight: 10 },
      tooltip: Object.assign(tooltipBase(), {
        formatter: function (p) {
          var v = p.value;
          return '<b>' + esc(v[3]) + '</b><br>' + esc(v[4] || 'Sin lenguaje') + ' · ' + nf.format(v[5]) + ' commits míos' +
            '<br>' + fmtDate(new Date(v[1]).toISOString()) + ' → ' + fmtDate(new Date(v[2]).toISOString()) + ' · ' + v[6];
        }
      }),
      xAxis: { type: 'time', min: new Date(rs.length ? rs[0].created_at : now).getTime(), max: now,
        axisLine: axisStyle().axisLine, axisLabel: { color: css('--muted'), hideOverlap: true }, splitLine: axisStyle().splitLine },
      yAxis: { type: 'category', data: rs.map(function (r) { return r.name; }), inverse: true,
        axisTick: { show: false }, axisLine: { show: false },
        axisLabel: { color: css('--muted'), width: 130, overflow: 'truncate', fontSize: 11 } },
      series: ['activo', 'pausado', 'archivado'].map(ganttSeries)
    }), true);

    // Evolución de tecnologías: bytes por lenguaje, agregados por año de creación del repo
    var byYear = {}, totals = {};
    data.repos.forEach(function (r) {
      var y = (r.created_at || '').slice(0, 4);
      if (!y) return;
      Object.keys(r.languages || {}).forEach(function (l) {
        byYear[y] = byYear[y] || {};
        byYear[y][l] = (byYear[y][l] || 0) + r.languages[l];
        totals[l] = (totals[l] || 0) + r.languages[l];
      });
    });
    var years = Object.keys(byYear).sort();
    var ranked = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });
    var top = ranked.slice(0, 8), hasOther = ranked.length > 8;
    var palette = ['#58a6ff', '#3fb950', '#d29922', '#f778ba', '#a371f7', '#ff7b72', '#39c5cf', '#e3b341', '#8d96a0'];
    function bytesFmt(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round(n / 1e3) + ' KB'; }
    var techSeries = top.concat(hasOther ? ['Otros'] : []).map(function (l, i) {
      return { type: 'bar', stack: 't', name: l, barMaxWidth: 56, emphasis: { focus: 'series' },
        itemStyle: { color: palette[i] },
        data: years.map(function (y) {
          if (l !== 'Otros') return (byYear[y] || {})[l] || 0;
          return Object.keys(byYear[y] || {}).reduce(function (a, k) { return top.indexOf(k) < 0 ? a + byYear[y][k] : a; }, 0);
        }) };
    });
    chart('c-tech').setOption(Object.assign(common(), {
      grid: { left: 52, right: 12, top: 16, bottom: 56 },
      legend: { bottom: 0, textStyle: { color: css('--muted') }, itemWidth: 12, itemHeight: 10 },
      tooltip: Object.assign(tooltipBase(), {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: function (ps) {
          var rows = ps.filter(function (p) { return p.value > 0; }).reverse();
          return '<b>Repos creados en ' + ps[0].axisValue + '</b><br>' + rows.map(function (p) {
            return p.marker + esc(p.seriesName) + ': <b>' + bytesFmt(p.value) + '</b>';
          }).join('<br>');
        }
      }),
      xAxis: { type: 'category', data: years, axisTick: { show: false }, axisLine: axisStyle().axisLine, axisLabel: { color: css('--muted') } },
      yAxis: Object.assign({ type: 'value' }, axisStyle(), {
        axisLabel: { color: css('--muted'), formatter: bytesFmt } }),
      series: techSeries
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
      renderRecords();
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
