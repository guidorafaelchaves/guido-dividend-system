(function(global){
  'use strict';

  const EVENT_STATUS = Object.freeze({
    CONFIRMED: 'confirmed',
    PROVISIONED: 'provisioned',
    ESTIMATED: 'estimated',
    PROJECTED: 'projected'
  });

  const SOURCE_TRUST = Object.freeze({
    B3: 'official',
    BRAPI: 'market-provider',
    ADMIN: 'curated',
    DEMO: 'demo-fixture',
    LEGACY: 'legacy-adapter'
  });

  const featureFlags = Object.freeze({
    PUBLIC_PORTAL_ENABLED: true,
    PUBLIC_ASSET_CATALOG_ENABLED: true,
    PUBLIC_EVENT_CALENDAR_ENABLED: true,
    PUBLIC_INCOME_MAP_ENABLED: true,
    ADMIN_PUBLICATION_ENABLED: true,
    LEGACY_DASHBOARD_ENABLED: true
  });

  const demoAssets = [
    { ticker:'MXRF11', name:'Maxi Renda FII', type:'FII', sector:'Recebiveis imobiliarios', price:10.28, dividendYield:12.4, recurrenceScore:86, liquidityScore:72, source:SOURCE_TRUST.DEMO },
    { ticker:'BBAS3', name:'Banco do Brasil', type:'Acao', sector:'Bancos', price:26.52, dividendYield:9.1, recurrenceScore:79, liquidityScore:93, source:SOURCE_TRUST.DEMO },
    { ticker:'TAEE11', name:'Taesa Units', type:'Unit', sector:'Energia eletrica', price:35.76, dividendYield:8.7, recurrenceScore:82, liquidityScore:78, source:SOURCE_TRUST.DEMO },
    { ticker:'PETR4', name:'Petrobras PN', type:'Acao', sector:'Petroleo e gas', price:37.84, dividendYield:13.8, recurrenceScore:62, liquidityScore:98, source:SOURCE_TRUST.DEMO },
    { ticker:'HGLG11', name:'CSHG Logistica FII', type:'FII', sector:'Logistica', price:159.40, dividendYield:8.2, recurrenceScore:88, liquidityScore:81, source:SOURCE_TRUST.DEMO }
  ];

  const demoEvents = [
    { id:'evt-mxrf11-2026-08', ticker:'MXRF11', kind:'rendimento', status:EVENT_STATUS.CONFIRMED, source:SOURCE_TRUST.DEMO, exDate:'2026-07-31', paymentDate:'2026-08-14', amount:0.10 },
    { id:'evt-bbas3-2026-08', ticker:'BBAS3', kind:'dividendo', status:EVENT_STATUS.PROVISIONED, source:SOURCE_TRUST.DEMO, exDate:'2026-08-12', paymentDate:'2026-08-28', amount:0.42 },
    { id:'evt-taee11-2026-09', ticker:'TAEE11', kind:'jcp', status:EVENT_STATUS.ESTIMATED, source:SOURCE_TRUST.DEMO, exDate:'2026-09-06', paymentDate:'2026-09-20', amount:0.63 },
    { id:'evt-petr4-2026-09', ticker:'PETR4', kind:'dividendo', status:EVENT_STATUS.PROJECTED, source:SOURCE_TRUST.DEMO, exDate:'2026-09-18', paymentDate:'2026-10-02', amount:1.05 },
    { id:'evt-hglg11-2026-08', ticker:'HGLG11', kind:'rendimento', status:EVENT_STATUS.CONFIRMED, source:SOURCE_TRUST.DEMO, exDate:'2026-08-29', paymentDate:'2026-09-13', amount:1.10 }
  ];

  function normalizeTicker(ticker){
    return String(ticker || '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  }

  function normalizeAsset(input){
    const ticker = normalizeTicker(input.ticker);
    return {
      id: ticker,
      ticker,
      name: String(input.name || ticker || 'Ativo sem nome'),
      type: String(input.type || 'Ativo'),
      sector: String(input.sector || 'Nao classificado'),
      price: Number(input.price || 0),
      dividendYield: Number(input.dividendYield || 0),
      recurrenceScore: Number(input.recurrenceScore || 0),
      liquidityScore: Number(input.liquidityScore || 0),
      source: input.source || SOURCE_TRUST.LEGACY,
      updatedAt: input.updatedAt || new Date().toISOString()
    };
  }

  function normalizeEvent(input){
    const status = Object.values(EVENT_STATUS).includes(input.status) ? input.status : EVENT_STATUS.ESTIMATED;
    return {
      id: String(input.id || `${normalizeTicker(input.ticker)}-${input.paymentDate || Date.now()}`),
      ticker: normalizeTicker(input.ticker),
      kind: String(input.kind || 'provento'),
      status,
      source: input.source || SOURCE_TRUST.LEGACY,
      exDate: input.exDate || '',
      paymentDate: input.paymentDate || '',
      amount: Number(input.amount || 0),
      confidence: status === EVENT_STATUS.CONFIRMED ? 1 : status === EVENT_STATUS.PROVISIONED ? .78 : status === EVENT_STATUS.ESTIMATED ? .54 : .34
    };
  }

  function statusLabel(status){
    return ({ confirmed:'Confirmado', provisioned:'Provisionado', estimated:'Estimado', projected:'Projetado' })[status] || 'Estimado';
  }

  function createRepository(key, fallback){
    return {
      all(){
        try{
          const stored = JSON.parse(localStorage.getItem(key) || 'null');
          return Array.isArray(stored) && stored.length ? stored : fallback;
        }catch{
          return fallback;
        }
      },
      save(rows){
        localStorage.setItem(key, JSON.stringify(rows || []));
      }
    };
  }

  const assetRepository = createRepository('gds_public_assets_v1', demoAssets.map(normalizeAsset));
  const eventRepository = createRepository('gds_public_events_v1', demoEvents.map(normalizeEvent));
  const publishedEventRepository = {
    all(){
      const baseEvents = eventRepository.all().map(normalizeEvent);
      try{
        const stored = JSON.parse(localStorage.getItem('gds_published_events_v1') || 'null');
        if(Array.isArray(stored) && stored.length){
          const publishedEvents = stored
            .filter(event => event.publicationStatus === 'published' || event.publicVisibility === true || event.public_visibility === 1)
            .map(event => normalizeEvent({
              id: event.id || event.publicId || event.public_id,
              ticker: event.ticker,
              kind: event.kind || event.eventType || event.event_type,
              status: event.status || event.financialStatus || event.financial_status,
              source: event.source || event.sourceName || event.source_name || 'published-cache',
              exDate: event.exDate || event.ex_date,
              paymentDate: event.paymentDate || event.payment_date,
              amount: event.amount || event.amountPerUnit || event.amount_per_unit
            }));
          const byId = new Map(baseEvents.map(event => [event.id, event]));
          publishedEvents.forEach(event => byId.set(event.id, event));
          return [...byId.values()];
        }
      }catch{}
      return baseEvents;
    }
  };

  global.DividendDomain = Object.freeze({
    EVENT_STATUS,
    SOURCE_TRUST,
    featureFlags,
    normalizeTicker,
    normalizeAsset,
    normalizeEvent,
    statusLabel,
    assetRepository,
    eventRepository,
    publishedEventRepository
  });
})(window);
