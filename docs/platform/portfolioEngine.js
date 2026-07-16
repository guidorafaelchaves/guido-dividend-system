(function(global){
  'use strict';

  const MONEY_SCALE = 100;

  function toNumber(value){
    const n = Number(String(value || '0').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function roundCents(value){
    return Math.round(Number(value || 0));
  }

  function transactionAmountCents(tx){
    if(Number.isFinite(Number(tx.grossAmountCents)) && Number(tx.grossAmountCents) !== 0) return roundCents(tx.grossAmountCents);
    return roundCents(toNumber(tx.quantity) * Number(tx.priceCents || 0));
  }

  function calculatePosition(transactions){
    const ordered = [...(transactions || [])].sort((a,b) => String(a.tradeDate || a.date || '').localeCompare(String(b.tradeDate || b.date || '')));
    let quantity = 0;
    let openCostCents = 0;
    let realizedResultCents = 0;
    let incomeReceivedCents = 0;
    for(const tx of ordered){
      const type = tx.type;
      const qty = toNumber(tx.quantity);
      const amount = transactionAmountCents(tx);
      const fees = roundCents(tx.feesCents);
      const taxes = roundCents(tx.taxesCents);
      if(type === 'buy' || type === 'transfer_in' || type === 'subscription'){
        quantity += qty;
        openCostCents += amount + fees + taxes;
      }else if(type === 'sell' || type === 'transfer_out'){
        if(qty > quantity) throw new Error('Movimentacao geraria posicao negativa.');
        const avg = quantity > 0 ? openCostCents / quantity : 0;
        const removedCost = Math.min(openCostCents, Math.round(avg * qty));
        quantity = Math.max(0, quantity - qty);
        openCostCents -= removedCost;
        realizedResultCents += amount - fees - taxes - removedCost;
        if(quantity === 0) openCostCents = 0;
      }else if(['dividend','jcp','fii_income','amortization'].includes(type)){
        incomeReceivedCents += amount - taxes;
        if(type === 'amortization') openCostCents = Math.max(0, openCostCents - amount);
      }else if(type === 'bonus'){
        quantity += qty;
      }else if(type === 'split'){
        const factor = toNumber(tx.factor || tx.quantity || 1);
        if(factor > 0) quantity *= factor;
      }else if(type === 'reverse_split'){
        const factor = toNumber(tx.factor || tx.quantity || 1);
        if(factor > 0) quantity /= factor;
      }else if(type === 'fee'){
        openCostCents += fees || amount;
      }else if(type === 'tax'){
        realizedResultCents -= taxes || amount;
      }
    }
    const averageCostCents = quantity > 0 ? Math.round(openCostCents / quantity) : 0;
    return {
      quantity: Number(quantity.toFixed(8)),
      openCostCents,
      averageCostCents,
      realizedResultCents,
      incomeReceivedCents,
      yieldOnCostPct: openCostCents > 0 ? (incomeReceivedCents / openCostCents) * 100 : 0
    };
  }

  function eligibleQuantityAt(transactions, referenceDate){
    const cutoff = String(referenceDate || '');
    const relevant = (transactions || []).filter(tx => String(tx.tradeDate || tx.date || '') <= cutoff);
    return calculatePosition(relevant).quantity;
  }

  function estimatePersonalIncome(position, event){
    const qty = toNumber(position.quantity);
    const amount = roundCents(event.amountCents || event.amount_cents || 0);
    return {
      ticker: event.ticker,
      status: event.status === 'confirmed' ? 'confirmed' : event.status === 'provisioned' ? 'provisioned' : 'predicted',
      quantity: qty,
      amountCents: Math.round(qty * amount),
      currency: event.currency || 'BRL',
      paymentDate: event.paymentDate || event.payment_date || ''
    };
  }

  global.DividendPortfolioEngine = Object.freeze({ MONEY_SCALE, calculatePosition, eligibleQuantityAt, estimatePersonalIncome });
})(window);
