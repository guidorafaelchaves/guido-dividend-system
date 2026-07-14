(function(global){
  'use strict';

  const EPS=1e-9;
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const iso=d=>new Date(d+'T00:00:00Z');
  const days=(a,b)=>(iso(b)-iso(a))/86400000;
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));

  function normalizeCashFlows(flows){
    return (flows||[]).map(x=>({date:String(x.date||''),amount:num(x.amount)}))
      .filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Math.abs(x.amount)>EPS)
      .sort((a,b)=>a.date.localeCompare(b.date));
  }

  function xnpv(rate,flows){
    const f=normalizeCashFlows(flows);if(!f.length||rate<=-1)return NaN;
    const d0=f[0].date;
    return f.reduce((s,x)=>s+x.amount/Math.pow(1+rate,days(d0,x.date)/365),0);
  }

  function xirr(flows,guess=.1){
    const f=normalizeCashFlows(flows);
    if(!f.some(x=>x.amount<0)||!f.some(x=>x.amount>0))return null;
    let r=guess;
    for(let i=0;i<80;i++){
      const d0=f[0].date;
      let value=0,derivative=0;
      for(const x of f){
        const t=days(d0,x.date)/365;
        value+=x.amount/Math.pow(1+r,t);
        derivative-=t*x.amount/Math.pow(1+r,t+1);
      }
      if(Math.abs(value)<1e-8)return r;
      if(!Number.isFinite(derivative)||Math.abs(derivative)<1e-12)break;
      const next=r-value/derivative;
      if(!Number.isFinite(next)||next<=-.999999||next>1e4)break;
      if(Math.abs(next-r)<1e-10)return next;
      r=next;
    }
    let lo=-.9999,hi=10,fl=xnpv(lo,f),fh=xnpv(hi,f);
    while(Number.isFinite(fh)&&fl*fh>0&&hi<1e6){hi*=2;fh=xnpv(hi,f);}
    if(!Number.isFinite(fl)||!Number.isFinite(fh)||fl*fh>0)return null;
    for(let i=0;i<200;i++){
      const mid=(lo+hi)/2,fm=xnpv(mid,f);
      if(Math.abs(fm)<1e-8)return mid;
      if(fl*fm<=0){hi=mid;fh=fm;}else{lo=mid;fl=fm;}
    }
    return (lo+hi)/2;
  }

  function timeWeightedReturn(periods){
    return (periods||[]).reduce((acc,p)=>{
      const start=num(p.startValue),end=num(p.endValue),flow=num(p.externalFlow);
      if(start<=0)return acc;
      return acc*(1+(end-flow-start)/start);
    },1)-1;
  }

  function continuousMonths(start,end){
    if(!start||!end)return [];
    const out=[];let y=+start.slice(0,4),m=+start.slice(5,7)-1;
    const ey=+end.slice(0,4),em=+end.slice(5,7)-1;
    while(y<ey||(y===ey&&m<=em)){out.push(`${y}-${String(m+1).padStart(2,'0')}`);m++;if(m===12){m=0;y++;}}
    return out;
  }

  function monthlySeries(events,startMonth,endMonth,valueField='amount'){
    const map={};
    for(const e of events||[]){const k=String(e.date||e.paymentDate||'').slice(0,7);if(k)map[k]=(map[k]||0)+num(e[valueField]);}
    const keys=continuousMonths(startMonth,endMonth);
    return keys.map(month=>({month,value:map[month]||0}));
  }

  function trailingDividendYield(dividendsPerShare,price,asOf){
    const cutoff=new Date(iso(asOf));cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
    const total=(dividendsPerShare||[]).filter(x=>x.date>cutoff.toISOString().slice(0,10)&&x.date<=asOf)
      .reduce((s,x)=>s+num(x.amount),0);
    return price>0?total/price:null;
  }

  function yieldOnCost(annualIncome,costBasis){return costBasis>0?num(annualIncome)/num(costBasis):null;}

  function rebuildPosition(trades,corporateEvents=[]){
    let qty=0,cost=0,realized=0,fees=0;
    const rows=[...(trades||[]).map(x=>({...x,kind:String(x.type||x.kind||'').toUpperCase()})),
      ...(corporateEvents||[]).map(x=>({...x,kind:String(x.type||x.kind||'').toUpperCase()}))]
      .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    for(const x of rows){
      const q=Math.max(0,num(x.quantity)),p=Math.max(0,num(x.unitPrice)),f=Math.max(0,num(x.fees));fees+=f;
      if(x.kind==='BUY'||x.kind==='COMPRA') {qty+=q;cost+=q*p+f;}
      else if(x.kind==='SELL'||x.kind==='VENDA'){
        const sold=Math.min(q,qty),avg=qty>0?cost/qty:0,written=avg*sold;
        realized+=sold*p-f-written;qty-=sold;cost-=written;if(qty<EPS){qty=0;cost=0;}
      } else if(x.kind==='AMORTIZATION'||x.kind==='AMORTIZACAO'){
        const reduction=Math.min(cost,Math.max(0,num(x.amount)));cost-=reduction;
      } else if(x.kind==='SPLIT'||x.kind==='DESDOBRAMENTO'){
        const factor=num(x.factor);if(factor>0)qty*=factor;
      } else if(x.kind==='REVERSE_SPLIT'||x.kind==='GRUPAMENTO'){
        const factor=num(x.factor);if(factor>0)qty/=factor;
      } else if(x.kind==='BONUS'||x.kind==='BONIFICACAO') qty+=q;
    }
    return {quantity:qty,costBasis:cost,averageCost:qty>0?cost/qty:0,realizedProfit:realized,totalFees:fees};
  }

  function economicReturn({openingValue=0,closingValue=0,buys=0,sales=0,income=0,fees=0,taxes=0}){
    return num(closingValue)+num(sales)+num(income)-num(openingValue)-num(buys)-num(fees)-num(taxes);
  }

  function incomeQuality(events,startMonth,endMonth){
    const series=monthlySeries(events,startMonth,endMonth);
    if(!series.length)return {regularity:null,mean3:null,mean6:null,mean12:null,trend:null,volatility:null};
    const vals=series.map(x=>x.value),avg=n=>{const a=vals.slice(-n);return a.reduce((s,v)=>s+v,0)/n;};
    const mean=vals.reduce((s,v)=>s+v,0)/vals.length;
    const variance=vals.reduce((s,v)=>s+Math.pow(v-mean,2),0)/vals.length;
    const recent=avg(3),prior=vals.length>=6?vals.slice(-6,-3).reduce((s,v)=>s+v,0)/3:null;
    return {regularity:vals.filter(v=>v>0).length/vals.length,mean3:avg(3),mean6:avg(6),mean12:avg(12),trend:prior&&prior>0?(recent/prior)-1:null,volatility:mean>0?Math.sqrt(variance)/mean:null,series};
  }

  function validateTradeValue({quantity,unitPrice,totalValue,fees=0,tolerance=.02}){
    const expected=num(quantity)*num(unitPrice)+num(fees),actual=num(totalValue);
    if(expected<=0||actual<=0)return {status:'missing',expected,actual,error:null};
    const error=Math.abs(actual-expected)/Math.max(actual,expected);
    return {status:error<=.005?'ok':error<=tolerance?'review':'blocked',expected,actual,error};
  }

  function decisionMatrix({quality,valuation,risk,suitability,dataConfidence}){
    const q=num(quality),v=num(valuation),r=num(risk),s=num(suitability),c=num(dataConfidence);
    if(c<.6)return {action:'INVESTIGATE',reason:'Insufficient data confidence'};
    if(r>.75)return {action:'AVOID_OR_REDUCE',reason:'Risk exceeds mandate'};
    if(q>=.75&&v>=.65&&s>=.65)return {action:'PRIORITIZE_REVIEW',reason:'High quality, attractive valuation and portfolio fit'};
    if(q>=.75&&v<.45)return {action:'WAIT_FOR_PRICE',reason:'High quality but unattractive valuation'};
    if(q<.45)return {action:'DO_NOT_PRIORITIZE',reason:'Weak underlying quality'};
    return {action:'MONITOR',reason:'Mixed evidence'};
  }

  const api={xnpv,xirr,timeWeightedReturn,continuousMonths,monthlySeries,trailingDividendYield,yieldOnCost,rebuildPosition,economicReturn,incomeQuality,validateTradeValue,decisionMatrix,clamp};
  global.GDSFinancialEngine=Object.freeze(api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
