(function(global,document){
  'use strict';
  async function read(url){
    try {
      const response=await fetch(url,{cache:'no-cache'});
      return response.ok?await response.json():null;
    } catch {return null;}
  }
  function el(tag,text){
    const element=document.createElement(tag);
    element.textContent=text;
    return element;
  }
  function dateBR(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;
    const time=new Date(value+'T12:00:00Z');
    return isNaN(time.getTime())?null:time.toLocaleDateString('pt-BR',{timeZone:'UTC'});
  }
  async function render(){
    const host=document.querySelector('#portalApp');
    if(!host)return;
    const [cvm,eod,fii]=await Promise.all([read('/data/cvm-catalog.json'),read('/data/radar-eod.json'),read('/data/cvm-fii-metrics.json')]);
    const strip=el('aside','');
    strip.setAttribute('aria-label','Transparência das fontes de dados');
    strip.style.cssText='padding:9px 18px;background:#0c211d;color:#d1e7dc;border-bottom:1px solid #305448;font:12px/1.5 system-ui,sans-serif;display:flex;gap:14px;flex-wrap:wrap;align-items:center';
    const cvmValid=cvm?.schemaVersion===1&&cvm?.dataType==='official-dataset-catalog'&&Array.isArray(cvm.datasets)&&cvm.datasets.length>0;
    strip.appendChild(el('span',cvmValid?
      'CVM: '+cvm.datasets.length+' catálogos oficiais disponíveis (metadados; não são cotações)':
      'CVM: catálogo ainda não publicado'));
    const metricsValid=fii?.schemaVersion===1&&fii?.dataType==='monthly-fii-accounting'&&
      Array.isArray(fii.metrics)&&fii.metrics.length>0&&fii.coverage?.funds===fii.metrics.length;
    strip.appendChild(el('span',metricsValid?
      'FIIs CVM: '+fii.coverage.funds+' fundos com métricas contábeis por CNPJ (não são dividendos)':
      'FIIs CVM: métricas contábeis ainda não extraídas'));
    const eodValid=eod?.schemaVersion===1&&eod?.market==='B3'&&eod?.source&&eod?.count>0&&dateBR(eod.tradeDate);
    strip.appendChild(el('span',eodValid?
      'Fechamento B3 D-1: '+dateBR(eod.tradeDate)+' · '+eod.count+' ativos · '+eod.source:
      'B3 D-1: aguardando fonte autorizada; sem cotação automática'));
    const header=host.querySelector('header');
    if(header)header.insertAdjacentElement('afterend',strip);
    else host.prepend(strip);
  }
  document.addEventListener('DOMContentLoaded',render);
})(window,document);
