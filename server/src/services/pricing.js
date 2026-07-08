// Placeholder rates — configurable here. Adjust to match the actual print shop's pricing.
const PER_PAGE_RATES = {
  BW: { A4: 2, A3: 4, Letter: 2 },
  Color: { A4: 10, A3: 18, Letter: 10 },
};

const BINDING_FEES = {
  none: 0,
  stapled: 0,
  spiral: 20,
};

function getPerPageRate(printMode, paperSize) {
  const modeRates = PER_PAGE_RATES[printMode];
  if (!modeRates || !(paperSize in modeRates)) {
    throw new Error(`No rate configured for printMode=${printMode} paperSize=${paperSize}`);
  }
  return modeRates[paperSize];
}

function getBindingFee(binding) {
  if (!(binding in BINDING_FEES)) {
    throw new Error(`Unknown binding type: ${binding}`);
  }
  return BINDING_FEES[binding];
}

// total = pagesToPrint x perPageRate x copies + bindingFee
function calcTotal({ pagesToPrint, printMode, paperSize, copies, binding }) {
  const perPageRate = getPerPageRate(printMode, paperSize);
  const bindingFee = getBindingFee(binding);
  const totalAmount = pagesToPrint * perPageRate * copies + bindingFee;
  return { perPageRate, bindingFee, totalAmount };
}

module.exports = { PER_PAGE_RATES, BINDING_FEES, getPerPageRate, getBindingFee, calcTotal };
