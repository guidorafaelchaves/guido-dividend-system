(function(global, document){
  'use strict';

  const D = global.DividendDomain;
  const C = global.DividendCalendarAnalytics;
  const money = value => Number(value || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  const pct = value => `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits:2 })}%`;
  const date = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '-';
  const fullDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '-';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);

  function routeFromPath(){
    const path = location.pathname.replace(/\/index\.html$/,'/').replace(/\/+$/,'/') || '/';
    if(path === '/' || path.endsWith('/guido-dividend-system/')) return 'home';
    if(path.includes('/ativos/') && path.split('/').filter(Boolean).length >= 2) return 'assetDetail';
    if(path.includes('/ativos/')) return 'assets';
    if(path.includes('/calendario/')) return 'calendar';
    if(path.includes('/mapa-da-renda/')) return 'incomeMap';
    if(path.includes('/sobre/')) return 'about';
    if(path.includes('/metodologia/')) return 'methodology';
    if(path.includes('/entrar/')) return 'login';
    if(path.includes('/cadastro/')) return 'register';
    if(path.includes('/meu-painel/')) return 'privateDashboard';
    if(path.includes('/favoritos/')) return 'favorites';
    if(path.includes('/watchlist/')) return 'watchlist';
    if(path.includes('/minha-agenda/')) return 'agenda';
    if(path.includes('/notificacoes/')) return 'notifications';
    if(path.includes('/carteiras/nova/')) return 'newPortfolio';
    if(path.includes('/carteiras/')) return 'portfolios';
    if(path.includes('/conta/')) return 'account';
    if(path.includes('/admin/proventos/')) return 'adminProventos';
    if(path.includes('/admin/importacoes/nova/')) return 'adminNewImport';
    if(path.includes('/admin/importacoes/')) return 'adminImports';
    if(path.includes('/admin/brapi/')) return 'adminBrapi';
    if(path.includes('/admin/eventos/')) return 'adminEvents';
    if(path.includes('/admin/revisao/')) return 'adminReview';
    if(path.includes('/admin/publicacao/')) return 'adminPublishing';
    if(path.includes('/admin/ativos/')) return 'adminAssets';
    if(path.includes('/admin/fontes/')) return 'adminSources';
    if(path.includes('/admin/qualidade/')) return 'adminQuality';
    if(path.includes('/admin/jobs/')) return 'adminJobs';
    if(path.includes('/admin/auditoria/')) return 'adminAudit';
    if(path.includes('/admin/finops/')) return 'adminFinops';
    if(path.includes('/admin/configuracoes/')) return 'adminSettings';
    if(path.includes('/admin/seguranca/')) return 'adminSecurity';
    if(path.includes('/admin/')) return 'admin';
    if(path.includes('/sistema/')) return 'system';
    return 'home';
  }

  function assets(){
    return D.assetRepository.all().map(D.normalizeAsset);
  }

  function events(){
    return (D.publishedEventRepository || D.eventRepository).all().map(D.normalizeEvent);
  }

  function assetByTicker(ticker){
    return assets().find(item => item.ticker === D.normalizeTicker(ticker));
  }

  function daysUntil(value){
    if(!value) return null;
    const today = new Date();
    const target = new Date(`${value}T12:00:00`);
    today.setHours(12,0,0,0);
    return Math.round((target - today) / 86400000);
  }

  function humanDistance(value){
    const days = daysUntil(value);
    if(days === null) return 'data pendente';
    if(days < 0) return 'data passada';
    if(days === 0) return 'hoje';
    if(days === 1) return 'amanha';
    if(days <= 14) return `em ${days} dias`;
    if(days <= 45) return `em ${Math.round(days / 7)} semanas`;
    return `previsto para ${date(value)}`;
  }

  function progressFor(value){
    const days = daysUntil(value);
    if(days === null) return 16;
    return Math.max(12, Math.min(96, 100 - (Math.max(0, days) / 90) * 100));
  }

  function statusChip(status){
    return `<span class="status ${esc(status)}" title="${statusHelp(status)}">${D.statusLabel(status)}</span>`;
  }

  function statusHelp(status){
    return {
      confirmed:'Evento confirmado por fonte ou curadoria validada.',
      provisioned:'Dado forte, ainda sujeito a validacao final.',
      estimated:'Estimativa baseada em historico ou dados parciais.',
      projected:'Projecao explicita, nao confirmada.'
    }[status] || 'Status informacional.';
  }

  function nextEvents(limit){
    return events().sort((a,b) => String(a.paymentDate).localeCompare(String(b.paymentDate))).slice(0, limit || 6);
  }

  function eventAmount(event){
    return money(event.amount);
  }

  function renderEventCard(event, index){
    const asset = assetByTicker(event.ticker);
    return `<article class="card event-card reveal" style="transition-delay:${Math.min(index, 4) * 70}ms">
      <div class="event-top">
        <div><div class="ticker">${esc(event.ticker)}</div><div class="event-kind">${esc(event.kind)} ${asset ? `- ${esc(asset.name)}` : ''}</div></div>
        ${statusChip(event.status)}
      </div>
      <div class="event-value">${eventAmount(event)} <small class="muted">por unidade</small></div>
      <div class="timeline-bar" aria-label="Proximidade temporal"><i style="width:${progressFor(event.paymentDate)}%"></i></div>
      <div class="event-meta">
        <div><span>Pagamento</span><b>${fullDate(event.paymentDate)}</b></div>
        <div><span>Distancia</span><b>${humanDistance(event.paymentDate)}</b></div>
      </div>
      <div class="source-trail"><span>Fonte ${esc(event.source)}</span><i></i><span>Atualizado em fixture demo</span></div>
    </article>`;
  }

  function renderHeroRadar(){
    const radarEvents = nextEvents(3);
    const safe = radarEvents.length ? radarEvents : events().slice(0,3);
    return `<aside class="temporal-radar" aria-label="Radar Temporal de Proventos">
      <div class="radar-grid" aria-hidden="true">
        <div class="radar-ring r1"></div><div class="radar-ring r2"></div><div class="radar-ring r3"></div>
        <div class="radar-center">Hoje</div><div class="radar-sweep"></div>
      </div>
      ${safe.map((event, i) => `<div class="radar-event ${['near','mid','far'][i] || 'far'}">
        <strong>${esc(event.ticker)}</strong>
        <small>${esc(event.kind)} - ${humanDistance(event.paymentDate)}</small>
        <div class="event-value">${eventAmount(event)}</div>
        ${statusChip(event.status)}
      </div>`).join('')}
      <div class="radar-caption">
        <div><span>7 dias</span><b>${events().filter(e => (daysUntil(e.paymentDate) ?? 99) <= 7).length}</b></div>
        <div><span>30 dias</span><b>${events().filter(e => (daysUntil(e.paymentDate) ?? 99) <= 30).length}</b></div>
        <div><span>90 dias</span><b>${events().length}</b></div>
      </div>
    </aside>`;
  }

  function renderHome(){
    const upcoming = nextEvents(6);
    const confirmed = events().filter(e => e.status === D.EVENT_STATUS.CONFIRMED).length;
    const provisioned = events().filter(e => e.status === D.EVENT_STATUS.PROVISIONED).length;
    return `
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Radar Temporal de Proventos</span>
          <h1>O futuro da renda passiva, organizado por data.</h1>
          <p class="lead">Explore dividendos, rendimentos e juros anunciados. Entenda o grau de confirmacao e reuna os eventos relevantes em uma agenda financeira clara.</p>
          <div class="actions">
            <a class="btn primary" href="/calendario/">Explorar proximos pagamentos</a>
            <a class="btn secondary" href="#como-funciona">Ver como funciona</a>
            <a class="btn ghost" href="/sistema/">Acessar meu Dividend System</a>
          </div>
          <form class="hero-search" id="heroSearchForm" role="search">
            <input id="heroSearch" type="search" placeholder="Pesquise um ativo, empresa ou titulo" autocomplete="off">
            <button class="btn primary" type="submit">Pesquisar</button>
          </form>
          <div class="search-results" id="heroSearchResults" aria-live="polite">${assets().slice(0,3).map(a => `<a class="search-chip" href="/ativos/${esc(a.ticker)}/">${esc(a.ticker)} <span>${esc(a.type)}</span></a>`).join('')}</div>
        </div>
        ${renderHeroRadar()}
      </section>

      <section class="grid cols-4 reveal" aria-label="Resumo do mercado">
        <article class="card metric"><small>Ativos no radar</small><b data-count="${assets().length}">${assets().length}</b></article>
        <article class="card metric"><small>Eventos monitorados</small><b data-count="${events().length}">${events().length}</b></article>
        <article class="card metric"><small>Confirmados</small><b data-count="${confirmed}">${confirmed}</b></article>
        <article class="card metric"><small>Provisionados</small><b data-count="${provisioned}">${provisioned}</b></article>
      </section>

      <section class="section-band" id="como-funciona">
        <div class="section-intro reveal"><div><span class="eyebrow">O que esta chegando?</span><h2>Pagamentos futuros deixam de ficar espalhados.</h2><p>O radar organiza ativo, data e fluxo para voce entender rapidamente o que esta confirmado, estimado ou apenas projetado.</p></div></div>
        <div class="grid cols-3">${upcoming.slice(0,3).map(renderEventCard).join('')}</div>
      </section>

      <section class="section-band">
        <div class="section-intro reveal"><div><span class="eyebrow">Como confiar?</span><h2>Voce sempre sabe de onde o dado veio.</h2><p>Status, fonte, atualizacao e historico transformam metodologia em parte da experiencia, nao em rodape escondido.</p></div></div>
        <div class="panel source-trail reveal"><span>Fonte publica</span><i></i><span>Normalizacao</span><i></i><span>Validacao</span><i></i><span>Publicacao</span><i></i><span>Agenda pessoal</span></div>
      </section>

      <section class="section-band">
        <div class="section-intro reveal"><div><span class="eyebrow">O que isso representa para mim?</span><h2>Simule um evento sem criar conta.</h2><p>Uma ferramenta curta para transformar valor por unidade em impacto aproximado, sempre com aviso informacional.</p></div></div>
        ${renderSimulator()}
      </section>

      <section class="section-band">
        <div class="section-intro reveal"><div><span class="eyebrow">Jornada</span><h2>Quatro camadas, uma progressao de valor.</h2><p>Descubra o mercado, acompanhe ativos, controle sua carteira e evolua para inteligencia patrimonial.</p></div></div>
        <div class="story-steps reveal">
          <div class="story-step"><b>Descobrir</b><span>Explore eventos publicos sem cadastro.</span></div>
          <div class="story-step"><b>Acompanhar</b><span>Salve favoritos, watchlist e alertas.</span></div>
          <div class="story-step"><b>Controlar</b><span>Conecte posicoes, proventos e historico.</span></div>
          <div class="story-step"><b>Compreender</b><span>Use memoria, contexto e cenarios futuros.</span></div>
        </div>
      </section>`;
  }

  function renderSimulator(){
    const first = nextEvents(1)[0] || events()[0];
    const options = events().map(event => `<option value="${esc(event.ticker)}">${esc(event.ticker)} - ${esc(event.kind)} (${eventAmount(event)})</option>`).join('');
    return `<div class="simulator reveal">
      <form class="panel form-stack" id="simForm">
        <div class="form-row"><label for="simTicker">Evento</label><select id="simTicker">${options}</select></div>
        <div class="form-row"><label for="simQty">Quantidade</label><input id="simQty" type="number" min="0" step="1" value="1000"></div>
        <button class="btn primary" type="submit">Calcular impacto aproximado</button>
        <p class="muted">Uso informacional. O valor depende da quantidade elegivel, tributacao e confirmacao do evento.</p>
      </form>
      <div class="sim-result" id="simResult">
        <div><span class="eyebrow">Resultado aproximado</span><b>${money((first?.amount || 0) * 1000)}</b><p class="muted">${first ? `${first.ticker}, ${humanDistance(first.paymentDate)}, ${D.statusLabel(first.status)}` : 'Selecione um evento'}</p></div>
      </div>
    </div>`;
  }

  function renderAssets(){
    const data = assetDiscoveryData();
    return `<section class="asset-discovery-page">
      <section class="asset-discovery-hero reveal">
        <div><span class="eyebrow">Descoberta de ativos</span><h1>Descubra o proximo fluxo.</h1><p>Explore acoes, FIIs e outros ativos por proximos eventos, recorrencia, retorno do evento e grau de confianca.</p></div>
        <div class="asset-discovery-kpis">
          ${adminKpi('Com eventos futuros', String(data.withFuture.length), 'protagonistas da pagina')}
          ${adminKpi('Confirmados', String(data.confirmedCount), 'eventos com maior confianca')}
          ${adminKpi('Data-com em 30 dias', String(data.recordSoonCount), 'janelas proximas')}
          ${adminKpi('Alta recorrencia', String(data.highRecurring.length), 'fluxo mais regular')}
        </div>
      </section>
      <section class="asset-intents reveal" aria-label="O que voce procura">
        <div><span class="eyebrow">O que voce procura?</span><h2>Encontre ativos pelo que eles ainda podem entregar.</h2></div>
        <div class="quick-filters">
          ${[
            ['upcoming','Proximos pagamentos'],['recurring','Maior recorrencia'],['record','Data-com mais proxima'],['confirmed','Eventos confirmados'],['yield','Maior retorno do evento'],['fii','FIIs mensais'],['stocks','Acoes recorrentes'],['confidence','Maior confianca']
          ].map(([key,label], index) => `<button class="pill asset-intent ${index === 0 ? 'active' : ''}" type="button" data-intent="${key}">${label}</button>`).join('')}
        </div>
        <input id="assetSearch" type="search" placeholder="Pesquise um ativo, setor, mes ou tipo de pagamento">
        <input id="assetIntent" type="hidden" value="upcoming">
      </section>
      <section class="section-band reveal"><div class="section-intro"><div><span class="eyebrow">Proximos a pagar</span><h2>Ativos com eventos futuros relevantes</h2><p>O catalogo completo fica abaixo. Aqui entram os ativos com proximo fluxo publicado.</p></div></div><div class="asset-discovery-grid" id="assetRows"></div><div id="assetCaptureStatus" class="notice asset-capture-status">Capture um evento para guardar a intencao e continuar na conta gratuita.</div></section>
      <section class="asset-lanes reveal">
        <article class="panel"><span class="eyebrow">Ativos que mantem o fluxo</span><h2>Renda recorrente</h2>${data.highRecurring.slice(0,5).map(renderRecurringAsset).join('') || '<p class="muted">Historico insuficiente para recorrencia alta.</p>'}</article>
        <article class="panel"><span class="eyebrow">Data-com mais proxima</span><h2>Ultimos dias para entrar no proximo evento</h2>${data.byRecordDate.slice(0,5).map(renderCompactAssetFlow).join('')}</article>
      </section>
      <section class="asset-lanes reveal">
        <article class="panel"><span class="eyebrow">Maiores retornos de evento</span><h2>Recorrentes e extraordinarios separados na leitura</h2>${data.highYield.slice(0,5).map(renderCompactAssetFlow).join('')}</article>
        <article class="panel"><span class="eyebrow">Quem pode pagar em cada mes?</span><h2>Ativos por periodo</h2><div class="asset-months">${data.months.slice(0,4).map(month => `<div><b>${esc(monthLabel(month.month))}</b><span>${month.rows.length} ativos</span>${month.rows.slice(0,4).map(row => `<a href="/ativos/${esc(row.ticker)}/">${esc(row.ticker)}</a>`).join('')}<a class="btn secondary" href="/calendario/">Abrir no calendario</a></div>`).join('')}</div></article>
      </section>
      <section class="panel reveal"><span class="eyebrow">Papel no fluxo</span><h2>Ativos por funcao de renda</h2><div class="asset-role-grid">${data.roles.map(role => `<article><b>${esc(role.label)}</b><span>${role.rows.length} ativos</span><small>${esc(role.note)}</small></article>`).join('')}</div></section>
      <section class="panel reveal"><span class="eyebrow">Comparacao rapida</span><h2>Compare sem declarar vencedor</h2><div id="assetCompareBox" class="asset-compare-box">Selecione de dois a quatro ativos nos cards para comparar proximo evento, retorno, recorrencia e confianca.</div></section>
      <section class="panel reveal"><span class="eyebrow">Catalogo completo</span><h2>Todos os ativos continuam acessiveis</h2><label class="pill"><input id="includeEmptyAssets" type="checkbox"> Incluir ativos sem evento futuro</label><div class="table-wrap"><table><thead><tr><th>Ativo</th><th>Tipo</th><th>Qualidade</th><th>Preco</th><th>Proximo fluxo</th><th>Acao</th></tr></thead><tbody id="assetCatalogRows"></tbody></table></div></section>
      <section class="personal-calendar panel reveal"><div><span class="eyebrow">Do mercado para sua carteira</span><h2>O mercado mostra eventos. O Dividend System mostra o que eles significam para voce.</h2><p class="muted">Transforme valor por unidade em valor previsto para sua posicao, retorno sobre seu preco medio, historico da sua renda e conciliacao.</p></div><div class="portfolio-toggle"><a class="pill active" href="/cadastro/">Transformar ativos em carteira acompanhada</a><a class="pill" href="/sistema/">Ver Dividend System</a></div></section>
    </section>`;
  }

  function paintAssetRows(){
    const data = assetDiscoveryData();
    const q = (document.getElementById('assetSearch')?.value || '').toLowerCase();
    const intent = document.getElementById('assetIntent')?.value || 'upcoming';
    const includeEmpty = document.getElementById('includeEmptyAssets')?.checked;
    const sourceRows = ({
      upcoming:data.withFuture,
      recurring:data.highRecurring,
      record:data.byRecordDate,
      confirmed:data.withFuture.filter(row => row.next?.eventStatus === 'confirmed'),
      yield:data.highYield,
      fii:data.withFuture.filter(row => row.asset.type === 'FII'),
      stocks:data.withFuture.filter(row => row.asset.type === 'Acao'),
      confidence:data.withFuture.filter(row => ['confirmed','provisioned'].includes(row.next?.eventStatus))
    })[intent] || data.withFuture;
    const rows = sourceRows.filter(row => {
      const hay = `${row.ticker} ${row.asset.name} ${row.asset.sector} ${row.asset.type} ${row.next?.eventType || ''} ${row.next?.regularity || ''} ${row.monthLabel || ''}`.toLowerCase();
      return !q || hay.includes(q);
    });
    const body = document.getElementById('assetRows');
    if(body) body.innerHTML = rows.length ? rows.slice(0, 12).map(renderDiscoveryAssetCard).join('') : '<div class="empty">Nenhum ativo possui evento publicado com estes criterios. Amplie o periodo, remova filtro de retorno ou veja o catalogo completo.</div>';
    const catalog = document.getElementById('assetCatalogRows');
    if(catalog) catalog.innerHTML = (includeEmpty ? data.all : data.withFuture).slice(0, 80).map(renderAssetCatalogRow).join('');
    wireReveals();
  }

  function wireAssetDiscovery(){
    if(routeFromPath() !== 'assets') return;
    document.querySelectorAll('.asset-intent').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('.asset-intent').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      const input = document.getElementById('assetIntent');
      if(input) input.value = button.dataset.intent || 'upcoming';
      paintAssetRows();
    }));
    document.getElementById('assetSearch')?.addEventListener('input', paintAssetRows);
    document.getElementById('includeEmptyAssets')?.addEventListener('change', paintAssetRows);
    document.addEventListener('click', ev => {
      const capture = ev.target.closest('.asset-capture');
      if(capture){
        const status = document.getElementById('assetCaptureStatus');
        if(status) status.innerHTML = `<b>${esc(capture.dataset.ticker || 'Evento')} capturado como intencao.</b> Crie uma conta gratuita para receber alertas de data-com, confirmacao, alteracao e pagamento. <a href="/cadastro/">Criar conta gratuita</a>`;
      }
    });
    document.addEventListener('change', ev => {
      if(!ev.target.classList.contains('asset-compare-check')) return;
      const selected = [...document.querySelectorAll('.asset-compare-check:checked')].slice(0,4).map(input => input.value);
      document.querySelectorAll('.asset-compare-check').forEach(input => {
        if(selected.length >= 4 && !input.checked) input.disabled = true;
        else input.disabled = false;
      });
      const box = document.getElementById('assetCompareBox');
      if(!box) return;
      const rows = assetDiscoveryData().all.filter(row => selected.includes(row.ticker));
      box.innerHTML = rows.length >= 2 ? `<div class="table-wrap"><table><thead><tr><th>Indicador</th>${rows.map(row => `<th>${esc(row.ticker)}</th>`).join('')}</tr></thead><tbody>
        <tr><td>Proximo evento</td>${rows.map(row => `<td>${row.next ? fullDate(row.next.paymentDate) : '-'}</td>`).join('')}</tr>
        <tr><td>Retorno do evento</td>${rows.map(row => `<td>${row.next?.eventYieldPercent === null || !row.next ? '-' : pct(row.next.eventYieldPercent)}</td>`).join('')}</tr>
        <tr><td>Recorrencia</td>${rows.map(row => `<td>${esc(row.next?.regularity || row.quality)}</td>`).join('')}</tr>
        <tr><td>Confianca</td>${rows.map(row => `<td>${esc(row.next?.eventStatus || 'sem evento')}</td>`).join('')}</tr>
      </tbody></table></div>` : 'Selecione de dois a quatro ativos nos cards para comparar proximo evento, retorno, recorrencia e confianca.';
    });
  }

  function assetDiscoveryData(){
    const assetList = assets();
    const viewEvents = C.buildEventViews(events(), assetList, { capital:10000, mode:'perAsset' });
    const byTicker = new Map(assetList.map(asset => [asset.ticker, { ticker:asset.ticker, asset, events:[], next:null, quality:'Cadastro incompleto', relevance:0, role:'Ativos em observacao' }]));
    viewEvents.forEach(event => {
      if(!byTicker.has(event.ticker)) byTicker.set(event.ticker, { ticker:event.ticker, asset:D.normalizeAsset({ ticker:event.ticker, name:event.assetName, type:event.assetType }), events:[], next:null, quality:'Evento disponivel', relevance:0, role:'Ativos em observacao' });
      byTicker.get(event.ticker).events.push(event);
    });
    const rows = [...byTicker.values()].map(row => {
      const future = row.events.filter(event => event.paymentDate && daysUntil(event.paymentDate) >= -1).sort((a,b) => String(a.paymentDate).localeCompare(String(b.paymentDate)));
      const next = future[0] || null;
      const hasPrice = Number(row.asset.price || next?.currentPrice || 0) > 0;
      const highRecurrence = Number(row.asset.recurrenceScore || 0) >= 80 || String(next?.regularity || '').includes('alta');
      const quality = next && hasPrice ? 'Dados completos' : next ? 'Evento disponivel' : row.events.length ? 'Historico disponivel' : 'Cadastro incompleto';
      const role = next?.isExtraordinary ? 'Pagamentos extraordinarios' : highRecurrence && row.asset.type === 'FII' ? 'Base mensal' : highRecurrence ? 'Renda complementar' : next ? 'Eventos sazonais' : 'Ativos em observacao';
      const relevance = (next ? 50 : 0) + (next?.eventStatus === 'confirmed' ? 16 : 0) + Math.min(18, Number(next?.eventYieldPercent || 0) * 8) + (highRecurrence ? 12 : 0) + (hasPrice ? 8 : 0);
      return { ...row, next, quality, role, relevance, hasPrice, monthLabel: next?.paymentDate ? monthLabel(next.paymentDate.slice(0,7)) : '' };
    }).sort((a,b) => b.relevance - a.relevance);
    const withFuture = rows.filter(row => row.next);
    const byRecordDate = [...withFuture].sort((a,b) => (daysUntil(a.next.recordDate || a.next.exDate) ?? 999) - (daysUntil(b.next.recordDate || b.next.exDate) ?? 999));
    const highYield = [...withFuture].sort((a,b) => Number(b.next.eventYieldPercent || 0) - Number(a.next.eventYieldPercent || 0));
    const highRecurring = rows.filter(row => row.role === 'Base mensal' || row.role === 'Renda complementar').sort((a,b) => Number(b.asset.recurrenceScore || 0) - Number(a.asset.recurrenceScore || 0));
    const months = Object.values(withFuture.reduce((acc, row) => {
      const month = row.next.paymentDate.slice(0,7);
      acc[month] = acc[month] || { month, rows:[] };
      acc[month].rows.push(row);
      return acc;
    }, {})).sort((a,b) => a.month.localeCompare(b.month));
    const roleLabels = [
      ['Base mensal','Ativos com alta regularidade e fluxo mensal.'],
      ['Renda complementar','Pagamentos periodicos, mas nao necessariamente mensais.'],
      ['Eventos sazonais','Fluxo concentrado em determinados meses.'],
      ['Pagamentos extraordinarios','Eventos relevantes, porem nao recorrentes.'],
      ['Ativos em observacao','Sem evento futuro ou dados suficientes.']
    ];
    const roles = roleLabels.map(([label,note]) => ({ label, note, rows:rows.filter(row => row.role === label) }));
    return {
      all:rows,
      withFuture,
      byRecordDate,
      highYield,
      highRecurring,
      months,
      roles,
      confirmedCount:withFuture.filter(row => row.next.eventStatus === 'confirmed').length,
      recordSoonCount:withFuture.filter(row => (daysUntil(row.next.recordDate || row.next.exDate) ?? 999) <= 30).length
    };
  }

  function renderDiscoveryAssetCard(row){
    const next = row.next;
    const price = next?.currentPrice || row.asset.price;
    const simulatedIncome = next && price ? money((10000 / price) * next.amountPerUnit) : 'indisponivel';
    return `<article class="discovery-asset-card ${row.quality === 'Cadastro incompleto' ? 'muted-card' : ''}">
      <div class="event-top"><div><a class="ticker" href="/ativos/${esc(row.ticker)}/">${esc(row.ticker)}</a><div class="event-kind">${esc(row.asset.name)} - ${esc(row.asset.sector)}</div></div><span class="pill">${esc(row.asset.type)}</span></div>
      <div class="asset-flow-next"><span>Proximo fluxo</span><b>${next ? esc(next.eventType) : 'Nenhum evento futuro publicado'}</b><small>${next ? `${money(next.amountPerUnit)} por unidade | ${next.eventYieldPercent === null ? 'retorno indisponivel' : pct(next.eventYieldPercent)}` : `Recorrencia historica: ${row.asset.recurrenceScore ? `${row.asset.recurrenceScore}/100` : 'dados insuficientes'}`}</small></div>
      <div class="event-meta"><div><span>Data-com</span><b>${next ? fullDate(next.recordDate || next.exDate) : '-'}</b></div><div><span>Pagamento</span><b>${next ? fullDate(next.paymentDate) : '-'}</b></div></div>
      <div class="asset-reason"><b>Em destaque porque:</b><span>${next ? `${next.eventStatus === 'confirmed' ? 'evento confirmado' : 'evento publicado'}, ${next.regularity}, ${humanDistance(next.paymentDate)}` : row.quality}</span></div>
      <div class="asset-proof">${esc(next?.sourceName || row.asset.source || 'fonte nao informada')} - ${next?.updatedAt ? `atualizado ${fullDate(next.updatedAt)}` : 'atualizacao nao informada'} - ${esc(row.quality)}</div>
      <div class="asset-card-actions">
        ${next ? `<button class="btn primary asset-capture" type="button" data-event-id="${esc(next.eventId)}" data-ticker="${esc(row.ticker)}">Capturar evento</button>` : `<a class="btn primary" href="/cadastro/">Acompanhar anuncio</a>`}
        <a class="btn secondary" href="/ativos/${esc(row.ticker)}/">Abrir ativo</a>
        <label class="pill"><input class="asset-compare-check" type="checkbox" value="${esc(row.ticker)}"> Comparar</label>
      </div>
      <p class="muted">Com R$ 10.000 neste ativo: aproximadamente ${simulatedIncome} brutos neste evento. Nao e recomendacao.</p>
    </article>`;
  }

  function renderCompactAssetFlow(row){
    return `<div class="event-capture-row"><div><b>${esc(row.ticker)}</b><br><span class="muted">${row.next ? `${fullDate(row.next.recordDate || row.next.exDate)} | ${row.next.eventYieldPercent === null ? 'sem retorno calculado' : pct(row.next.eventYieldPercent)}` : row.quality}</span></div><a class="btn secondary" href="/ativos/${esc(row.ticker)}/">Abrir</a></div>`;
  }

  function renderRecurringAsset(row){
    return `<div class="map-share"><b>${esc(row.ticker)}</b><span>${row.asset.recurrenceScore || 'dados'} / 100 de recorrencia</span><small>Proximo evento: ${row.next ? fullDate(row.next.paymentDate) : 'aguardando publicacao'} | ${esc(row.role)}</small></div>`;
  }

  function renderAssetCatalogRow(row){
    const price = row.hasPrice ? money(row.asset.price || row.next?.currentPrice) : 'Cotacao indisponivel';
    return `<tr><td><b>${esc(row.ticker)}</b><br><span class="muted">${esc(row.asset.name)}</span></td><td>${esc(row.asset.type)}</td><td>${esc(row.quality)}</td><td>${price}</td><td>${row.next ? `${esc(row.next.eventType)} em ${fullDate(row.next.paymentDate)}` : 'Acompanhar proximo anuncio'}</td><td><a class="btn secondary" href="/ativos/${esc(row.ticker)}/">Abrir</a></td></tr>`;
  }

  function renderAssetDetail(){
    const parts = location.pathname.split('/').filter(Boolean);
    const ticker = D.normalizeTicker(parts[parts.indexOf('ativos') + 1] || new URLSearchParams(location.search).get('ticker') || 'MXRF11');
    const asset = assetByTicker(ticker) || assets()[0];
    const related = events().filter(event => event.ticker === asset.ticker);
    const next = related[0];
    return `<section class="split">
      <div class="grid">
        <article class="panel reveal">
          <span class="eyebrow">${esc(asset.type)} acompanhado</span>
          <h1>${esc(asset.ticker)} - ${esc(asset.name)}</h1>
          <p class="lead">${next ? `Proximo ${esc(next.kind)} ${humanDistance(next.paymentDate)}. Valor informado: ${eventAmount(next)} por unidade.` : 'Ainda sem evento publico publicado para este ativo.'}</p>
          <div class="actions"><button class="btn primary" id="refreshBrapi">Atualizar via BRAPI gateway</button><a class="btn secondary" href="/cadastro/">Acompanhar ativo</a></div>
        </article>
        <article class="card reveal"><h2>Linha temporal do ativo</h2><div class="calendar-list">${related.map(renderEventRow).join('') || '<div class="empty">Sem eventos publicados.</div>'}</div></article>
        <section class="reveal"><h2>Quanto esse evento representa?</h2>${renderSimulator()}</section>
      </div>
      <aside class="panel grid reveal">
        <div class="metric"><small>Preco atual</small><b>${money(asset.price)}</b></div>
        <div class="metric"><small>Dividend yield</small><b>${pct(asset.dividendYield)}</b></div>
        <div class="metric"><small>Recorrencia</small><b>${asset.recurrenceScore}/100</b></div>
        <div id="brapiStatus" class="notice">BRAPI encapsulada. O token nao aparece no cliente publico.</div>
      </aside>
    </section>`;
  }

  function renderEventRow(event){
    return `<div class="event-row"><strong>${humanDistance(event.paymentDate)}</strong><div><b>${esc(event.ticker)} - ${esc(event.kind)}</b><br><span class="muted">Data-com: ${fullDate(event.exDate)} | Pagamento: ${fullDate(event.paymentDate)} | Fonte: ${esc(event.source)}</span></div><div>${statusChip(event.status)}<br><span class="event-value">${eventAmount(event)}</span></div></div>`;
  }

  function calendarViews(simulation = {}){
    const viewEvents = C.buildEventViews(events(), assets(), simulation);
    return { viewEvents, summary:C.summarizePeriod(viewEvents, simulation), month:C.buildMonth(viewEvents, simulation) };
  }

  function calendarMonthName(monthKey){
    return new Date(`${monthKey}-01T12:00:00`).toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
  }

  function calendarStatusChip(status){
    return statusChip(status === 'projected' ? 'projected' : status);
  }

  function renderCalendarMetric(label, value, note){
    return `<article class="calendar-metric"><span>${esc(label)}</span><b>${esc(value)}</b>${note ? `<small>${esc(note)}</small>` : ''}</article>`;
  }

  function renderCalendarHeader(summary, simulation, monthKey){
    const returnLabel = summary.portfolioReturnPercent === null ? `${pct(summary.averageEventYieldPercent)} medio por evento` : `${pct(summary.portfolioReturnPercent)} no periodo`;
    return `<section class="calendar-hero reveal">
      <div>
        <span class="eyebrow">Mesa operacional de proventos</span>
        <h1>O que paga, quando comprar e quais eventos merecem atencao agora.</h1>
        <p class="lead">A decisao comeca pelo ativo. A tabela prioriza Data COM, pagamento, DY do evento, DY equivalente, recorrencia, confianca e Opportunity Score. Calendario, agenda e linha do tempo entram como visualizacoes secundarias.</p>
      </div>
      <aside class="calendar-sticky" aria-label="Resumo sticky do calendario">
        <b>${money(summary.totalEstimatedIncome)}</b>
        <span>renda bruta estimada para ${money(simulation.capital)} ${simulation.mode === 'distributed' ? 'distribuidos' : 'por ativo'}</span>
        <small>${returnLabel} | ${summary.confirmedPercent}% confirmados</small>
      </aside>
      <div class="calendar-metrics" aria-label="Indicadores de ${esc(calendarMonthName(monthKey))}">
        ${renderCalendarMetric('Periodo', calendarMonthName(monthKey), `${summary.paymentDays} dias com pagamentos`)}
        ${renderCalendarMetric('Eventos', String(summary.eventCount), `${summary.assetCount} ativos`)}
        ${renderCalendarMetric('Valor por unidade conhecido', money(summary.totalAmountPerUnitKnown), 'soma informacional, nao comparativa')}
        ${renderCalendarMetric('Retorno medio', pct(summary.averageEventYieldPercent), 'retorno deste evento sobre preco atual')}
        ${renderCalendarMetric('Simulacao', money(summary.totalEstimatedIncome), `${money(simulation.capital)} ${simulation.mode === 'distributed' ? 'distribuidos' : 'em cada ativo'}`)}
        ${renderCalendarMetric('Confianca', `${summary.confirmedPercent}%`, `${summary.estimatedPercent}% estimados/projetados`)}
      </div>
    </section>`;
  }

  function renderCapitalSimulator(simulation){
    const capitals = [1000,5000,10000,25000,50000];
    return `<section class="capital-simulator panel reveal" aria-label="Capital de referencia">
      <div>
        <span class="eyebrow">Capital de referencia</span>
        <h2>Comparar impacto com ${money(simulation.capital)}</h2>
        <p class="muted">Este controle apoia a mesa operacional. O CTA principal continua sendo capturar o evento, nao simular.</p>
      </div>
      <div class="quick-capitals" role="group" aria-label="Valores rapidos">
        ${capitals.map(value => `<button class="pill calendar-capital ${simulation.capital === value ? 'active' : ''}" type="button" data-capital="${value}">${money(value)}</button>`).join('')}
      </div>
      <div class="calendar-controls">
        <label>Valor personalizado<input id="calendarCapital" type="number" min="0" step="100" value="${simulation.capital}"></label>
        <label>Modo<select id="calendarMode"><option value="perAsset" ${simulation.mode === 'perAsset' ? 'selected' : ''}>Capital por ativo</option><option value="distributed" ${simulation.mode === 'distributed' ? 'selected' : ''}>Capital distribuido</option></select></label>
      </div>
    </section>`;
  }

  function renderCalendarToolbar(state, filtered, allEvents){
    const confirmedCount = allEvents.filter(event => event.eventStatus === 'confirmed').length;
    const highYield = allEvents.filter(event => Number(event.eventYieldPercent || 0) >= .8).length;
    const fiiCount = allEvents.filter(event => event.assetType === 'FII').length;
    const stockCount = allEvents.filter(event => event.assetType === 'Acao').length;
    const next30 = allEvents.filter(event => (daysUntil(event.paymentDate) ?? 999) <= 30).length;
    return `<section class="calendar-toolbar operational-toolbar reveal" aria-label="Filtros operacionais">
      <div class="calendar-search">
        <input id="calendarSearch" type="search" placeholder="Pesquise ativo, empresa ou evento" value="${esc(state.query)}" aria-label="Buscar no calendario">
        <button class="btn secondary" type="button" id="calendarClear">Limpar</button>
      </div>
      <div class="quick-filters" role="group" aria-label="Filtros rapidos">
        <button class="pill calendar-status-filter ${state.status === '' ? 'active' : ''}" type="button" data-status="">Todos ${allEvents.length}</button>
        <button class="pill calendar-type-filter ${state.assetType === 'FII' ? 'active' : ''}" type="button" data-type="FII">FIIs ${fiiCount}</button>
        <button class="pill calendar-type-filter ${state.assetType === 'Acao' ? 'active' : ''}" type="button" data-type="Acao">Acoes ${stockCount}</button>
        <button class="pill calendar-status-filter ${state.status === 'confirmed' ? 'active' : ''}" type="button" data-status="confirmed">Confirmados ${confirmedCount}</button>
        <button class="pill calendar-window-filter ${state.windowDays === 30 ? 'active' : ''}" type="button" data-window="30">Proximos 30 dias ${next30}</button>
        <button class="pill calendar-yield-filter ${state.minYield === .8 ? 'active' : ''}" type="button" data-yield=".8">DY &gt; 0,8% ${highYield}</button>
        <a class="pill" href="/watchlist/">Minha watchlist</a>
        <a class="pill" href="/carteiras/">Minha carteira</a>
      </div>
      <p class="muted" aria-live="polite">${filtered.length} eventos na mesa. O Opportunity Score mede qualidade operacional do evento, nao recomendacao de compra.</p>
    </section>`;
  }

  function renderCalendarViewTabs(state){
    return `<section class="calendar-view-strip reveal" aria-label="Visualizacoes secundarias">
      <div><span class="eyebrow">Organizar no tempo</span><h2>Calendario, agenda e linha do tempo</h2><p class="muted">Depois da priorizacao, use as visualizacoes para entender distribuicao temporal.</p></div>
      <div class="calendar-view-tabs" role="tablist" aria-label="Modo de visualizacao">
        ${['mes','agenda','linha'].map(view => `<button type="button" class="pill calendar-view ${state.view === view ? 'active' : ''}" data-view="${view}">${view === 'mes' ? 'Calendario mensal' : view === 'agenda' ? 'Agenda' : 'Linha do tempo'}</button>`).join('')}
      </div>
    </section>`;
  }

  function renderOpportunityScore(event){
    return `<span class="opportunity-score score-${event.opportunityScore >= 82 ? 'high' : event.opportunityScore >= 64 ? 'good' : event.opportunityScore >= 45 ? 'watch' : 'low'}"><b>OS ${event.opportunityScore}</b><small>${esc(event.attractiveness)}</small></span>`;
  }

  function renderOperationalTable(rows, state = {}){
    const sorted = [...rows].sort((a,b) => b.opportunityScore - a.opportunityScore);
    const selectedId = state.compareEventId || sorted[0]?.eventId || '';
    return `<section class="operations-table-section reveal">
      <div class="operations-head">
        <div><span class="eyebrow">Eventos primeiro</span><h2>Mesa operacional de proventos</h2><p>Responda rapido: o que esta pagando, quando preciso comprar, quanto paga e se o evento merece entrar no seu radar.</p></div>
        <div class="operations-count"><b>${sorted.length}</b><span>eventos priorizados</span></div>
      </div>
      <div class="table-wrap operations-table"><table>
        <thead><tr><th>Ativo</th><th>Datas</th><th>Evento</th><th>Yield</th><th>Qualidade operacional</th><th>Acao</th></tr></thead>
        <tbody>${sorted.map(event => `<tr class="operations-row ${event.eventId === selectedId ? 'selected' : ''}" data-compare-event-id="${esc(event.eventId)}">
          <td><a class="asset-link" href="/ativos/${esc(event.ticker)}/">${esc(event.ticker)}</a><br><span class="muted">${esc(event.assetName)}</span></td>
          <td><span class="cell-kv"><b>COM</b>${fullDate(event.recordDate || event.exDate)}</span><span class="cell-kv"><b>EX</b>${fullDate(event.exDate)}</span><span class="cell-kv"><b>PGTO</b>${fullDate(event.paymentDate)} <small>${humanDistance(event.paymentDate)}</small></span></td>
          <td><b>${esc(event.eventType)}</b><br><span class="muted">${money(event.amountPerUnit)} por unidade</span></td>
          <td><span class="cell-kv"><b>Evento</b>${event.eventYieldPercent === null ? '-' : pct(event.eventYieldPercent)}</span><span class="cell-kv"><b>Equiv.</b>${event.equivalentYieldPercent === null ? '-' : pct(event.equivalentYieldPercent)}</span></td>
          <td><div class="quality-stack">${calendarStatusChip(event.eventStatus)}${renderOpportunityScore(event)}<span class="muted">${esc(event.regularity)}</span></div></td>
          <td><div class="row-actions"><button class="btn secondary compare-event" type="button" data-event-id="${esc(event.eventId)}">Comparar</button><button class="btn primary capture-event" type="button" data-event-id="${esc(event.eventId)}">Capturar</button></div></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <p class="muted">DY equivalente anualiza apenas a frequencia operacional informada. Nao e promessa de retorno, recomendacao ou comparacao completa entre ativos.</p>
    </section>`;
  }

  function renderDayCell(day, selectedDay){
    const label = `${fullDate(day.day)}, ${day.eventCount} eventos, ${pct(day.averageYield)} medio neste evento, ${day.statusCounts.confirmed || 0} confirmados e ${day.statusCounts.provisioned || 0} provisionados.`;
    return `<button class="calendar-cell income-${day.intensity} ${day.day === selectedDay ? 'selected' : ''}" type="button" data-day="${esc(day.day)}" aria-label="${esc(label)}">
      <span class="calendar-day-number">${Number(day.day.slice(-2))}</span>
      <span class="calendar-day-events">${day.eventCount ? `${day.eventCount} eventos` : 'sem evento'}</span>
      <strong>${day.estimatedIncomeTotal ? money(day.estimatedIncomeTotal) : '-'}</strong>
      <span class="status-dots" aria-hidden="true">
        <i class="confirmed" style="--n:${day.statusCounts.confirmed || 0}"></i>
        <i class="provisioned" style="--n:${day.statusCounts.provisioned || 0}"></i>
        <i class="estimated" style="--n:${(day.statusCounts.estimated || 0) + (day.statusCounts.projected || 0)}"></i>
      </span>
    </button>`;
  }

  function renderMonthGrid(month, selectedDay){
    return `<section class="calendar-main-grid reveal">
      <div class="calendar-weekdays" aria-hidden="true">${['Dom','Seg','Ter','Qua','Qui','Sex','Sab'].map(day => `<span>${day}</span>`).join('')}</div>
      <div class="income-calendar-grid">${month.days.map(day => renderDayCell(day, selectedDay)).join('')}</div>
      <div class="calendar-legend" aria-label="Legenda de intensidade"><span><i class="low"></i>Baixa</span><span><i class="medium"></i>Moderada</span><span><i class="high"></i>Alta</span><span><i class="exceptional"></i>Excepcional</span></div>
    </section>`;
  }

  function renderAdvancedEvent(event){
    const eventYield = event.eventYieldPercent === null ? 'sem preco' : `${pct(event.eventYieldPercent)} sobre preco atual`;
    return `<article class="income-event-card">
      <div class="event-top">
        <div><div class="ticker">${esc(event.ticker)}</div><div class="event-kind">${esc(event.assetName)} - ${esc(event.eventType)}</div></div>
        ${calendarStatusChip(event.eventStatus)}
      </div>
      <div class="income-event-priority">
        <strong>${money(event.estimatedIncome)}</strong>
        <span>${eventYield}</span>
        <small>${fullDate(event.paymentDate)}</small>
      </div>
      <div class="event-capture-row">${renderOpportunityScore(event)}<button class="btn primary capture-event" type="button" data-event-id="${esc(event.eventId)}">Capturar evento</button></div>
      <div class="event-facts">
        <div><span>Valor por unidade</span><b>${money(event.amountPerUnit)}</b></div>
        <div><span>Preco atual</span><b>${event.currentPrice ? money(event.currentPrice) : '-'}</b></div>
        <div><span>Capital simulado</span><b>${money(event.simulatedCapital)}</b></div>
        <div><span>Quantidade estimada</span><b>${event.estimatedQuantity || '-'}</b></div>
        <div><span>Data-com</span><b>${fullDate(event.recordDate || event.exDate)}</b></div>
        <div><span>Data ex</span><b>${fullDate(event.exDate)}</b></div>
        <div><span>Pagamento</span><b>${fullDate(event.paymentDate)}</b></div>
        <div><span>Recorrencia</span><b>${esc(event.regularity)}</b></div>
      </div>
      <details>
        <summary>Formula, fonte e limitacoes</summary>
        <p class="muted">Retorno deste evento = valor por unidade dividido pelo preco atual. Preco usado: ${event.currentPrice ? money(event.currentPrice) : 'indisponivel'}. Moeda: BRL. Valores brutos estimados, sem impostos, custos ou variacao de preco. Fonte: ${esc(event.sourceName)}.</p>
      </details>
    </article>`;
  }

  function renderDayPanel(day){
    return `<aside class="day-panel reveal" aria-live="polite">
      <div class="day-panel-head">
        <span class="eyebrow">Dia selecionado</span>
        <h2>${fullDate(day.day)}</h2>
        <p>${day.eventCount} pagamentos | ${money(day.estimatedIncomeTotal)} simulados | ${pct(day.averageYield)} medio neste evento</p>
      </div>
      <div class="day-event-list">${day.events.length ? day.events.map(renderAdvancedEvent).join('') : '<div class="empty">Nenhum evento publicado para este dia.</div>'}</div>
    </aside>`;
  }

  function renderEventComparison(rows){
    return `<section class="section-band reveal">
      <div class="section-intro"><div><span class="eyebrow">Comparacao</span><h2>Comparar eventos do periodo</h2><p>Ordene mentalmente por retorno do evento, valor estimado ou confianca, sem transformar isso em recomendacao de melhor investimento.</p></div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Ativo</th><th>Valor por unidade</th><th>Preco</th><th>Retorno do evento</th><th>Capital simulado geraria</th><th>Status</th></tr></thead>
        <tbody>${rows.map(event => `<tr><td><b>${esc(event.ticker)}</b><br><span class="muted">${esc(event.eventType)}</span></td><td>${money(event.amountPerUnit)}</td><td>${event.currentPrice ? money(event.currentPrice) : '-'}</td><td>${event.eventYieldPercent === null ? '-' : `${pct(event.eventYieldPercent)} neste evento`}</td><td>${money(event.estimatedIncome)}</td><td>${D.statusLabel(event.eventStatus)}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>`;
  }

  function renderIncomeAccumulation(rows, state = {}){
    return renderInvestmentComparisonSection(rows, state);
  }

  function comparisonBenchmarks(){
    try{
      const stored = JSON.parse(localStorage.getItem('gds_comparison_benchmarks_v1') || 'null');
      if(Array.isArray(stored) && stored.length) return stored;
    }catch{}
    return [
      { id:'cdb100', label:'CDB 100% CDI', annualYieldPercent:10.65, taxable:true, taxation:'IR regressivo', liquidity:'Conforme produto', predictability:'Alta', source:'Benchmark configuravel local', updatedAt:'2026-07-13', active:true },
      { id:'tesouro-selic', label:'Tesouro Selic', annualYieldPercent:10.40, taxable:true, taxation:'IR regressivo', liquidity:'Alta', predictability:'Alta', source:'Benchmark configuravel local', updatedAt:'2026-07-13', active:true },
      { id:'poupanca', label:'Poupanca', annualYieldPercent:6.17, taxable:false, taxation:'Isenta para PF', liquidity:'Alta', predictability:'Alta', source:'Benchmark configuravel local', updatedAt:'2026-07-13', active:true }
    ];
  }

  function renderComparisonBar(row){
    return `<article class="comparison-bar ${row.kind === 'event' ? 'highlight' : ''}">
      <div class="comparison-label"><b>${esc(row.label)}</b><span>${row.days} dias | ${row.taxation}</span></div>
      <div class="comparison-track"><i style="--w:${row.barPercent}%"></i></div>
      <div class="comparison-value"><b>${money(row.income)}</b><span>${pct(row.returnPercent)}</span></div>
    </article>`;
  }

  function renderInvestmentComparisonSection(rows, state){
    const sorted = [...rows].sort((a,b) => b.opportunityScore - a.opportunityScore);
    const selected = sorted.find(event => event.eventId === state.compareEventId) || sorted[0];
    if(!selected) return `<section class="investment-comparison reveal"><div class="empty">Selecione um evento para comparar sua eficiencia de renda.</div></section>`;
    const comparison = C.buildInvestmentComparison(selected, comparisonBenchmarks(), { capital:state.capital || selected.simulatedCapital || 10000, taxMode:state.comparisonTaxMode || 'gross' });
    const reference = comparison.reference;
    const additional = comparison.additionalIncome;
    const saved = comparison.capitalSaved;
    const positive = additional > 0;
    const title = comparison.eventIsLeader ? 'O mesmo capital. Resultados diferentes.' : 'Compare antes de decidir.';
    const thesis = comparison.eventIsLeader
      ? `Com ${money(comparison.capital)} aplicados durante ${comparison.days} dias, ${selected.ticker} apresenta renda estimada superior as alternativas de referencia abaixo.`
      : `Neste periodo, ${selected.ticker} nao supera todas as alternativas. Compare retorno, risco, liquidez e recorrencia antes de decidir.`;
    return `<section class="investment-comparison reveal" aria-label="Comparativos e convencimento financeiro">
      <div class="comparison-hero">
        <div>
          <span class="eyebrow">Comparativo financeiro</span>
          <h2>${esc(title)}</h2>
          <p>${esc(thesis)}</p>
          <div class="comparison-context"><span>${esc(selected.ticker)}</span><span>${money(comparison.capital)}</span><span>${comparison.days} dias</span><span>${comparison.taxMode === 'net' ? 'valores liquidos estimados' : 'valores brutos'}</span></div>
          <label class="comparison-picker">Comparar ativo da mesa
            <select id="comparisonEventSelect" aria-label="Escolher evento para comparativo">${sorted.map(event => `<option value="${esc(event.eventId)}" ${event.eventId === selected.eventId ? 'selected' : ''}>${esc(event.ticker)} - ${fullDate(event.paymentDate)} - ${event.eventYieldPercent === null ? 'sem DY' : pct(event.eventYieldPercent)}</option>`).join('')}</select>
          </label>
        </div>
        <div class="comparison-actions">
          <button class="pill comparison-tax ${comparison.taxMode === 'gross' ? 'active' : ''}" type="button" data-tax-mode="gross">Valores brutos</button>
          <button class="pill comparison-tax ${comparison.taxMode === 'net' ? 'active' : ''}" type="button" data-tax-mode="net">Liquidos estimados</button>
        </div>
      </div>
      <div class="comparison-layout">
        <div class="benchmark-chart" role="img" aria-label="Comparacao de renda estimada com escala iniciando em zero">${comparison.rows.map(renderComparisonBar).join('')}</div>
        <aside class="income-difference-card">
          <span class="eyebrow">Neste cenario</span>
          <h3>${positive ? 'Renda adicional estimada' : 'Diferenca estimada'}</h3>
          <b>${money(Math.abs(additional))}</b>
          <p>${reference ? `${positive ? 'a mais que' : 'a menos que'} ${reference.label}, no mesmo capital e prazo.` : 'Selecione uma referencia para comparar.'}</p>
          <small>Simulacao baseada em escala iniciando em zero, sem garantia de repeticao.</small>
        </aside>
      </div>
      <div class="comparison-metrics">
        <article><span>Eficiencia de renda</span><b>${pct(comparison.eventRow?.returnPercent || 0)}</b><small>renda estimada / capital utilizado</small></article>
        <article><span>Capital para mesma renda</span><b>${reference?.requiredCapital ? money(reference.requiredCapital) : '-'}</b><small>${reference ? `em ${reference.label}` : 'referencia indisponivel'}</small></article>
        <article><span>Capital potencialmente economizado</span><b>${saved > 0 ? money(saved) : '-'}</b><small>aproximadamente, contra a referencia</small></article>
      </div>
      <div class="risk-matrix">
        <table><thead><tr><th>Alternativa</th><th>Retorno no periodo</th><th>Previsibilidade</th><th>Liquidez</th><th>Tributacao</th></tr></thead><tbody>
          ${comparison.rows.map(row => `<tr><td>${esc(row.label)}</td><td>${pct(row.returnPercent)}</td><td>${esc(row.predictability)}</td><td>${esc(row.liquidity)}</td><td>${esc(row.taxation)}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="comparison-disclaimer">
        <b>Por que os resultados diferem?</b>
        <p>Renda variavel pode oscilar, pagamentos podem mudar ou ser cancelados e o preco do ativo pode subir ou cair. Renda fixa possui regras proprias de prazo, liquidez e tributacao. Eventos extraordinarios nao devem ser tratados como recorrentes.</p>
        <small>Benchmarks: ${comparison.rows.filter(row => row.kind === 'benchmark').map(row => `${row.label} atualizado em ${row.updatedAt || 'data nao informada'} (${row.source})`).join(' | ')}</small>
      </div>
      <div class="comparison-cta">
        <div><b>${comparison.eventIsLeader ? 'Este evento se destaca no periodo analisado.' : 'Este evento merece analise, mas nao vence todos os benchmarks.'}</b><span>Salve a comparacao e acompanhe as proximas datas sem repetir o processo.</span></div>
        <button class="btn primary capture-event" type="button" data-event-id="${esc(selected.eventId)}">Capturar evento</button>
        <a class="btn secondary" href="/sistema/">Ver analise completa</a>
      </div>
    </section>`;
  }

  function renderAgendaView(rows){
    const groups = [
      ['Hoje', rows.filter(event => daysUntil(event.paymentDate) === 0)],
      ['Proximos 7 dias', rows.filter(event => (daysUntil(event.paymentDate) ?? 999) > 0 && (daysUntil(event.paymentDate) ?? 999) <= 7)],
      ['Proximos 30 dias', rows.filter(event => (daysUntil(event.paymentDate) ?? 999) > 7 && (daysUntil(event.paymentDate) ?? 999) <= 30)],
      ['Mais adiante', rows.filter(event => (daysUntil(event.paymentDate) ?? 999) > 30)]
    ];
    return `<section class="calendar-agenda reveal">${groups.map(([label, group]) => `<article class="agenda-group"><h3>${label}</h3><p class="muted">${group.length} eventos | ${money(group.reduce((sum, event) => sum + event.estimatedIncome, 0))} estimados</p><div class="calendar-list">${group.map(event => `<div class="event-row"><strong>${humanDistance(event.paymentDate)}</strong><div><b>${esc(event.ticker)} - ${esc(event.eventType)}</b><br><span class="muted">${event.eventYieldPercent === null ? 'sem percentual' : `${pct(event.eventYieldPercent)} neste evento`}</span></div><div>${calendarStatusChip(event.eventStatus)}<br><span class="event-value">${money(event.estimatedIncome)}</span></div></div>`).join('') || '<div class="empty">Sem eventos neste grupo.</div>'}</div></article>`).join('')}</section>`;
  }

  function renderTimelineView(rows){
    const maxDays = Math.max(...rows.map(event => Math.max(1, daysUntil(event.paymentDate) || 1)), 1);
    return `<section class="calendar-timeline reveal">${rows.map(event => {
      const distance = Math.max(0, daysUntil(event.paymentDate) || 0);
      const width = Math.max(12, 100 - (distance / maxDays) * 88);
      return `<article class="timeline-event" style="--w:${width}%"><div><b>${esc(event.ticker)}</b><span>${humanDistance(event.paymentDate)}</span></div><strong>${money(event.estimatedIncome)}</strong><small>${event.eventYieldPercent === null ? 'sem preco' : `${pct(event.eventYieldPercent)} neste evento`}</small></article>`;
    }).join('')}</section>`;
  }

  function renderCaptureModal(state, rows){
    if(!state.captureEventId) return '';
    const event = rows.find(item => item.eventId === state.captureEventId);
    if(!event) return '';
    const logged = Boolean(global.DividendAccountClient?.token?.());
    return `<div class="capture-overlay" role="dialog" aria-modal="true" aria-labelledby="captureTitle">
      <div class="capture-modal">
        <button class="capture-close" type="button" aria-label="Fechar captura">x</button>
        <span class="eyebrow">${logged ? 'Evento capturado' : 'Capture este evento gratuitamente'}</span>
        <h2 id="captureTitle">${esc(event.ticker)} entrou no seu radar operacional.</h2>
        <p class="lead">${logged ? 'Este evento pode ir para sua watchlist, alertas, agenda pessoal e Radar da Carteira.' : 'Crie uma conta gratuita para receber alertas da Data COM, pagamento, historico, evolucao e futura integracao com sua carteira.'}</p>
        <div class="capture-benefits">
          <span>Alerta da Data COM</span>
          <span>Alerta do pagamento</span>
          <span>Historico do evento</span>
          <span>Evolucao e recorrencia</span>
        </div>
        <div class="capture-summary">
          <div><span>DY Evento</span><b>${event.eventYieldPercent === null ? '-' : pct(event.eventYieldPercent)}</b></div>
          <div><span>Pagamento</span><b>${fullDate(event.paymentDate)}</b></div>
          <div><span>Score</span><b>OS ${event.opportunityScore}</b></div>
        </div>
        <div class="actions">
          ${logged ? '<a class="btn primary" href="/watchlist/">Ver na watchlist</a><a class="btn secondary" href="/carteiras/">Aplicar na minha carteira</a>' : '<a class="btn primary" href="/cadastro/">Criar conta gratuita</a><a class="btn secondary" href="/entrar/">Ja tenho conta</a>'}
          <a class="btn ghost" href="/sistema/">Ativar Dividend System</a>
        </div>
        <p class="muted">O premium aparece quando voce quiser saber quanto este evento representa na sua carteira real, com posicao elegivel, preco medio, metas e conciliacao.</p>
      </div>
    </div>`;
  }

  function renderIncomeCalendarState(state){
    const simulation = { capital:state.capital, mode:state.mode, month:state.month };
    const { viewEvents, summary, month } = calendarViews(simulation);
    let filtered = C.applyFilters(viewEvents, { query:state.query, status:state.status, minYield:state.minYield });
    if(state.assetType) filtered = filtered.filter(event => event.assetType === state.assetType);
    if(state.windowDays) filtered = filtered.filter(event => (daysUntil(event.paymentDate) ?? 999) <= state.windowDays);
    const filteredMonth = C.buildMonth(filtered, { capital:state.capital, month:month.month });
    const selectedDay = state.selectedDay || filteredMonth.days.find(day => day.eventCount)?.day || filteredMonth.days[0]?.day;
    const selected = C.summarizeDay(selectedDay, filtered, state.capital);
    const narrative = C.narrative(filtered, C.summarizePeriod(filtered, simulation));
    const content = state.view === 'agenda' ? renderAgendaView(filtered) : state.view === 'linha' ? renderTimelineView(filtered) : `<div class="calendar-workspace">${renderMonthGrid(filteredMonth, selectedDay)}${renderDayPanel(selected)}</div>`;
    return `${renderCalendarHeader(summary, simulation, month.month)}
      ${renderCalendarToolbar(state, filtered, viewEvents)}
      ${renderOperationalTable(filtered, state)}
      ${renderCaptureModal(state, viewEvents)}
      ${renderCapitalSimulator(simulation)}
      <section class="calendar-narrative reveal"><span class="eyebrow">Narrativa do periodo</span><p>${esc(narrative)}</p></section>
      ${renderCalendarViewTabs(state)}
      ${content}
      ${renderIncomeAccumulation(filtered, state)}
      <section class="personal-calendar panel reveal">
        <div><span class="eyebrow">Impacto pessoal</span><h2>Mercado, watchlist e carteira no mesmo calendario.</h2><p class="muted">A versao publica mostra mercado e simulacao. Ao entrar, a plataforma pode restringir a watchlist, aplicar posicoes reais, preco medio, metas mensais e conciliacao sem misturar valores recebidos com previstos.</p></div>
        <div class="portfolio-toggle" role="group" aria-label="Escopo pessoal"><a class="pill active" href="/calendario/">Mercado</a><a class="pill" href="/watchlist/">Minha watchlist</a><a class="pill" href="/carteiras/">Minha carteira</a></div>
        <div class="goal-preview"><b>Meta mensal</b><span>Defina uma meta na area privada para separar recebido, confirmado e estimado.</span><a class="btn secondary" href="/meu-painel/">Abrir painel pessoal</a></div>
      </section>`;
  }

  function renderCalendar(){
    return `<div id="incomeCalendar" data-page="income-calendar"></div>`;
  }

  function monthLabel(month){
    const [year, value] = String(month || '').split('-').map(Number);
    if(!year || !value) return month || 'sem data';
    return new Date(year, value - 1, 2).toLocaleDateString('pt-BR', { month:'short', year:'2-digit' }).replace('.', '');
  }

  function monthRange(startMonth, count = 12){
    const [year, month] = String(startMonth || '').split('-').map(Number);
    const base = new Date(year || 2026, (month || 7) - 1, 1);
    return Array.from({ length:count }, (_, index) => {
      const date = new Date(base.getFullYear(), base.getMonth() + index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}`;
    });
  }

  function incomeMapAnalytics(){
    const views = C.buildEventViews(events(), assets(), { capital:10000, mode:'perAsset' }).filter(event => event.paymentDate);
    const firstMonth = views.map(event => event.paymentDate.slice(0,7)).sort()[0] || '2026-07';
    const months = monthRange(firstMonth, 12);
    const classes = ['FII','Acao','Unit','BDR','Ativo'];
    const byMonth = new Map(months.map(month => [month, { month, events:[], total:0, confirmed:0, provisioned:0, estimated:0, topAsset:'-', topClass:'-', classTotals:{} }]));
    views.forEach(event => {
      const month = event.paymentDate.slice(0,7);
      if(!byMonth.has(month)) return;
      const bucket = byMonth.get(month);
      const value = Number(event.estimatedIncome || 0);
      bucket.events.push(event);
      bucket.total += value;
      if(event.eventStatus === 'confirmed') bucket.confirmed += value;
      else if(event.eventStatus === 'provisioned') bucket.provisioned += value;
      else bucket.estimated += value;
      const type = event.assetType || 'Ativo';
      bucket.classTotals[type] = (bucket.classTotals[type] || 0) + value;
    });
    const monthly = [...byMonth.values()].map(bucket => {
      const assetTotals = bucket.events.reduce((acc, event) => ({ ...acc, [event.ticker]:(acc[event.ticker] || 0) + Number(event.estimatedIncome || 0) }), {});
      const topAsset = Object.entries(assetTotals).sort((a,b) => b[1] - a[1])[0];
      const topClass = Object.entries(bucket.classTotals).sort((a,b) => b[1] - a[1])[0];
      const confirmedPercent = bucket.total ? Math.round(((bucket.confirmed + bucket.provisioned) / bucket.total) * 100) : 0;
      return { ...bucket, total:C.round(bucket.total, 2), confirmed:C.round(bucket.confirmed, 2), provisioned:C.round(bucket.provisioned, 2), estimated:C.round(bucket.estimated, 2), topAsset:topAsset?.[0] || '-', topClass:topClass?.[0] || '-', confirmedPercent };
    });
    const totals = monthly.reduce((acc, month) => ({ total:acc.total + month.total, confirmed:acc.confirmed + month.confirmed, provisioned:acc.provisioned + month.provisioned, events:acc.events + month.events.length }), { total:0, confirmed:0, provisioned:0, events:0 });
    const values = monthly.map(month => month.total);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const sortedValues = [...values].sort((a,b) => a - b);
    const median = sortedValues.length ? sortedValues[Math.floor(sortedValues.length / 2)] : 0;
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const deviation = average ? C.round(((max - min) / average) * 100, 2) : 0;
    const continuity = Math.max(0, Math.min(100, Math.round(100 - deviation / 2 - monthly.filter(month => !month.events.length).length * 8)));
    const classTotals = views.reduce((acc, event) => {
      const key = event.assetType || 'Ativo';
      acc[key] = acc[key] || { type:key, total:0, months:new Set(), events:0 };
      acc[key].total += Number(event.estimatedIncome || 0);
      acc[key].months.add(event.paymentDate.slice(0,7));
      acc[key].events += 1;
      return acc;
    }, {});
    const classesRows = Object.values(classTotals).map(row => ({ ...row, total:C.round(row.total, 2), monthsPaid:row.months.size, share:totals.total ? C.round((row.total / totals.total) * 100, 2) : 0 })).sort((a,b) => b.total - a.total);
    const assetRows = Object.values(views.reduce((acc, event) => {
      acc[event.ticker] = acc[event.ticker] || { ticker:event.ticker, total:0, months:new Set(), regularity:event.regularity, status:event.eventStatus };
      acc[event.ticker].total += Number(event.estimatedIncome || 0);
      acc[event.ticker].months.add(event.paymentDate.slice(0,7));
      return acc;
    }, {})).map(row => ({ ...row, total:C.round(row.total, 2), monthsPaid:row.months.size, share:totals.total ? C.round((row.total / totals.total) * 100, 2) : 0 })).sort((a,b) => b.total - a.total);
    const gaps = monthly.filter(month => month.total < average * .7).map(month => ({ ...month, diff:C.round(month.total - average, 2), opportunities:views.filter(event => event.paymentDate.slice(0,7) === month.month).sort((a,b) => b.opportunityScore - a.opportunityScore).slice(0,5) }));
    const strong = monthly.filter(month => month.total >= average * 1.25).length;
    const weak = monthly.filter(month => month.total < average * .7).length;
    const narrative = `O fluxo dos proximos 12 meses possui ${strong} meses fortes e ${weak} meses abaixo da media. ${classesRows[0]?.type || 'A classe principal'} sustenta a maior parcela da renda prevista. ${assetRows.slice(0,5).reduce((sum,row)=>sum+row.share,0).toFixed(1)}% do fluxo esta nos cinco maiores ativos.`;
    return { views, months:monthly, classes, totals, average:C.round(average,2), median:C.round(median,2), max:C.round(max,2), min:C.round(min,2), deviation, continuity, classesRows, assetRows, gaps, narrative };
  }

  function renderIncomeMap(){
    const data = incomeMapAnalytics();
    const maxMonth = Math.max(...data.months.map(month => month.total), 1);
    return `<section class="income-map-page">
      <section class="section-head"><div><span class="eyebrow">Mapa da renda</span><h1>Transforme o calendario em estrategia de fluxo.</h1><p>Visualize onde os pagamentos se concentram, quais periodos estao mais fortes e onde existem intervalos a preencher.</p></div></section>
      <section class="admin-kpis mini reveal">
        ${adminKpi('Proximos 12 meses', money(data.totals.total), 'mercado simulado com R$ 10.000 por ativo')}
        ${adminKpi('Confirmado/provisionado', money(data.totals.confirmed + data.totals.provisioned), `${data.totals.total ? Math.round(((data.totals.confirmed + data.totals.provisioned) / data.totals.total) * 100) : 0}% do fluxo`)}
        ${adminKpi('Eventos', String(data.totals.events), `${new Set(data.views.map(event => event.ticker)).size} ativos pagadores`)}
        ${adminKpi('Indice de continuidade', `${data.continuity}/100`, data.continuity >= 80 ? 'fluxo muito distribuido' : data.continuity >= 60 ? 'relativamente estavel' : data.continuity >= 40 ? 'concentracao moderada' : 'altamente concentrado')}
      </section>
      <section class="portfolio-toggle income-universe reveal" role="group" aria-label="Universo do mapa"><a class="pill active" href="/mapa-da-renda/">Mercado</a><a class="pill" href="/cadastro/">Minha watchlist</a><a class="pill" href="/carteiras/">Minha carteira</a></section>
      <section class="income-heatmap reveal" aria-label="Heatmap temporal por classe">
        <div class="income-heatmap-head"><b>Classe</b>${data.months.map(month => `<b>${esc(monthLabel(month.month))}</b>`).join('')}</div>
        ${data.classes.map(type => `<div class="income-heatmap-row"><b>${esc(type)}</b>${data.months.map(month => {
          const value = month.classTotals[type] || 0;
          const intensity = Math.max(4, (value / maxMonth) * 100);
          return `<article class="income-map-cell" style="--i:${intensity}%" title="${esc(monthLabel(month.month))}: ${money(value)}, ${month.events.length} eventos, ${month.confirmedPercent}% confirmado/provisionado, principal ativo ${esc(month.topAsset)}"><span>${money(value)}</span><small>${month.events.length} ev. | ${month.confirmedPercent}% conf.</small></article>`;
        }).join('')}</div>`).join('')}
      </section>
      <section class="income-map-grid reveal">
        <article class="panel"><span class="eyebrow">Continuidade da renda</span><h2>${data.continuity}/100</h2><div class="map-stat-grid"><span>Media ${money(data.average)}</span><span>Mediana ${money(data.median)}</span><span>Maior mes ${money(data.max)}</span><span>Menor mes ${money(data.min)}</span><span>Desvio ${data.deviation}%</span><span>${data.months.filter(month => !month.events.length).length} meses sem eventos</span></div><p class="muted">O indice mede regularidade temporal do fluxo, nao qualidade do investimento.</p></article>
        <article class="panel"><span class="eyebrow">Quem sustenta o fluxo?</span>${data.classesRows.map(row => `<div class="map-share"><b>${esc(row.type)}</b><span>${pct(row.share)} da renda prevista</span><small>pagamento em ${row.monthsPaid} dos proximos 12 meses</small></div>`).join('')}</article>
      </section>
      <section class="panel reveal"><span class="eyebrow">Dependencia do fluxo</span><h2>Os 5 maiores ativos representam ${data.assetRows.slice(0,5).reduce((sum,row)=>sum+row.share,0).toFixed(1)}% da renda prevista.</h2><div class="table-wrap"><table><thead><tr><th>Ativo</th><th>Participacao</th><th>Meses pagos</th><th>Recorrencia</th><th>Status</th></tr></thead><tbody>${data.assetRows.slice(0,8).map(row => `<tr><td><b>${esc(row.ticker)}</b></td><td>${pct(row.share)}</td><td>${row.monthsPaid}</td><td>${esc(row.regularity)}</td><td>${calendarStatusChip(row.status)}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="income-map-grid reveal">
        <article class="panel"><span class="eyebrow">Onde existem lacunas?</span><h2>${data.gaps.length || 0} meses abaixo de 70% da media.</h2>${data.gaps.slice(0,4).map(gap => `<div class="gap-row"><b>${esc(monthLabel(gap.month))}</b><span>${money(gap.total)} (${money(gap.diff)} vs media)</span><a href="/calendario/">Explorar eventos</a></div>`).join('') || '<p class="muted">Nenhuma lacuna relevante no periodo analisado.</p>'}</article>
        <article class="panel"><span class="eyebrow">Eventos que podem preencher o fluxo</span>${data.gaps[0]?.opportunities?.map(event => `<div class="event-capture-row"><div><b>${esc(event.ticker)}</b><br><span class="muted">${fullDate(event.paymentDate)} | ${event.eventYieldPercent === null ? 'sem DY' : pct(event.eventYieldPercent)}</span></div><button class="btn secondary capture-event" data-event-id="${esc(event.eventId)}">Capturar</button></div>`).join('') || '<p class="muted">Sem eventos adicionais para o mes mais fraco.</p>'}</article>
      </section>
      <section class="calendar-narrative reveal"><span class="eyebrow">Sintese automatica</span><p>${esc(data.narrative)}</p></section>
      <section class="personal-calendar panel reveal"><div><span class="eyebrow">Conversao contextual</span><h2>Transforme este mapa de mercado em um mapa da sua renda.</h2><p class="muted">Ao entrar, a plataforma pode trocar o universo para watchlist ou carteira real sem usar numeros ficticios.</p></div><div class="portfolio-toggle"><a class="pill active" href="/cadastro/">Criar conta gratuita</a><a class="pill" href="/calendario/">Explorar calendario</a></div></section>
    </section>`;
  }

  function renderAbout(){
    return `<section class="panel reveal"><span class="eyebrow">Sobre</span><h1>Um radar financeiro temporal.</h1><p class="lead">Encontre os proximos pagamentos do mercado, acompanhe os ativos que importam e transforme datas dispersas em uma agenda financeira clara.</p></section>`;
  }

  function renderMethodology(){
    const nav = [
      ['principios','Principios'],['pipeline','Fluxo dos dados'],['fontes','Fontes'],['estados','Estados'],['confianca','Confianca'],['formulas','Formulas'],['exemplo','Exemplo'],['atualizacao','Atualizacao'],['divergencias','Divergencias'],['limitacoes','Limitacoes'],['auditoria','Auditoria']
    ];
    return `<section class="methodology-page">
      <section class="section-head"><div><span class="eyebrow">Metodologia</span><h1>Como os dados sao construidos</h1><p>Nenhum numero deve aparecer sem origem, formula, data e grau de confianca.</p></div></section>
      <div class="methodology-layout">
        <nav class="methodology-nav" aria-label="Indice da metodologia">${nav.map(([id,label]) => `<a href="#${id}">${label}</a>`).join('')}</nav>
        <div class="methodology-content">
          <section id="principios" class="panel reveal"><span class="eyebrow">Principios</span><div class="grid cols-4">${[
            ['Clareza','Projecoes nunca sao apresentadas como fatos.'],
            ['Rastreabilidade','Todo evento deve possuir fonte e data de atualizacao.'],
            ['Separacao','Status financeiro, confianca e publicacao sao conceitos diferentes.'],
            ['Conservadorismo','Quando os dados nao permitem concluir, a plataforma mostra a incerteza.']
          ].map(([title,text]) => `<article class="method-card"><b>${title}</b><p>${text}</p></article>`).join('')}</div></section>
          <section id="pipeline" class="panel reveal"><span class="eyebrow">Fluxo dos dados</span><h2>Da fonte ao calendario publico</h2><div class="pipeline">${['B3 / Brapi / documento oficial','Ingestao','Normalizacao','Deduplicacao','Validacao','Revisao','Publicacao','Calendario, radar e mapa'].map(step => `<button type="button">${step}<small>verificacoes, bloqueios e historico</small></button>`).join('')}</div></section>
          <section id="fontes" class="panel reveal"><span class="eyebrow">Fontes</span><h2>Hierarquia de autoridade</h2><div class="source-grid">${[
            ['B3 e documentos oficiais','alta','eventos oficiais e arquivos de mercado','conforme publicacao'],
            ['Emissores','alta','comunicados e fatos relevantes','conforme emissor'],
            ['Brapi e integracoes verificadas','media/alta','cotas, eventos e enriquecimento','conforme integracao'],
            ['Entrada administrativa revisada','curada','ajustes e conciliacao','com auditoria'],
            ['Estimativas derivadas','baixa/media','projecoes baseadas em historico','sempre sinalizada']
          ].map(row => `<article><b>${row[0]}</b><span>Confianca: ${row[1]}</span><small>Uso: ${row[2]} | Atualizacao: ${row[3]}</small></article>`).join('')}</div></section>
          <section id="estados" class="panel reveal"><span class="eyebrow">Estados dos eventos</span><div class="table-wrap"><table><thead><tr><th>Estado</th><th>Significado</th><th>Pode mudar?</th><th>Exibicao</th></tr></thead><tbody>${[
            ['Anunciado','Evento comunicado','Sim','Publico com aviso'],['Provisionado','Dados principais disponiveis','Sim','Publico'],['Confirmado','Fonte ou revisao validada','Pode sofrer correcao','Publico'],['Estimado','Derivado de historico','Sim','Diferenciado'],['Projetado','Cenario analitico','Sim','Nunca tratado como fato'],['Pago','Evento concluido','Correcoes possiveis','Historico'],['Cancelado','Evento removido','Conforme fonte','Excluido dos totais']
          ].map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
          <section id="confianca" class="panel reveal"><span class="eyebrow">Confianca</span><h2>Status financeiro nao e grau de confianca.</h2><div class="grid cols-3">${['Oficial','Verificado','Fonte externa confiavel','Derivado','Estimado','Desconhecido'].map(level => `<article class="method-card"><b>${level}</b><p>Indica origem, revisao e robustez do dado. Pode bloquear publicacao quando insuficiente.</p></article>`).join('')}</div></section>
          <section id="formulas" class="panel reveal"><span class="eyebrow">Formulas</span><div class="formula-library">${[
            ['Retorno do evento','valor por unidade / preco de referencia * 100','Nao inclui variacao futura do preco.'],
            ['DY equivalente','retorno do evento * frequencia teorica','Nao representa garantia de repeticao.'],
            ['Yield on Cost','valor por unidade / preco medio do usuario * 100','Depende da posicao pessoal.'],
            ['Valor previsto','quantidade elegivel * valor por unidade','Pode mudar se a posicao mudar.'],
            ['Indice de Continuidade','100 - desvio entre meses / 2 - penalidade por meses vazios','Mede regularidade temporal, nao qualidade.'],
            ['Confianca do periodo','(confirmados + provisionados) / total previsto','Valores estimados ficam separados.']
          ].map(([name,formula,limit]) => `<article><b>${name}</b><code>${formula}</code><small>${limit}</small></article>`).join('')}</div></section>
          <section id="exemplo" class="panel reveal"><span class="eyebrow">Exemplo editavel</span><h2>Retorno do evento</h2><div class="method-example"><label>Preco<input id="methodPrice" type="number" step="0.01" value="10.20"></label><label>Valor do evento<input id="methodAmount" type="number" step="0.01" value="0.10"></label><label>Quantidade<input id="methodQty" type="number" step="1" value="1000"></label><article><span>Retorno</span><b id="methodReturn">0,98%</b><small id="methodIncome">R$ 100,00 previstos</small></article></div></section>
          <section id="atualizacao" class="panel reveal"><span class="eyebrow">Atualizacao</span><p>Eventos sao atualizados apos ingestao, validacao, revisao e publicacao. Cotacoes dependem da disponibilidade da integracao. A plataforma nao afirma tempo real quando a fonte nao oferece tempo real.</p></section>
          <section id="divergencias" class="panel reveal"><span class="eyebrow">Divergencias</span><ol class="admin-flow"><li>Divergencia detectada entre fontes.</li><li>Evento bloqueado para publicacao automatica.</li><li>Fonte de maior precedencia identificada.</li><li>Revisao administrativa registrada.</li><li>Nova versao publicada com historico.</li></ol></section>
          <section id="limitacoes" class="panel reveal"><span class="eyebrow">Limitacoes</span><div class="grid cols-2">${['Eventos podem ser alterados ou cancelados.','Precos mudam e afetam retornos calculados.','Estimativas podem nao se confirmar.','Tributacao varia conforme produto e investidor.','Historico nao garante recorrencia.','Eventos extraordinarios nao devem ser anualizados automaticamente.'].map(item => `<article class="method-card"><p>${item}</p></article>`).join('')}</div></section>
          <section id="auditoria" class="panel reveal"><span class="eyebrow">Auditoria</span><div class="audit-timeline">${['12/07 - Evento importado','13/07 - Brapi confirmou valor','13/07 - Administrador revisou','14/07 - Evento publicado','16/07 - Data atualizada'].map(item => `<span>${item}</span>`).join('')}</div></section>
          <section class="personal-calendar panel reveal"><div><span class="eyebrow">Proximo passo</span><h2>Agora voce sabe como os numeros sao construidos.</h2></div><div class="portfolio-toggle"><a class="pill active" href="/calendario/">Explorar calendario</a><a class="pill" href="/mapa-da-renda/">Ver Mapa da Renda</a><a class="pill" href="/carteiras/">Criar minha carteira</a></div></section>
        </div>
      </div>
    </section>`;
  }

  function renderAdmin(view){
    const sections = [
      ['admin','/admin/','Visao geral'],
      ['adminProventos','/admin/proventos/','Central de Proventos'],
      ['adminImports','/admin/importacoes/','Importacoes B3'],
      ['adminBrapi','/admin/brapi/','Sincronizacao Brapi'],
      ['adminEvents','/admin/eventos/','Eventos'],
      ['adminReview','/admin/revisao/','Revisao'],
      ['adminPublishing','/admin/publicacao/','Publicacao'],
      ['adminAssets','/admin/ativos/','Ativos'],
      ['adminSources','/admin/fontes/','Fontes'],
      ['adminQuality','/admin/qualidade/','Qualidade'],
      ['adminJobs','/admin/jobs/','Jobs'],
      ['adminAudit','/admin/auditoria/','Auditoria'],
      ['adminFinops','/admin/finops/','FinOps'],
      ['adminSecurity','/admin/seguranca/','Seguranca'],
      ['adminSettings','/admin/configuracoes/','Configuracoes']
    ];
    const active = sections.find(item => item[0] === view) || sections[0];
    return `<section class="admin-data-center">
      <nav class="admin-rail" aria-label="Admin">
        <strong>Admin</strong>
        ${sections.map(([key, href, label]) => `<a class="${key === view ? 'active' : ''}" href="${href}">${label}</a>`).join('')}
        <a href="/admin.html">FinOps legado</a>
      </nav>
      <div class="admin-stage">
        <section class="admin-title">
          <div><span class="eyebrow">Central Administrativa de Proventos</span><h1>${esc(active[2])}</h1><p>Importar e sincronizar nao publica. A versao publica nasce apenas depois de validacao, revisao e lote de publicacao.</p></div>
          <div class="admin-actions"><a class="btn primary" href="/admin/importacoes/nova/">Importar arquivo B3</a><a class="btn secondary" href="/admin/brapi/">Sincronizar Brapi</a><a class="btn secondary" href="/calendario/">Calendario publico</a></div>
        </section>
        ${renderAdminView(view)}
      </div>
    </section>`;
  }

  function renderAdminView(view){
    if(view === 'adminImports' || view === 'adminNewImport') return renderAdminImports(view);
    if(view === 'adminBrapi') return renderAdminBrapi();
    if(view === 'adminEvents') return renderAdminEvents();
    if(view === 'adminReview') return renderAdminReview();
    if(view === 'adminPublishing') return renderAdminPublishing();
    if(view === 'adminQuality') return renderAdminQuality();
    if(view === 'adminJobs') return renderAdminJobs();
    if(view === 'adminAudit') return renderAdminAudit();
    if(view === 'adminSecurity') return renderAdminSecurity();
    if(view === 'adminSettings') return renderAdminSettings();
    if(view === 'adminFinops') return renderAdminFinops();
    if(view === 'adminAssets' || view === 'adminSources' || view === 'adminProventos') return renderAdminCatalog(view);
    return renderAdminOverview();
  }

  function adminKpi(label, value, note, tone = ''){
    return `<article class="admin-kpi ${tone}"><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(note)}</small></article>`;
  }

  function renderAdminOverview(){
    return `<section class="admin-kpis">
      ${adminKpi('Eventos publicos ativos','42','published + visible','ok')}
      ${adminKpi('Aguardando revisao','12','pendentes editoriais','warn')}
      ${adminKpi('Divergencias B3 x Brapi','3','bloqueiam publicacao','bad')}
      ${adminKpi('Ultima Brapi','13/07 02:10','token somente backend','ok')}
      ${adminKpi('Saude do calendario','91/100','cache publicado valido','ok')}
    </section>
    <section class="grid cols-2">
      <article class="admin-panel"><h2>Alertas operacionais</h2><div class="admin-alert warn">12 eventos aguardam revisao.</div><div class="admin-alert bad">3 eventos apresentam divergencia entre B3 e Brapi.</div><div class="admin-alert warn">8 FIIs nao foram atualizados nas ultimas 24 horas.</div><div class="admin-alert bad">1 lote de publicacao falhou e manteve a ultima versao valida.</div></article>
      <article class="admin-panel"><h2>Fluxo canonico</h2><ol class="admin-flow"><li>Arquivos B3 ou Brapi entram como fonte bruta.</li><li>Parser normaliza para evento canonico.</li><li>Dedupe e conciliacao criam pendencias.</li><li>Editor aprova ou rejeita.</li><li>Publicacao atomica alimenta calendario, radar e paginas de ativos.</li></ol></article>
    </section>`;
  }

  function renderAdminImports(view){
    return `<section class="admin-panel">
      <h2>${view === 'adminNewImport' ? 'Nova importacao B3' : 'Importacoes B3'}</h2>
      <div class="admin-alert warn">No preview local, a publicacao grava os eventos em cache publico do navegador. Em producao, o mesmo fluxo deve passar pelo Worker, D1, revisao e lote atomico.</div>
      <div class="import-drop">
        <strong>Arraste ou selecione CSV, XLS, XLSX, TXT, ZIP ou JSON</strong>
        <span>Validacao real ocorre no backend: MIME, hash, assinatura, limite de tamanho, linhas, planilhas e bloqueio de macros/zip bomb.</span>
        <input id="adminImportFile" type="file" accept=".csv,.txt,.json,.xlsx,.xls" multiple>
      </div>
      <div class="admin-form-row"><label>Perfil presumido<select id="adminImportProfile"><option>B3 - Radar de Proventos</option><option>B3 - Eventos Corporativos</option><option>B3 - Dividendos e JCP</option></select></label><label>Data de referencia<input id="adminImportReferenceDate" type="date"></label><label>Observacao<input id="adminImportNote" placeholder="Opcional"></label></div>
      <div id="adminImportStatus" class="notice">Selecione o arquivo B3 para detectar cabecalhos, normalizar eventos e liberar publicacao.</div>
      <div class="table-wrap"><table><thead><tr><th>Arquivo</th><th>Perfil detectado</th><th>Confianca</th><th>Linhas</th><th>Validos</th><th>Status</th></tr></thead><tbody id="adminImportRows"><tr><td colspan="6" class="muted">Nenhum arquivo carregado.</td></tr></tbody></table></div>
      <div class="admin-actions" style="margin:12px 0"><button class="btn primary" id="adminPublishImport" type="button" disabled>Publicar eventos validados</button><a class="btn secondary" href="/calendario/">Abrir calendario publico</a><button class="btn secondary" id="adminClearPublishedEvents" type="button">Limpar cache publicado local</button></div>
      <div class="table-wrap"><table><thead><tr><th>Ativo</th><th>Tipo</th><th>Data COM</th><th>Data EX</th><th>Pagamento</th><th>Valor</th><th>Status</th></tr></thead><tbody id="adminImportPreview"><tr><td colspan="7" class="muted">O preview dos eventos aparece aqui antes da publicacao.</td></tr></tbody></table></div>
      <h3>Mapeamento salvo</h3>
      <div class="table-wrap"><table><thead><tr><th>Coluna original</th><th>Campo canonico</th><th>Transformacao</th></tr></thead><tbody><tr><td>Codigo Negociacao</td><td>ticker</td><td>normalizar ticker</td></tr><tr><td>Data Base</td><td>recordDate</td><td>dd/MM/yyyy</td></tr><tr><td>Valor Bruto</td><td>amountPerUnit</td><td>decimal brasileiro</td></tr></tbody></table></div>
    </section>`;
  }

  function renderAdminBrapi(){
    return `<section class="grid cols-2">
      <article class="admin-panel"><h2>Sincronizacao Brapi FIIs</h2><p class="muted">Endpoint e token ficam exclusivamente no Worker. O navegador enxerga apenas estado mascarado.</p><div class="secret-state"><b>Token configurado</b><span>Final: ****7H2K</span><small>Atualizado em 13/07/2026</small></div><button class="btn primary">Sincronizar FIIs agora</button></article>
      <article class="admin-panel"><h2>Plano de lotes</h2><div class="admin-kpis mini">${adminKpi('FIIs ativos','312','fonte canonica')}${adminKpi('Lotes','16','20 ativos/lote')}${adminKpi('Janela','24 meses','historico + futuros')}${adminKpi('Chamadas','16','estimadas')}</div><div class="admin-alert warn">Job sync_brapi_fii_events e idempotente, com cursor, retry e checkpoint.</div></article>
    </section>`;
  }

  function renderAdminEvents(){
    const rows = C.buildEventViews(events(), assets(), { capital:10000, mode:'perAsset' });
    return `<section class="admin-panel"><h2>Eventos editoriais</h2><div class="quick-filters"><span class="pill active">Todos</span><span class="pill">B3</span><span class="pill">Brapi</span><span class="pill">Divergentes</span><span class="pill">Bloqueados</span><span class="pill">Proximos 30 dias</span></div><div class="table-wrap"><table><thead><tr><th>Ativo</th><th>Tipo</th><th>Data-com</th><th>Data ex</th><th>Pagamento</th><th>Valor</th><th>Fonte</th><th>Confianca</th><th>Validacao</th><th>Revisao</th><th>Publicacao</th><th>Acao</th></tr></thead><tbody>${rows.map(row => `<tr><td><b>${esc(row.ticker)}</b></td><td>${esc(row.eventType)}</td><td>${fullDate(row.recordDate || row.exDate)}</td><td>${fullDate(row.exDate)}</td><td>${fullDate(row.paymentDate)}</td><td>${money(row.amountPerUnit)}</td><td>${esc(row.sourceName)}</td><td>${esc(row.confidence)}</td><td><span class="badge ok">valid</span></td><td><span class="badge mid">pending</span></td><td><span class="badge mid">draft</span></td><td><button class="btn secondary">Revisar</button></td></tr>`).join('')}</tbody></table></div></section>`;
  }

  function renderAdminReview(){
    return `<section class="admin-panel"><h2>Revisao e divergencias</h2><div class="comparison-grid"><div><h3>B3</h3><table><tr><td>Ativo</td><td>MXRF11</td></tr><tr><td>Pagamento</td><td>14/08/2026</td></tr><tr><td>Valor</td><td>R$ 0,10</td></tr><tr><td>Confianca</td><td>Oficial</td></tr></table></div><div><h3>Brapi</h3><table><tr><td>Ativo</td><td>MXRF11</td></tr><tr><td>Pagamento</td><td>15/08/2026</td></tr><tr><td>Valor</td><td>R$ 0,10</td></tr><tr><td>Confianca</td><td>Externa confiavel</td></tr></table></div></div><div class="admin-actions"><button class="btn primary">Usar dados B3</button><button class="btn secondary">Usar Brapi</button><button class="btn secondary">Mesclar campos</button><button class="btn secondary">Manter pendente</button></div><textarea placeholder="Justificativa obrigatoria quando contrariar fonte de maior precedencia"></textarea></section>`;
  }

  function renderAdminPublishing(){
    return `<section class="admin-panel"><h2>Publicacao atomica</h2><section class="admin-kpis mini">${adminKpi('Prontos','42','aprovados')}${adminKpi('Bloqueados','5','publication_blocker','bad')}${adminKpi('Divergencias','3','pendentes','warn')}${adminKpi('Atualizacoes','8','ja publicados')}</section><p>Esta publicacao atualizara 42 eventos, 28 ativos, 16 dias do calendario, 12 oportunidades e 28 paginas de ativos.</p><button class="btn primary">Publicar lote aprovado</button><button class="btn secondary">Preparar lote</button><button class="btn secondary">Rollback logico</button></section>`;
  }

  function renderAdminQuality(){
    return `<section class="admin-panel"><h2>Qualidade dos dados</h2><div class="table-wrap"><table><thead><tr><th>Regra</th><th>Classificacao</th><th>Acao</th></tr></thead><tbody><tr><td>Evento sem ativo</td><td>publication_blocker</td><td>bloquear publicacao</td></tr><tr><td>Pagamento anterior a Data COM</td><td>publication_blocker</td><td>revisao obrigatoria</td></tr><tr><td>Preco desatualizado no yield</td><td>warning</td><td>recalcular score</td></tr><tr><td>Estimado marcado como oficial</td><td>error</td><td>corrigir confianca</td></tr></tbody></table></div></section>`;
  }

  function renderAdminJobs(){
    return `<section class="admin-panel"><h2>Jobs</h2><div class="table-wrap"><table><thead><tr><th>Job</th><th>Idempotente</th><th>Lotes</th><th>Retry</th><th>Status</th></tr></thead><tbody>${['process_b3_import','sync_brapi_fii_events','sync_brapi_quotes','reconcile_event_sources','validate_financial_events','prepare_publication_batch','publish_events','recalculate_opportunity_metrics','invalidate_public_cache','notify_captured_event_changes','mark_stale_events'].map(job => `<tr><td>${job}</td><td>sim</td><td>cursor</td><td>backoff</td><td><span class="badge mid">configurado</span></td></tr>`).join('')}</tbody></table></div></section>`;
  }

  function renderAdminAudit(){
    return `<section class="admin-panel"><h2>Auditoria</h2><p class="muted">Upload, processamento, sincronizacao, revisao, aprovacao, publicacao, rollback e configuracao devem registrar operador, entidade, antes/depois, origem, arquivo, job e request ID.</p><div class="admin-alert ok">Audit logs no backend permanecem a fonte de verdade.</div></section>`;
  }

  function renderAdminSecurity(){
    return `<section class="admin-panel"><h2>Seguranca administrativa</h2><div class="table-wrap"><table><thead><tr><th>Controle</th><th>Status</th><th>Regra</th></tr></thead><tbody><tr><td>Token Brapi</td><td><span class="badge ok">backend secret</span></td><td>Nunca localStorage, IndexedDB ou bundle publico.</td></tr><tr><td>Upload</td><td><span class="badge mid">pipeline seguro</span></td><td>MIME, hash, limite, path traversal, zip bomb, macros e formulas.</td></tr><tr><td>Publicacao</td><td><span class="badge ok">RBAC</span></td><td>publication:publish ou owner/admin.</td></tr><tr><td>CORS</td><td><span class="badge ok">restrito</span></td><td>origens autorizadas.</td></tr></tbody></table></div></section>`;
  }

  function renderAdminSettings(){
    return `<section class="admin-panel"><h2>Configuracoes</h2><p class="muted">A interface exibe apenas estado mascarado de secrets. Atualizacao real deve ocorrer por Worker secrets ou endpoint backend protegido que nunca retorne o valor completo.</p><div class="secret-state"><b>Brapi</b><span>Token configurado no backend</span><small>Final mascarado exibido somente pelo Worker.</small></div></section>`;
  }

  function renderAdminFinops(){
    return `<section class="admin-panel"><h2>FinOps preservado</h2><p>O FinOps segue disponivel no console legado, mas nao e mais o protagonista da administracao de proventos.</p><a class="btn secondary" href="/admin.html">Abrir FinOps legado</a></section>`;
  }

  function renderAdminCatalog(view){
    const label = { adminAssets:'Ativos canonicos', adminSources:'Fontes e precedencia', adminProventos:'Central de Proventos' }[view] || 'Catalogo';
    return `<section class="admin-panel"><h2>${label}</h2><p class="muted">B3 oficial verificavel prevalece como fonte orientadora; Brapi complementa FIIs e cotacoes; divergencias nao publicam automaticamente.</p><div class="admin-flow"><li>Arquivo oficial B3 verificavel</li><li>Documento oficial do administrador/emissor</li><li>Brapi validada</li><li>Entrada manual</li><li>Estimativa derivada</li></div></section>`;
  }

  function renderSystem(){
    return `<section class="panel reveal"><span class="eyebrow">Legado preservado</span><h1>O Dividend System privado continua funcionando.</h1><p class="lead">A rota publica /sistema e uma ponte limpa para o motor atual, sem mover dados locais nem alterar o dashboard.</p><div class="actions"><a class="btn primary" href="/dashboard.html#sistema">Abrir sistema completo</a><a class="btn secondary" href="/">Voltar ao portal</a></div></section>`;
  }

  function setActiveNav(){
    document.querySelectorAll('.main-nav a').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href !== '/' && location.pathname.startsWith(href));
    });
  }

  function adminHeaderKey(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }

  function adminDetectDelimiter(text){
    const sample = String(text || '').split(/\r?\n/).slice(0, 5).join('\n');
    return [';',',','\t','|'].map(delimiter => ({ delimiter, count:sample.split(delimiter).length - 1 })).sort((a,b) => b.count - a.count)[0]?.delimiter || ';';
  }

  function adminSplitLine(line, delimiter){
    const cells = [];
    let current = '';
    let quoted = false;
    for(const ch of String(line || '')){
      if(ch === '"') quoted = !quoted;
      else if(ch === delimiter && !quoted){ cells.push(current.trim().replace(/^"|"$/g,'')); current = ''; }
      else current += ch;
    }
    cells.push(current.trim().replace(/^"|"$/g,''));
    return cells;
  }

  function adminParseRows(text){
    const delimiter = adminDetectDelimiter(text);
    const matrix = String(text || '').replace(/^\uFEFF/,'').split(/\r?\n/).filter(line => line.trim()).map(line => adminSplitLine(line, delimiter));
    return { delimiter, ...adminRowsFromMatrix(matrix) };
  }

  function adminFindColumn(headers, aliases){
    const normalized = headers.map(header => ({ header, key:adminHeaderKey(header) }));
    const wanted = aliases.map(adminHeaderKey);
    return normalized.find(item => wanted.includes(item.key))?.header || '';
  }

  const adminB3Aliases = {
    ticker: ['ticker','codigo negociacao','codigo do ativo','ativo','cod negociacao','codigo','codigo b3','produto'],
    assetName: ['nome do ativo','nome','emissor','empresa','nome empresa','produto'],
    assetType: ['tipo do ativo','classe','mercado','tipo mercado','tipo'],
    eventType: ['tipo provento','tipo de provento','evento','tipo evento','tipo de evento','provento','especificacao'],
    recordDate: ['data com','data-com','data base','data de corte','ultimo dia com','data posicao'],
    exDate: ['data ex','data-ex','ex data','data ex provento'],
    paymentDate: ['data pagamento','data de pagamento','pagamento','data credito','data do pagamento'],
    amountPerUnit: ['valor bruto','valor bruto por unidade','valor por unidade','valor unitario','valor','valor provento','vlr provento','preco unitario bruto','preco bruto','preco'],
    status: ['status','situacao','situacao do credito','estado'],
    currency: ['moeda','currency']
  };

  function adminImportMapping(headers){
    return {
      ticker: adminFindColumn(headers, adminB3Aliases.ticker),
      assetName: adminFindColumn(headers, adminB3Aliases.assetName),
      assetType: adminFindColumn(headers, adminB3Aliases.assetType),
      eventType: adminFindColumn(headers, adminB3Aliases.eventType),
      recordDate: adminFindColumn(headers, adminB3Aliases.recordDate),
      exDate: adminFindColumn(headers, adminB3Aliases.exDate),
      paymentDate: adminFindColumn(headers, adminB3Aliases.paymentDate),
      amountPerUnit: adminFindColumn(headers, adminB3Aliases.amountPerUnit),
      status: adminFindColumn(headers, adminB3Aliases.status),
      currency: adminFindColumn(headers, adminB3Aliases.currency)
    };
  }

  function adminHeaderScore(cells){
    const headers = (cells || []).map(cell => String(cell || '').trim()).filter(Boolean);
    const mapping = adminImportMapping(headers);
    const required = ['ticker','assetType','eventType','recordDate','paymentDate','amountPerUnit'];
    return required.filter(key => mapping[key]).length * 10 + Object.values(mapping).filter(Boolean).length;
  }

  function adminRowsFromMatrix(matrix){
    const clean = (matrix || []).filter(row => row.some(cell => String(cell || '').trim()));
    const scored = clean.slice(0, 30).map((row, index) => ({ row, index, score:adminHeaderScore(row) })).sort((a,b) => b.score - a.score);
    const headerIndex = scored[0]?.score ? scored[0].index : 0;
    const headers = (clean[headerIndex] || []).map((header, index) => String(header || `Coluna ${index + 1}`).trim() || `Coluna ${index + 1}`);
    const rows = clean.slice(headerIndex + 1).map(line => headers.reduce((acc, header, index) => ({ ...acc, [header]: line[index] || '' }), {}));
    return { headers, rows, headerIndex };
  }

  function adminColumnIndex(ref){
    const letters = String(ref || '').replace(/[^A-Z]/gi,'').toUpperCase();
    return letters.split('').reduce((sum, ch) => sum * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
  }

  async function adminInflateZipPart(bytes, method){
    if(method === 0) return bytes;
    if(method !== 8) throw new Error('XLSX usa metodo de compressao nao suportado neste preview.');
    if(!('DecompressionStream' in window)) throw new Error('Seu navegador nao suporta leitura local de XLSX neste preview. Exporte como CSV ou use Chrome/Edge atualizado.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function adminReadXlsxEntries(buffer){
    const data = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const textDecoder = new TextDecoder();
    let eocd = -1;
    for(let i = data.length - 22; i >= Math.max(0, data.length - 66000); i--){
      if(view.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
    }
    if(eocd < 0) throw new Error('Arquivo XLSX invalido: diretorio ZIP nao encontrado.');
    const total = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    const entries = {};
    for(let i = 0; i < total; i++){
      if(view.getUint32(offset, true) !== 0x02014b50) break;
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = textDecoder.decode(data.slice(offset + 46, offset + 46 + nameLength));
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      entries[name] = { method, bytes:data.slice(start, start + compressedSize) };
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  async function adminEntryText(entries, path){
    const entry = entries[path];
    if(!entry) return '';
    return new TextDecoder().decode(await adminInflateZipPart(entry.bytes, entry.method));
  }

  function adminParseSharedStrings(xml){
    if(!xml) return [];
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return [...doc.querySelectorAll('si')].map(si => [...si.querySelectorAll('t')].map(t => t.textContent || '').join(''));
  }

  async function adminParseXlsx(file){
    const entries = await adminReadXlsxEntries(await file.arrayBuffer());
    const sheetPath = Object.keys(entries).find(path => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path));
    if(!sheetPath) throw new Error('Nenhuma planilha encontrada no XLSX.');
    const shared = adminParseSharedStrings(await adminEntryText(entries, 'xl/sharedStrings.xml'));
    const xml = await adminEntryText(entries, sheetPath);
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const matrix = [...doc.querySelectorAll('sheetData row')].map(row => {
      const cells = [];
      [...row.querySelectorAll('c')].forEach(cell => {
        const index = adminColumnIndex(cell.getAttribute('r'));
        const type = cell.getAttribute('t');
        const valueNode = cell.querySelector('v');
        const inlineNode = cell.querySelector('is t');
        let value = valueNode?.textContent || inlineNode?.textContent || '';
        if(type === 's') value = shared[Number(value)] || '';
        cells[index >= 0 ? index : cells.length] = value;
      });
      return cells;
    });
    return { delimiter:'xlsx', ...adminRowsFromMatrix(matrix) };
  }

  function adminParseDate(value){
    const raw = String(value || '').trim();
    if(!raw) return '';
    const br = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if(br){
      const year = br[3].length === 2 ? `20${br[3]}` : br[3];
      return `${year}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`;
    }
    return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0,10) : '';
  }

  function adminParseDecimal(value){
    const number = Number(String(value || '').replace(/[R$\s.]/g,'').replace(',','.'));
    return Number.isFinite(number) ? number : 0;
  }

  function adminExtractTicker(value){
    const raw = String(value || '').toUpperCase();
    const match = raw.match(/\b[A-Z]{1,5}\d{1,2}[A-Z]?\b/);
    return match ? D.normalizeTicker(match[0]) : D.normalizeTicker(raw);
  }

  function adminExtractAssetName(value, ticker){
    const raw = String(value || '').replace(/\s+/g,' ').trim();
    if(!raw) return ticker || '';
    const withoutTicker = raw.replace(new RegExp(`^${String(ticker || '').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*-\\s*`, 'i'), '').trim();
    return withoutTicker || raw || ticker || '';
  }

  function adminEventType(value){
    const key = adminHeaderKey(value);
    if(key.includes('jcp') || key.includes('juros')) return 'jcp';
    if(key.includes('rendimento')) return 'fii_income';
    if(key.includes('amort')) return 'amortization';
    if(key.includes('dividend')) return 'dividend';
    return key || 'other';
  }

  function adminFinancialStatus(value){
    const key = adminHeaderKey(value);
    if(key.includes('cancel')) return 'cancelled';
    if(key.includes('pago') || key.includes('credit')) return 'paid';
    if(key.includes('confirm')) return 'confirmed';
    if(key.includes('provision')) return 'provisioned';
    if(key.includes('estim')) return 'estimated';
    return 'confirmed';
  }

  function adminNormalizeImport(parsed, filename){
    const mapping = adminImportMapping(parsed.headers);
    const recognized = Object.values(mapping).filter(Boolean).length;
    let confidence = Math.round((recognized / Math.max(1, Object.keys(mapping).length)) * 100);
    const events = parsed.rows.map((row, index) => {
      const product = row[mapping.ticker] || row[mapping.assetName];
      const ticker = adminExtractTicker(product);
      const eventType = adminEventType(row[mapping.eventType]);
      const amount = adminParseDecimal(row[mapping.amountPerUnit]);
      const paymentDate = adminParseDate(row[mapping.paymentDate]);
      const exDate = adminParseDate(row[mapping.exDate]);
      const recordDate = adminParseDate(row[mapping.recordDate] || row[mapping.exDate]);
      const id = `b3_${ticker.toLowerCase()}_${paymentDate || recordDate}_${eventType}_${index + 1}`.replace(/[^a-z0-9_]/gi,'_');
      const valid = Boolean(ticker && eventType && (paymentDate || recordDate) && amount > 0);
      return {
        id,
        publicId:id,
        publicationStatus:'published',
        publicVisibility:true,
        capturable:true,
        ticker,
        assetName: adminExtractAssetName(row[mapping.assetName] || product, ticker),
        assetType: row[mapping.assetType] || 'Ativo',
        eventType,
        kind:eventType,
        financialStatus:adminFinancialStatus(row[mapping.status]),
        status:adminFinancialStatus(row[mapping.status]),
        recordDate,
        exDate,
        paymentDate,
        amountPerUnit:amount,
        amount,
        currency: row[mapping.currency] || 'BRL',
        sourceName:'B3 - Radar de Proventos',
        source:'B3 - Radar de Proventos',
        confidence:'official',
        dataQualityScore: valid ? 94 : 40,
        importedFrom: filename,
        publishedAt: new Date().toISOString(),
        validationStatus: valid ? 'valid' : 'blocked'
      };
    });
    if(events.some(event => event.validationStatus === 'valid')) confidence = Math.max(confidence, 82);
    return { mapping, confidence, events, validEvents:events.filter(event => event.validationStatus === 'valid') };
  }

  function adminPaintImportPreview(result, filename){
    const rows = document.getElementById('adminImportRows');
    const preview = document.getElementById('adminImportPreview');
    const publish = document.getElementById('adminPublishImport');
    const status = document.getElementById('adminImportStatus');
    if(rows) rows.innerHTML = `<tr><td>${esc(filename)}</td><td>B3 - Radar de Proventos</td><td>${result.confidence}%</td><td>${result.events.length}</td><td>${result.validEvents.length}</td><td><span class="badge ${result.validEvents.length ? 'ok' : 'bad'}">${result.validEvents.length ? 'validado' : 'bloqueado'}</span></td></tr>`;
    if(preview) preview.innerHTML = result.events.slice(0, 30).map(event => `<tr><td><b>${esc(event.ticker)}</b></td><td>${esc(event.eventType)}</td><td>${fullDate(event.recordDate)}</td><td>${fullDate(event.exDate)}</td><td>${fullDate(event.paymentDate)}</td><td>${money(event.amountPerUnit)}</td><td><span class="badge ${event.validationStatus === 'valid' ? 'ok' : 'bad'}">${event.validationStatus}</span></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Nenhum evento reconhecido.</td></tr>';
    if(publish){
      publish.disabled = !result.validEvents.length;
      publish.dataset.events = JSON.stringify(result.validEvents);
    }
    if(status) status.textContent = result.validEvents.length ? `${result.validEvents.length} eventos validados. Clique em "Publicar eventos validados" para atualizar a pagina publica.` : 'Nenhum evento valido para publicacao. Verifique cabecalhos e valores.';
  }

  function adminSavePublishedEvents(newEvents){
    const existing = JSON.parse(localStorage.getItem('gds_published_events_v1') || '[]');
    const byId = new Map(existing.map(event => [event.id || event.publicId, event]));
    newEvents.forEach(event => byId.set(event.id || event.publicId, event));
    const published = [...byId.values()];
    localStorage.setItem('gds_published_events_v1', JSON.stringify(published));
    const currentAssets = D.assetRepository.all();
    const assetMap = new Map(currentAssets.map(asset => [asset.ticker, asset]));
    newEvents.forEach(event => {
      if(!assetMap.has(event.ticker)){
        assetMap.set(event.ticker, D.normalizeAsset({ ticker:event.ticker, name:event.assetName || event.ticker, type:event.assetType || 'Ativo', source:'published-cache' }));
      }
    });
    D.assetRepository.save([...assetMap.values()]);
    return published.length;
  }

  function wireAdminImports(){
    const input = document.getElementById('adminImportFile');
    if(!input) return;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if(!file) return;
      const status = document.getElementById('adminImportStatus');
      if(status) status.textContent = `Lendo ${file.name}...`;
      try{
        const lower = file.name.toLowerCase();
        let parsed;
        if(lower.endsWith('.xlsx')){
          parsed = await adminParseXlsx(file);
        }else if(lower.endsWith('.xls')){
          throw new Error('Arquivo .xls binario antigo ainda nao e lido no preview local. Salve/exporte como .xlsx ou .csv.');
        }else{
          const text = await file.text();
          if(lower.endsWith('.json')){
            const rows = JSON.parse(text);
            const list = Array.isArray(rows) ? rows : Array.isArray(rows.events) ? rows.events : [];
            const headers = [...new Set(list.flatMap(row => Object.keys(row || {})))];
            parsed = { delimiter:'json', ...adminRowsFromMatrix([headers, ...list.map(row => headers.map(header => row[header]))]) };
          }else{
            parsed = adminParseRows(text);
          }
        }
        adminPaintImportPreview(adminNormalizeImport(parsed, file.name), file.name);
      }catch(err){
        if(status) status.textContent = err.message || String(err);
        const rows = document.getElementById('adminImportRows');
        if(rows) rows.innerHTML = `<tr><td>${esc(file.name)}</td><td>-</td><td>0%</td><td>0</td><td>0</td><td><span class="badge bad">erro</span></td></tr>`;
      }
    });
    document.getElementById('adminPublishImport')?.addEventListener('click', ev => {
      const button = ev.currentTarget;
      const eventsToPublish = JSON.parse(button.dataset.events || '[]');
      const total = adminSavePublishedEvents(eventsToPublish);
      const status = document.getElementById('adminImportStatus');
      if(status) status.innerHTML = `${eventsToPublish.length} eventos publicados no cache publico local. Total publicado: ${total}. <a href="/calendario/">Abrir calendario publico atualizado</a>.`;
      button.disabled = true;
      button.textContent = 'Eventos publicados';
    });
    document.getElementById('adminClearPublishedEvents')?.addEventListener('click', () => {
      localStorage.removeItem('gds_published_events_v1');
      document.getElementById('adminImportStatus').textContent = 'Cache publicado local limpo. O portal voltara aos dados demo ate nova publicacao.';
    });
  }

  function wireIncomeCalendar(){
    const root = document.getElementById('incomeCalendar');
    if(!root) return;
    const initial = C.buildEventViews(events(), assets(), { capital:10000, mode:'perAsset' });
    const state = {
      capital:10000,
      mode:'perAsset',
      view: innerWidth < 720 ? 'agenda' : 'mes',
      query:'',
      status:'',
      assetType:'',
      windowDays:null,
      minYield:null,
      month:C.buildMonth(initial, { capital:10000 }).month,
      selectedDay:'',
      captureEventId:'',
      compareEventId:'',
      comparisonTaxMode:'gross'
    };
    const paint = () => {
      const activeId = document.activeElement?.id || '';
      const selection = activeId ? { start:document.activeElement.selectionStart, end:document.activeElement.selectionEnd } : null;
      root.innerHTML = renderIncomeCalendarState(state);
      bind();
      if(activeId){
        const next = document.getElementById(activeId);
        next?.focus();
        if(selection && typeof next?.setSelectionRange === 'function') next.setSelectionRange(selection.start, selection.end);
      }
      wireReveals();
    };
    const bind = () => {
      document.getElementById('calendarCapital')?.addEventListener('input', ev => {
        state.capital = Math.max(0, Number(ev.target.value || 0));
        paint();
      });
      document.getElementById('calendarMode')?.addEventListener('change', ev => {
        state.mode = ev.target.value;
        paint();
      });
      document.getElementById('calendarSearch')?.addEventListener('input', ev => {
        state.query = ev.target.value;
        paint();
      });
      document.getElementById('calendarClear')?.addEventListener('click', () => {
        state.query = '';
        state.status = '';
        state.assetType = '';
        state.windowDays = null;
        state.minYield = null;
        paint();
      });
      root.querySelectorAll('.calendar-capital').forEach(button => button.addEventListener('click', () => {
        state.capital = Number(button.dataset.capital || 10000);
        paint();
      }));
      root.querySelectorAll('.calendar-status-filter').forEach(button => button.addEventListener('click', () => {
        state.status = button.dataset.status || '';
        paint();
      }));
      root.querySelectorAll('.calendar-type-filter').forEach(button => button.addEventListener('click', () => {
        state.assetType = state.assetType === button.dataset.type ? '' : button.dataset.type || '';
        paint();
      }));
      root.querySelectorAll('.calendar-window-filter').forEach(button => button.addEventListener('click', () => {
        const value = Number(button.dataset.window || 0);
        state.windowDays = state.windowDays === value ? null : value;
        paint();
      }));
      root.querySelectorAll('.calendar-yield-filter').forEach(button => button.addEventListener('click', () => {
        state.minYield = state.minYield === Number(button.dataset.yield) ? null : Number(button.dataset.yield);
        paint();
      }));
      root.querySelectorAll('.calendar-view').forEach(button => button.addEventListener('click', () => {
        state.view = button.dataset.view || 'mes';
        paint();
      }));
      root.querySelectorAll('.calendar-cell').forEach(button => button.addEventListener('click', () => {
        state.selectedDay = button.dataset.day || '';
        state.view = 'mes';
        paint();
      }));
      root.querySelectorAll('.capture-event').forEach(button => button.addEventListener('click', () => {
        state.captureEventId = button.dataset.eventId || '';
        paint();
      }));
      root.querySelectorAll('.compare-event').forEach(button => button.addEventListener('click', () => {
        state.compareEventId = button.dataset.eventId || '';
        paint();
        document.querySelector('.investment-comparison')?.scrollIntoView({ behavior:'smooth', block:'start' });
      }));
      root.querySelectorAll('.operations-row').forEach(row => row.addEventListener('click', ev => {
        if(ev.target.closest('a,button')) return;
        state.compareEventId = row.dataset.compareEventId || '';
        paint();
      }));
      document.getElementById('comparisonEventSelect')?.addEventListener('change', ev => {
        state.compareEventId = ev.target.value || '';
        paint();
      });
      root.querySelectorAll('.comparison-tax').forEach(button => button.addEventListener('click', () => {
        state.comparisonTaxMode = button.dataset.taxMode || 'gross';
        paint();
      }));
      root.querySelector('.capture-close')?.addEventListener('click', () => {
        state.captureEventId = '';
        paint();
      });
      root.querySelector('.capture-overlay')?.addEventListener('click', ev => {
        if(ev.target.classList.contains('capture-overlay')){
          state.captureEventId = '';
          paint();
        }
      });
    };
    paint();
  }

  function wireHeroSearch(){
    const input = document.getElementById('heroSearch');
    const results = document.getElementById('heroSearchResults');
    if(!input || !results) return;
    const paint = () => {
      const q = input.value.trim().toLowerCase();
      const rows = assets().filter(asset => `${asset.ticker} ${asset.name} ${asset.type}`.toLowerCase().includes(q || ' ')).slice(0, 5);
      results.innerHTML = rows.map(asset => `<a class="search-chip" href="/ativos/${esc(asset.ticker)}/">${esc(asset.ticker)} <span>${esc(asset.name)}</span></a>`).join('') || '<span class="search-chip">Nenhum ativo encontrado</span>';
    };
    input.addEventListener('input', paint);
    document.getElementById('heroSearchForm')?.addEventListener('submit', ev => {
      ev.preventDefault();
      const first = results.querySelector('a');
      if(first) location.href = first.href;
    });
  }

  function wireSimulator(){
    const form = document.getElementById('simForm');
    if(!form) return;
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const ticker = document.getElementById('simTicker').value;
      const qty = Number(document.getElementById('simQty').value || 0);
      const event = events().find(item => item.ticker === ticker) || events()[0];
      const result = document.getElementById('simResult');
      if(result && event){
        result.innerHTML = `<div><span class="eyebrow">Resultado aproximado</span><b>${money(event.amount * qty)}</b><p class="muted">${event.ticker}, ${humanDistance(event.paymentDate)}, ${D.statusLabel(event.status)}.</p></div>`;
      }
    });
  }

  function wireMethodologyExample(){
    const price = document.getElementById('methodPrice');
    const amount = document.getElementById('methodAmount');
    const qty = document.getElementById('methodQty');
    const outReturn = document.getElementById('methodReturn');
    const outIncome = document.getElementById('methodIncome');
    if(!price || !amount || !qty || !outReturn || !outIncome) return;
    const paint = () => {
      const result = C.eventYieldPercent(Number(amount.value), Number(price.value));
      outReturn.textContent = result === null ? '-' : pct(result);
      outIncome.textContent = `${money(Number(amount.value || 0) * Number(qty.value || 0))} previstos`;
    };
    [price, amount, qty].forEach(input => input.addEventListener('input', paint));
    paint();
  }

  function wireReveals(){
    const items = [...document.querySelectorAll('.reveal')];
    if(!items.length) return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){
      items.forEach(item => item.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold:.16 });
    items.forEach(item => io.observe(item));
  }

  function wireParallax(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth < 900) return;
    const radar = document.querySelector('.temporal-radar');
    if(!radar) return;
    addEventListener('pointermove', ev => {
      const x = (ev.clientX / innerWidth - .5) * 10;
      const y = (ev.clientY / innerHeight - .5) * 10;
      radar.style.transform = `translate3d(${x}px,${y}px,0)`;
    }, { passive:true });
  }

  async function mount(){
    setActiveNav();
    const page = routeFromPath();
    const main = document.getElementById('portalMain');
    const privateRoutes = { login:'login', register:'register', privateDashboard:'dashboard', favorites:'favorites', watchlist:'watchlist', agenda:'agenda', notifications:'notifications', portfolios:'portfolios', newPortfolio:'newPortfolio', account:'account' };
    if(privateRoutes[page]){
      const result = await global.DividendPrivateApp.renderPrivate(privateRoutes[page]);
      main.innerHTML = result.html;
      result.wire();
      wireReveals();
      return;
    }
    const renderers = { home:renderHome, assets:renderAssets, assetDetail:renderAssetDetail, calendar:renderCalendar, incomeMap:renderIncomeMap, about:renderAbout, methodology:renderMethodology, admin:() => renderAdmin('admin'), adminProventos:() => renderAdmin('adminProventos'), adminImports:() => renderAdmin('adminImports'), adminNewImport:() => renderAdmin('adminNewImport'), adminBrapi:() => renderAdmin('adminBrapi'), adminAssets:() => renderAdmin('adminAssets'), adminEvents:() => renderAdmin('adminEvents'), adminReview:() => renderAdmin('adminReview'), adminPublishing:() => renderAdmin('adminPublishing'), adminSources:() => renderAdmin('adminSources'), adminQuality:() => renderAdmin('adminQuality'), adminJobs:() => renderAdmin('adminJobs'), adminAudit:() => renderAdmin('adminAudit'), adminFinops:() => renderAdmin('adminFinops'), adminSecurity:() => renderAdmin('adminSecurity'), adminSettings:() => renderAdmin('adminSettings'), system:renderSystem };
    main.innerHTML = (renderers[page] || renderHome)();
    if(page === 'assets'){
      wireAssetDiscovery();
      paintAssetRows();
    }
    document.getElementById('refreshBrapi')?.addEventListener('click', async () => {
      const box = document.getElementById('brapiStatus');
      try{
        box.textContent = 'Consultando gateway seguro...';
        const ticker = document.querySelector('h1')?.textContent?.split(' - ')[0] || '';
        await global.DividendBrapiGateway.fetchQuote(ticker);
        box.textContent = `Gateway respondeu com sucesso para ${ticker}. Resultado bruto mantido fora da UI publica.`;
      }catch(err){
        box.textContent = `Gateway indisponivel neste ambiente estatico: ${err.message || err}`;
      }
    });
    wireHeroSearch();
    wireSimulator();
    wireMethodologyExample();
    wireAdminImports();
    wireIncomeCalendar();
    wireReveals();
    wireParallax();
  }

  document.addEventListener('DOMContentLoaded', mount);
})(window, document);
