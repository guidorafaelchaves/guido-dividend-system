(function(global){
  'use strict';

  const api = () => global.DividendAccountClient;
  const money = cents => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);

  function privateNav(){
    return `<nav class="private-nav">
      <a href="/meu-painel/">Meu painel</a>
      <a href="/watchlist/">Watchlist</a>
      <a href="/favoritos/">Favoritos</a>
      <a href="/minha-agenda/">Minha agenda</a>
      <a href="/notificacoes/">Notificacoes</a>
      <a href="/carteiras/">Carteiras</a>
      <a href="/conta/perfil/">Conta</a>
    </nav>`;
  }

  function authRequired(title){
    return `<section class="panel auth-box">
      <span class="eyebrow">Conta gratuita</span>
      <h1>Transforme o mercado em uma agenda pessoal.</h1>
      <p class="lead">Entre para salvar ativos, acompanhar datas, receber alertas internos e organizar sua carteira sem bloquear a exploracao publica.</p>
      <div class="actions"><a class="btn primary" href="/entrar/">Entrar</a><a class="btn secondary" href="/cadastro/">Criar conta</a></div>
    </section>`;
  }

  function authForm(mode){
    const isRegister = mode === 'register';
    return `<section class="auth-box auth-layout">
      <article class="panel">
        <span class="eyebrow">${isRegister ? 'Conta gratuita' : 'Acesso seguro'}</span>
        <h1>${isRegister ? 'Crie sua agenda de proventos.' : 'Entre na sua agenda financeira.'}</h1>
        <p class="lead">${isRegister ? 'Acompanhe ativos, receba alertas internos e organize sua primeira carteira.' : 'Continue acompanhando datas, eventos e pendencias da sua carteira.'}</p>
        <form id="authForm" class="form-stack">
          ${isRegister ? '<div class="form-row"><label for="displayName">Nome</label><input id="displayName" autocomplete="name"></div>' : ''}
          <div class="form-row"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div>
          <div class="form-row"><label for="password">Senha</label><input id="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" required minlength="10"></div>
          <div class="form-row"><label for="apiBase">API da plataforma</label><input id="apiBase" type="url" value="${esc(api().apiBase())}"></div>
          <button class="btn primary" type="submit">${isRegister ? 'Criar conta gratuita' : 'Entrar'}</button>
          <div id="authStatus" class="notice">Autenticacao ocorre no Worker da plataforma. A senha nao fica no frontend.</div>
        </form>
      </article>
      <aside class="temporal-radar" style="min-height:520px">
        <div class="radar-grid" aria-hidden="true"><div class="radar-ring r1"></div><div class="radar-ring r2"></div><div class="radar-ring r3"></div><div class="radar-center">Conta</div><div class="radar-sweep"></div></div>
        <div class="radar-event near"><strong>Favoritos</strong><small>Salve os ativos importantes</small><div class="event-value">Acesso rapido</div></div>
        <div class="radar-event mid"><strong>Watchlist</strong><small>Datas e alertas internos</small><div class="event-value">Agenda viva</div></div>
        <div class="radar-event far"><strong>Carteira</strong><small>Posicoes e proventos</small><div class="event-value">Contexto pessoal</div></div>
      </aside>
    </section>`;
  }

  function wireAuth(mode){
    document.getElementById('authForm')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      const status = document.getElementById('authStatus');
      api().setApiBase(document.getElementById('apiBase').value);
      const input = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        displayName: document.getElementById('displayName')?.value || ''
      };
      try{
        status.textContent = 'Validando no backend...';
        if(mode === 'register') await api().register(input); else await api().login(input);
        location.href = '/meu-painel/';
      }catch(err){
        status.textContent = err.message || String(err);
      }
    });
  }

  async function dashboard(){
    const data = await api().request('/me/dashboard');
    return `${privateNav()}<section class="section-head"><div><span class="eyebrow">Agenda pessoal</span><h1>Meu painel</h1><p>Resumo operacional da sua conta gratuita.</p></div><button class="btn secondary" id="logoutBtn">Sair</button></section>
    <section class="grid cols-4">
      <article class="card metric"><small>Favoritos</small><b>${data.counts.favorites}</b></article>
      <article class="card metric"><small>Watchlists</small><b>${data.counts.watchlists}</b></article>
      <article class="card metric"><small>Alertas</small><b>${data.counts.alerts}</b></article>
      <article class="card metric"><small>Carteiras</small><b>${data.counts.portfolios}</b></article>
    </section>
    <section class="grid cols-2" style="margin-top:14px">
      <article class="card"><h2>Proximas acoes</h2><div class="inline-list">${data.suggestedActions.map(item => `<span class="pill">${esc(item)}</span>`).join('')}</div></article>
      <article class="card"><h2>Plano atual</h2><p>${esc(data.subscription.planId)}. Watchlist: ${data.subscription.limits.watchlistAssets}; Carteiras: ${data.subscription.limits.portfolios}; Alertas: ${data.subscription.limits.alerts}.</p></article>
    </section>`;
  }

  async function favorites(){
    const data = await api().request('/favorites');
    return `${privateNav()}<section class="section-head"><div><h1>Favoritos</h1><p>Marcadores simples para acesso rapido.</p></div></section>
    <form class="filters" id="favoriteForm"><input id="favoriteTicker" placeholder="Ticker, ex: MXRF11"><button class="btn primary">Adicionar</button></form>
    <section class="grid cols-3">${data.favorites.length ? data.favorites.map(item => `<article class="card"><h3>${esc(item.ticker)}</h3><p>${esc(item.name)}<br>${esc(item.sector)}</p></article>`).join('') : '<div class="empty">Adicione ativos para acesso rapido.</div>'}</section>`;
  }

  function wireFavorites(){
    document.getElementById('favoriteForm')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      await api().request('/favorites', { method:'POST', body:{ ticker:document.getElementById('favoriteTicker').value } });
      location.reload();
    });
  }

  async function watchlist(){
    const data = await api().request('/watchlists');
    const first = data.watchlists[0];
    return `${privateNav()}<section class="section-head"><div><h1>Watchlist</h1><p>Listas acompanhadas com prioridade, notas e alertas futuros.</p></div></section>
    <section class="grid cols-2">
      <article class="card"><h2>Listas</h2>${data.watchlists.map(w => `<p><b>${esc(w.name)}</b> - ${w.item_count} ativos - ${esc(w.status)}</p>`).join('') || '<p class="muted">Nenhuma lista criada.</p>'}</article>
      <article class="card"><h2>Adicionar ativo</h2><form class="form-stack" id="watchItemForm"><input type="hidden" id="watchlistId" value="${esc(first?.id || '')}"><div class="form-row"><label>Ticker</label><input id="watchTicker" placeholder="BBAS3"></div><div class="form-row"><label>Prioridade</label><select id="watchPriority"><option>normal</option><option>high</option><option>low</option></select></div><button class="btn primary">Adicionar</button></form></article>
    </section>`;
  }

  function wireWatchlist(){
    document.getElementById('watchItemForm')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      const id = document.getElementById('watchlistId').value;
      if(!id) return;
      await api().request(`/watchlists/${id}/items`, { method:'POST', body:{ ticker:document.getElementById('watchTicker').value, priority:document.getElementById('watchPriority').value } });
      location.reload();
    });
  }

  async function alerts(){
    const data = await api().request('/alerts');
    return `${privateNav()}<section class="section-head"><div><h1>Alertas</h1><p>Alertas basicos internos, sem envio externo sem consentimento.</p></div></section>
    <form class="filters" id="alertForm"><input id="alertTicker" placeholder="Ticker opcional"><select id="alertType"><option value="payment_due">Pagamento proximo</option><option value="new_event">Novo evento</option><option value="price_range">Cotacao atingiu faixa</option></select><button class="btn primary">Criar alerta</button></form>
    <section class="grid cols-3">${data.alerts.length ? data.alerts.map(a => `<article class="card"><h3>${esc(a.type)}</h3><p>${esc(a.ticker || 'Geral')} - ${esc(a.status)} - ${esc(a.channel)}</p></article>`).join('') : '<div class="empty">Crie um alerta para ser informado sobre eventos relevantes.</div>'}</section>`;
  }

  function wireAlerts(){
    document.getElementById('alertForm')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      await api().request('/alerts', { method:'POST', body:{ ticker:document.getElementById('alertTicker').value, type:document.getElementById('alertType').value } });
      location.reload();
    });
  }

  async function notifications(){
    const data = await api().request('/notifications');
    return `${privateNav()}<section class="section-head"><div><h1>Notificacoes</h1><p>Central interna para eventos agrupados e avisos operacionais.</p></div></section><section class="grid">${data.notifications.map(n => `<article class="card"><h3>${esc(n.title)}</h3><p>${esc(n.body)}<br><span class="muted">${esc(n.status)} - ${esc(n.created_at)}</span></p></article>`).join('') || '<div class="empty">Nenhuma notificacao.</div>'}</section>`;
  }

  async function portfolios(){
    const data = await api().request('/portfolios');
    return `${privateNav()}<section class="section-head"><div><h1>Carteiras</h1><p>Base pessoal para posicoes, movimentacoes e renda.</p></div><a class="btn primary" href="/carteiras/nova/">Nova carteira</a></section><section class="grid cols-3">${data.portfolios.map(p => `<article class="card"><h3>${esc(p.name)}</h3><p>${esc(p.objective || 'Sem objetivo definido')}<br>Meta: ${money(p.target_income_cents)} - ${p.transaction_count} movimentacoes</p></article>`).join('') || '<div class="empty">Crie sua primeira carteira para organizar posicoes, movimentacoes e renda passiva.</div>'}</section>`;
  }

  function newPortfolio(){
    return `${privateNav()}<section class="panel auth-box"><h1>Nova carteira</h1><form class="form-stack" id="portfolioForm"><div class="form-row"><label>Nome</label><input id="portfolioName" required></div><div class="form-row"><label>Objetivo</label><input id="portfolioObjective"></div><div class="form-row"><label>Meta mensal de renda</label><input id="portfolioTarget" type="number" min="0" step="0.01"></div><button class="btn primary">Criar carteira</button></form></section>`;
  }

  function wirePortfolio(){
    document.getElementById('portfolioForm')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      await api().request('/portfolios', { method:'POST', body:{ name:document.getElementById('portfolioName').value, objective:document.getElementById('portfolioObjective').value, targetIncomeCents:Math.round(Number(document.getElementById('portfolioTarget').value || 0) * 100) } });
      location.href = '/carteiras/';
    });
  }

  async function account(){
    const data = await api().request('/me');
    return `${privateNav()}<section class="grid cols-2"><article class="card"><h1>Perfil</h1><p>${esc(data.user.email)}<br>${esc(data.profile?.display_name || '')}<br>Moeda: ${esc(data.profile?.currency || 'BRL')}</p></article><article class="card"><h2>Preferencias</h2><p>Alertas: ${esc(data.preferences?.alert_frequency || 'weekly')}</p></article><article class="card danger-zone"><h2>Dados e privacidade</h2><p>Exportacao e exclusao de conta estao modeladas para a API; textos juridicos devem passar por revisao.</p></article></section>`;
  }

  async function renderPrivate(route){
    if(route === 'login') return { html:authForm('login'), wire:() => wireAuth('login') };
    if(route === 'register') return { html:authForm('register'), wire:() => wireAuth('register') };
    if(!api().token()) return { html:authRequired(route), wire:() => {} };
    try{
      if(route === 'dashboard') return { html:await dashboard(), wire:() => document.getElementById('logoutBtn')?.addEventListener('click', async () => { await api().logout(); location.href = '/'; }) };
      if(route === 'favorites') return { html:await favorites(), wire:wireFavorites };
      if(route === 'watchlist') return { html:await watchlist(), wire:wireWatchlist };
      if(route === 'agenda') return { html:await alerts(), wire:wireAlerts };
      if(route === 'alerts') return { html:await alerts(), wire:wireAlerts };
      if(route === 'notifications') return { html:await notifications(), wire:() => {} };
      if(route === 'portfolios') return { html:await portfolios(), wire:() => {} };
      if(route === 'newPortfolio') return { html:newPortfolio(), wire:wirePortfolio };
      if(route === 'account') return { html:await account(), wire:() => {} };
    }catch(err){
      return { html:`${privateNav()}<section class="notice">Nao foi possivel carregar a area privada: ${esc(err.message || err)}</section>`, wire:() => {} };
    }
    return { html:authRequired(route), wire:() => {} };
  }

  global.DividendPrivateApp = Object.freeze({ renderPrivate });
})(window);
