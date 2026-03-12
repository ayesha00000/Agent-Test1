import React, { useState, useEffect } from 'react';
import axios from 'axios';

//const API_URL = 'https://zakat-app-production-fdaa.up.railway.app';
const API_URL = 'http://127.0.0.1:8000';

const STEPS = [
  { id: 1, title: 'Gold & Silver',     icon: '🪙' },
  { id: 2, title: 'Cash & Bank',       icon: '💵' },
  { id: 3, title: 'Investments',       icon: '📈' },
  { id: 4, title: 'Business',          icon: '🏢' },
  { id: 5, title: 'Property & Other',  icon: '🏠' },
  { id: 6, title: 'Agriculture',       icon: '🌾' },
  { id: 7, title: 'Animals',           icon: '🐄' },
  { id: 8, title: 'Liabilities',       icon: '💳' },
  { id: 9, title: 'Result',            icon: '📊' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$',   label: 'USD ($)' },
  { code: 'PKR', symbol: 'Rs',  label: 'PKR (Rs)' },
  // { code: 'GBP', symbol: '£',   label: 'GBP (£)' },
  // { code: 'EUR', symbol: '€',   label: 'EUR (€)' },
  // { code: 'AED', symbol: 'AED', label: 'AED' },
  // { code: 'SAR', symbol: 'SAR', label: 'SAR' },
];

function Calculator({ assets, setAssets, liabilities, setLiabilities }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [result, setResult]           = useState(null);
  const [nisab, setNisab]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [currency, setCurrency]       = useState(CURRENCIES[0]);
  const [exchangeRate, setExchangeRate] = useState(279.5);
  const [validationErrors, setValidationErrors] = useState({});
  const [formulaRates, setFormulaRates] = useState({
    agri_rain_rate: 10.0,
    agri_irrigated_rate: 5.0,
    agri_mixed_rate: 7.5,
    animal_per: 40.0,
  });

  useEffect(() => { fetchNisab(); fetchExchangeRate(); fetchFormulaRates(); }, []);

  const fetchExchangeRate = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/rates`);
      // expecting backend field like { usd_to_pkr: 279.5 }
      setExchangeRate(res.data?.usd_to_pkr || res.data?.rate || res.data?.pkr_per_usd || 279.5);
    } catch (err) { console.error('Exchange rate error:', err); }
  };

  const fetchNisab = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/nisab`);
      setNisab(res.data);
    } catch (err) { console.error('Nisab fetch error:', err); }
  };

  const fetchFormulaRates = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/rates`);
      if (res.data) setFormulaRates({
        agri_rain_rate:      res.data.agri_rain_rate      || 10.0,
        agri_irrigated_rate: res.data.agri_irrigated_rate || 5.0,
        agri_mixed_rate:     res.data.agri_mixed_rate     || 7.5,
        animal_per:          res.data.animal_per          || 40.0,
      });
    } catch (err) { console.error('Formula rates error:', err); }
  };

  const sym = currency.symbol;
  const rate = currency.code === 'PKR' ? (parseFloat(exchangeRate) || 1) : 1;
  const conv = (val) => {
    const num = Number(val) || 0;
    return (num * rate).toFixed(2);
  };
  // dispVal: show user-entered values as-is (already in user's currency)
  const dispVal = (val) => (Number(val) || 0).toFixed(2);

  const getGold24kValue = () => nisab ? (parseFloat(assets.gold24kGrams) || 0) * nisab.gold_price_per_gram : 0;
  const getGold22kValue = () => nisab ? (parseFloat(assets.gold22kGrams) || 0) * nisab.gold_price_per_gram * 0.9167 : 0;
  const getGold18kValue = () => nisab ? (parseFloat(assets.gold18kGrams) || 0) * nisab.gold_price_per_gram * 0.75 : 0;
  const getSilverValue  = () => nisab ? (parseFloat(assets.silverGrams)  || 0) * nisab.silver_price_per_gram : 0;

  const handleA = (e) => {
    const { name, value } = e.target;
    setAssets({ ...assets, [name]: value });
    const newErrors = { ...validationErrors };
    if (value === '' || value === undefined) {
      delete newErrors[name];
    } else if (name === 'animalsCount') {
      const num = parseFloat(value);
      if (num < 0) newErrors[name] = 'Value cannot be negative';
      else if (!Number.isInteger(num)) newErrors[name] = 'Must be a whole number';
      else delete newErrors[name];
    } else {
      const num = parseFloat(value);
      if (num < 0) newErrors[name] = 'Value cannot be negative';
      else delete newErrors[name];
    }
    setValidationErrors(newErrors);
  };
  const handleL = (e) => {
    const { name, value } = e.target;
    setLiabilities({ ...liabilities, [name]: value });
    const newErrors = { ...validationErrors };
    if (value === '' || value === undefined) {
      delete newErrors[name];
    } else {
      const num = parseFloat(value);
      if (num < 0) newErrors[name] = 'Value cannot be negative';
      else delete newErrors[name];
    }
    setValidationErrors(newErrors);
  };

  const errMsg = (name) => validationErrors[name]
    ? <p className="text-red-500 text-xs mt-1">⚠️ {validationErrors[name]}</p>
    : null;

  const hasErrors = Object.keys(validationErrors).length > 0;

  // Block e, E, +, - on all number inputs; also block . on animalsCount
  const blockInvalid = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };
  const blockInvalidInt = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
  };

  const calculateZakat = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const totalGold = getGold24kValue() + getGold22kValue() + getGold18kValue() + (parseFloat(assets.otherGold) || 0);

      const businessNet = Math.max(0,
        (parseFloat(assets.businessStock)         || 0) +
        (parseFloat(assets.damagedStock)          || 0) +
        (parseFloat(assets.creditSalesReceivable) || 0) -
        (parseFloat(assets.businessPayables)      || 0) -
        (parseFloat(assets.badDebts)              || 0)
      );

      const partnershipNet = Math.max(0,
        (parseFloat(assets.partnershipCapital)     || 0) +
        (parseFloat(assets.partnershipLoans)       || 0) +
        (parseFloat(assets.partnershipProfit)      || 0) -
        (parseFloat(assets.partnershipWithdrawals) || 0)
      );

      // PKR fix: convert user-entered PKR values to USD before sending to backend
      // Gold/Silver are already in USD (grams × USD price), so excluded
      const r = parseFloat(exchangeRate) || 279.5;
      const toUSD = (val) => currency.code === 'PKR' ? (val / r) : val;

      const filteredAssets = {
        gold:               totalGold,
        silver:             getSilverValue(),
        precious_stones:    toUSD(parseFloat(assets.preciousStones)         || 0),
        cash:               toUSD(parseFloat(assets.cash)                   || 0),
        savings:            toUSD(parseFloat(assets.savings)                || 0),
        current_account:    toUSD(parseFloat(assets.currentAccount)         || 0),
        fixed_deposits:     toUSD(parseFloat(assets.fixedDeposits)          || 0),
        stocks:             toUSD(parseFloat(assets.stocks)                 || 0),
        receivables:        toUSD(parseFloat(assets.receivables)            || 0),
        govt_bonds:         toUSD(parseFloat(assets.govtBonds)              || 0),
        provident_fund:     toUSD(parseFloat(assets.providentFund)          || 0),
        insurance_premiums: toUSD(parseFloat(assets.insurancePremiums)      || 0),
        govt_securities:    toUSD(parseFloat(assets.govtSecurities)         || 0),
        private_funds:      toUSD(parseFloat(assets.privateFunds)           || 0),
        crypto:             toUSD(parseFloat(assets.crypto)                 || 0),
        other:              toUSD(parseFloat(assets.other)                  || 0),
        business:           toUSD(businessNet),
        investment_property: toUSD(parseFloat(assets.investmentProperty)   || 0),
        partnership_net:    toUSD(partnershipNet),
        agri_rain_fed:      toUSD(parseFloat(assets.agriRainFed)            || 0),
        agri_irrigated:     toUSD(parseFloat(assets.agriIrrigated)          || 0),
        agri_mixed:         toUSD(parseFloat(assets.agriMixed)              || 0),
        animals_value:      toUSD(parseFloat(assets.animalsValue)           || 0),
        animals_count:      parseInt(assets.animalsCount)                   || 0,
      };

      const filteredLiabilities = {
        loans_friends:   toUSD(parseFloat(liabilities.loansFriends)  || 0),
        loans_banks:     toUSD(parseFloat(liabilities.loansBanks)    || 0),
        income_tax:      toUSD(parseFloat(liabilities.incomeTax)     || 0),
        credit_card:     toUSD(parseFloat(liabilities.credit_card)   || 0),
        utility_arrears: toUSD(parseFloat(liabilities.utilityArrears)|| 0),
        rent_arrears:    toUSD(parseFloat(liabilities.rentArrears)   || 0),
        other_debt:      toUSD(parseFloat(liabilities.other_debt)    || 0),
      };

      const res = await axios.post(`${API_URL}/api/calculate`, {
        assets: filteredAssets,
        liabilities: filteredLiabilities,
      });
      setResult(res.data);
      setCurrentStep(9);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error calculating Zakat');
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    if (!window.confirm('Reset all values?')) return;
    setAssets({
      gold24kGrams: '', gold22kGrams: '', gold18kGrams: '', otherGold: '',
      silverGrams: '', preciousStones: '',
      cash: '', savings: '', currentAccount: '', fixedDeposits: '',
      stocks: '', receivables: '', govtBonds: '', providentFund: '',
      insurancePremiums: '', govtSecurities: '', privateFunds: '', crypto: '', other: '',
      businessStock: '', damagedStock: '', creditSalesReceivable: '',
      businessPayables: '', badDebts: '',
      investmentProperty: '',
      partnershipCapital: '', partnershipLoans: '', partnershipProfit: '', partnershipWithdrawals: '',
      agriRainFed: '', agriIrrigated: '', agriMixed: '',
      animalsValue: '', animalsCount: '',
    });
    setLiabilities({
      loansFriends: '', loansBanks: '', incomeTax: '',
      credit_card: '', utilityArrears: '', rentArrears: '', other_debt: '',
    });
    setResult(null); setError(null); setCurrentStep(1); setValidationErrors({});
  };

  const inp    = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm";
  const inpRed = "w-full px-4 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm";
  const lbl    = "block text-sm font-medium text-gray-700 mb-1";
  const hint   = "text-xs text-gray-500 mt-1";
  const autoV  = "w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg font-semibold text-gray-700 text-sm";

  const printZakat = () => {
    // fmt: display user-entered values as-is (already in user's currency)
    // conv: only for gold/silver (auto-calculated USD values) and result.* (backend USD)
    const fmt = (v) => (Number(v) || 0).toFixed(2);
    if (!result) return;
    const assetDefs = [
      ['Gold (24k)',          getGold24kValue(),          'Fully zakatable at market value. Gold is a primary zakatable asset in Islam.',          true],
      ['Gold (22k)',          getGold22kValue(),          'Zakatable at 91.67% purity rate of current gold price.',                               true],
      ['Gold (18k)',          getGold18kValue(),          'Zakatable at 75% purity rate of current gold price.',                                  true],
      ['Other Gold',         parseFloat(assets.otherGold)||0,          'Gold coins, bars etc. zakatable at full market value.'],
      ['Precious Stones',    parseFloat(assets.preciousStones)||0,     'Net market value of diamonds, rubies etc. is zakatable.'],
      ['Silver',             getSilverValue(),            'Silver is fully zakatable at current market price per gram.',                          true],
      ['Cash in Hand',       parseFloat(assets.cash)||0,              'Physical cash is zakatable at face value.'],
      ['Savings Account',    parseFloat(assets.savings)||0,           'Bank savings are fully zakatable at face value.'],
      ['Current Account',    parseFloat(assets.currentAccount)||0,    'Current account balance is zakatable at face value.'],
      ['Fixed Deposits',     parseFloat(assets.fixedDeposits)||0,     'Fixed deposits are zakatable at full value on Zakat date.'],
      ['Stocks',             parseFloat(assets.stocks)||0,            'Market value of shares including dividends is zakatable.'],
      ['Receivables',        parseFloat(assets.receivables)||0,       'Loans given to others that are expected to be recovered.'],
      ['Govt Bonds',         parseFloat(assets.govtBonds)||0,         'Government bond investments are zakatable at current value.'],
      ['Provident Fund',     parseFloat(assets.providentFund)||0,     'Provident fund contributions to date are zakatable.'],
      ['Insurance',          parseFloat(assets.insurancePremiums)||0, 'Insurance premiums including bonus accumulated to date.'],
      ['Govt Securities',    parseFloat(assets.govtSecurities)||0,    'Government security deposits and ADRs are zakatable.'],
      ['Private Funds',      parseFloat(assets.privateFunds)||0,      'Private chits and fund investments are zakatable.'],
      ['Crypto',             parseFloat(assets.crypto)||0,            'Crypto assets are zakatable at market value on Zakat date.'],
      ['Other Wealth',       parseFloat(assets.other)||0,             'Any other zakatable assets at current market value.'],
      ['Business Net',       Math.max(0,(parseFloat(assets.businessStock)||0)+(parseFloat(assets.damagedStock)||0)+(parseFloat(assets.creditSalesReceivable)||0)-(parseFloat(assets.businessPayables)||0)-(parseFloat(assets.badDebts)||0)), 'Net business value = Saleable Stock + Receivables - Payables - Bad Debts. Fixed assets like machinery are NOT zakatable.'],
      ['Investment Property',parseFloat(assets.investmentProperty)||0,'Only investment/business property is zakatable, NOT your home or personal property.'],
      ['Partnership Net',    Math.max(0,(parseFloat(assets.partnershipCapital)||0)+(parseFloat(assets.partnershipLoans)||0)+(parseFloat(assets.partnershipProfit)||0)-(parseFloat(assets.partnershipWithdrawals)||0)), 'Net = Capital + Loans to Firm + Profit - Withdrawals.'],
      ['Rain-fed Produce',   parseFloat(assets.agriRainFed)||0,       'Crops from rainwater only. Zakat = 10%. Calculated separately from standard 2.5%.'],
      ['Irrigated Produce',  parseFloat(assets.agriIrrigated)||0,     'Crops using artificial irrigation. Zakat = 5%. Calculated separately.'],
      ['Mixed Produce',      parseFloat(assets.agriMixed)||0,         'Crops using both rain and irrigation. Zakat = 7.5%. Calculated separately.'],
      ['Animals',            parseFloat(assets.animalsValue)||0,       'Zakat = 1 animal per 40. Calculated separately from standard 2.5% zakat.'],
    ];
    const assetRows = assetDefs
      .filter(([,v]) => v > 0)
      .map(([l,v,note,isUSD]) =>
        '<tr>' +
        '<td style="vertical-align:top"><strong>'+l+'</strong><br><span style="font-size:11px;color:#6b7280;font-style:italic">'+note+'</span></td>' +
        '<td style="text-align:right;vertical-align:top;font-weight:bold;white-space:nowrap">'+sym+(isUSD ? conv(v) : fmt(v))+'</td>' +
        '</tr>'
      ).join('');

    const liabRows = [
      ['Friends/Relatives Loans', parseFloat(liabilities.loansFriends)||0],
      ['Bank Loans', parseFloat(liabilities.loansBanks)||0],
      ['Income/Wealth Tax', parseFloat(liabilities.incomeTax)||0],
      ['Credit Card', parseFloat(liabilities.credit_card)||0],
      ['Utility Arrears', parseFloat(liabilities.utilityArrears)||0],
      ['Rent Arrears', parseFloat(liabilities.rentArrears)||0],
      ['Other Debts', parseFloat(liabilities.other_debt)||0],
    ].filter(([,v]) => v > 0).map(([l,v]) => '<tr><td>'+l+'</td><td style="text-align:right;color:#dc2626">'+sym+fmt(v)+'</td></tr>').join('');

    const boxBg = result.zakat_due ? '#f0fdf4' : '#fefce8';
    const boxBorder = result.zakat_due ? '#16a34a' : '#ca8a04';
    const zakatColor = result.zakat_due ? '#15803d' : '#92400e';
    const agriRow = result.agricultural_zakat > 0 ? '<tr><td>Agricultural Zakat</td><td style="text-align:right;font-weight:bold">'+sym+conv(result.agricultural_zakat)+'</td></tr>' : '';
    const animalRow = result.animal_zakat > 0 ? '<tr><td>Animal Zakat</td><td style="text-align:right;font-weight:bold">'+sym+conv(result.animal_zakat)+'</td></tr>' : '';

    const html =
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Zakat Summary</title>' +
      '<style>body{font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:30px}' +
      'h1{color:#16a34a;text-align:center}h3{color:#16a34a;border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin-top:20px}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:10px}td{padding:7px 8px;border-bottom:1px solid #f3f4f6;font-size:13px}' +
      '.note{background:#f0fdf4;padding:12px;border-radius:6px;font-size:12px}@media print{.np{display:none}}</style>' +
      '</head><body>' +
      '<h1>Zakat Calculation Summary</h1>' +
      '<p style="text-align:center;color:#666;font-size:12px;margin-bottom:15px">Date: '+new Date(result.timestamp).toLocaleDateString()+'</p>' +
      '<div style="background:'+boxBg+';border:2px solid '+boxBorder+';border-radius:8px;padding:15px;text-align:center;margin-bottom:15px">' +
      '<p style="font-weight:bold;font-size:16px;color:'+zakatColor+';margin:0 0 8px">'+(result.zakat_due?'Zakat is DUE':'Zakat NOT Obligatory')+'</p>' +
      (result.zakat_due ? '<p style="font-size:30px;font-weight:bold;color:#16a34a;margin:0">'+sym+conv(result.zakat_amount)+'</p>' : '<p style="color:#666">Net worth below Nisab</p>') +
      '</div>' +
      (assetRows ? '<h3>Assets Entered</h3><table>'+assetRows+'</table>' : '') +
      (liabRows ? '<h3>Liabilities</h3><table>'+liabRows+'</table>' : '') +
      '<h3>Summary</h3><table>' +
      '<tr><td>Total Assets</td><td style="text-align:right;font-weight:bold">'+sym+conv(result.total_assets)+'</td></tr>' +
      '<tr><td>Total Liabilities</td><td style="text-align:right;font-weight:bold;color:#dc2626">'+sym+conv(result.total_liabilities)+'</td></tr>' +
      '<tr><td>Net Zakatable Amount</td><td style="text-align:right;font-weight:bold">'+sym+conv(result.net_worth)+'</td></tr>' +
      '<tr><td>Nisab Threshold</td><td style="text-align:right;font-weight:bold">'+sym+conv(result.nisab_threshold)+'</td></tr>' +
      '</table><h3>Zakat Breakdown</h3><table>' +
      '<tr><td>Standard Zakat ('+result.zakat_rate_used+'%)</td><td style="text-align:right;font-weight:bold">'+sym+conv(result.standard_zakat)+'</td></tr>' +
      agriRow + animalRow +
      '<tr style="background:#f0fdf4"><td style="font-weight:bold;color:#16a34a">TOTAL ZAKAT PAYABLE</td><td style="text-align:right;font-weight:bold;color:#16a34a">'+sym+conv(result.zakat_amount)+'</td></tr>' +
      '</table><div class="note"><strong>Shariah Note:</strong> '+'Zakat is '+result.zakat_rate_used+'% on net zakatable wealth held for one full lunar year (Hawl). Verify with a qualified Mufti.</div>' +
      '<p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:15px">Generated by Zakat Calculator</p>' +
      '<br><button class="np" onclick="window.print()" style="width:100%;padding:12px;background:#16a34a;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;font-weight:bold">Print / Save as PDF</button>' +
      '</body></html>';

    const blob = new Blob([html], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const renderStep = () => {
    switch (currentStep) {

      case 1: return (
        <div className="space-y-5">
          {/* Currency */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-blue-800 mb-2">🌍 Select Currency</label>
            <select value={currency.code} onChange={e => setCurrency(CURRENCIES.find(c => c.code === e.target.value))}
              className="px-4 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-400">
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          {/* Nisab */}
          {nisab && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="text-sm font-semibold text-green-800 mb-1">📊 Current Nisab Threshold</p>
              <p className="text-xs text-gray-700">
                Gold: <strong>{sym}{conv(nisab.nisab_gold)}</strong> &nbsp;|&nbsp;
                Silver: <strong>{sym}{conv(nisab.nisab_silver)}</strong> &nbsp;|&nbsp;
                Recommended: <strong className="text-green-700">{sym}{conv(nisab.recommended_threshold)}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">Gold: {sym}{conv(nisab.gold_price_per_gram)}/gram | Silver: {sym}{conv(nisab.silver_price_per_gram)}/gram</p>
            </div>
          )}
          {/* 24k */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <h4 className="font-semibold text-gray-800 mb-3">🪙 24 Carat Gold/Jewelry</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Weight in Grams</label>
                <input type="number" name="gold24kGrams" value={assets.gold24kGrams} onChange={handleA} onKeyDown={blockInvalid} placeholder="0" step="0.01" className={inp} />
                {errMsg('gold24kGrams')}</div>
              <div><label className={lbl}>Estimated Value (Auto)</label>
                <div className={autoV}>{sym}{conv(getGold24kValue())}</div>
                {nisab && <p className={hint}>@ {sym}{conv(nisab.gold_price_per_gram)}/gram × 100%</p>}</div>
            </div>
          </div>
          {/* 22k */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <h4 className="font-semibold text-gray-800 mb-3">🪙 22 Carat Gold <span className="text-xs text-gray-500">(91.67% pure)</span></h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Weight in Grams</label>
                <input type="number" name="gold22kGrams" value={assets.gold22kGrams} onChange={handleA} onKeyDown={blockInvalid} placeholder="0" step="0.01" className={inp} />
                {errMsg('gold22kGrams')}</div>
              <div><label className={lbl}>Estimated Value (Auto)</label>
                <div className={autoV}>{sym}{conv(getGold22kValue())}</div>
                {nisab && <p className={hint}>@ {sym}{conv(nisab.gold_price_per_gram * 0.9167)}/gram</p>}</div>
            </div>
          </div>
          {/* 18k */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <h4 className="font-semibold text-gray-800 mb-3">🪙 18 Carat Gold <span className="text-xs text-gray-500">(75% pure)</span></h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Weight in Grams</label>
                <input type="number" name="gold18kGrams" value={assets.gold18kGrams} onChange={handleA} onKeyDown={blockInvalid} placeholder="0" step="0.01" className={inp} />
                {errMsg('gold18kGrams')}</div>
              <div><label className={lbl}>Estimated Value (Auto)</label>
                <div className={autoV}>{sym}{conv(getGold18kValue())}</div>
                {nisab && <p className={hint}>@ {sym}{conv(nisab.gold_price_per_gram * 0.75)}/gram</p>}</div>
            </div>
          </div>
          {/* Other gold */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>🪙 Other Gold Valuables ({sym})</label>
            <input type="number" name="otherGold" value={assets.otherGold} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('otherGold')}
            <p className={hint}>Gold coins, bars, etc. — enter market value directly</p>
          </div>
          {/* Precious stones */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>💎 Precious Stones — Net Market Value ({sym})</label>
            <input type="number" name="preciousStones" value={assets.preciousStones} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('preciousStones')}
            <p className={hint}>Diamonds, rubies, etc. (Excel row 12)</p>
          </div>
          {/* Silver */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <h4 className="font-semibold text-gray-800 mb-3">🥈 Silver</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Weight in Grams</label>
                <input type="number" name="silverGrams" value={assets.silverGrams} onChange={handleA} onKeyDown={blockInvalid} placeholder="0" step="0.01" className={inp} />
                {errMsg('silverGrams')}
                <p className={hint}>Utensils, artifacts, jewelry. Utensils ≈ 90% pure</p></div>
              <div><label className={lbl}>Estimated Value (Auto)</label>
                <div className={autoV}>{sym}{conv(getSilverValue())}</div>
                {nisab && <p className={hint}>@ {sym}{conv(nisab.silver_price_per_gram)}/gram</p>}</div>
            </div>
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            📌 All cash and bank balances are fully zakatable at face value (Excel rows 18-21)
          </div>
          {[
            { name: 'cash',           label: 'Cash in Hand',    hint: 'Physical cash at home/office (Excel row 18)' },
            { name: 'savings',        label: 'Savings Account', hint: 'Savings bank account balance (Excel row 19)' },
            { name: 'currentAccount', label: 'Current Account', hint: 'Current bank account balance (Excel row 20)' },
            { name: 'fixedDeposits',  label: 'Fixed Deposits',  hint: 'Fixed deposit accounts (Excel row 21)' },
          ].map(f => (
            <div key={f.name} className="bg-white rounded-lg shadow-sm border p-5">
              <label className={lbl}>{f.label} ({sym})</label>
              <input type="number" name={f.name} value={assets[f.name] || ''} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
              {errMsg(f.name)}
              <p className={hint}>{f.hint}</p>
            </div>
          ))}
        </div>
      );

      case 3: return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            📌 All investments zakatable at market value on calculation date (Excel rows 23-30)
          </div>
          {[
            { name: 'stocks',            label: 'Stocks / Shares',               hint: 'Market value including dividends (Excel row 27)' },
            { name: 'receivables',       label: 'Loans Receivable',              hint: 'Loans given to friends/relatives — exclude bad debts (Excel row 23) — ⚠️ Do not re-enter in Business Credit Sales (Step 4)' },
            { name: 'govtBonds',         label: 'Government Bonds',              hint: 'Investment in govt bonds (Excel row 24)' },
            { name: 'providentFund',     label: 'Provident Fund',                hint: 'Contribution to date (Excel row 25)' },
            { name: 'insurancePremiums', label: 'Insurance Premiums',            hint: 'Premiums including bonus to date (Excel row 26)' },
            { name: 'govtSecurities',    label: 'Government Securities / ADRs',  hint: 'Govt security deposits (Excel row 28)' },
            { name: 'privateFunds',      label: 'Private Funds / Chits',         hint: 'Investment in private chits/funds (Excel row 29)' },
            { name: 'crypto',            label: 'Crypto Assets',                 hint: 'At market value on calculation date' },
            { name: 'other',             label: 'Other Sources of Wealth',       hint: 'Any other zakatable assets (Excel row 30) — ⚠️ Do not re-enter gold, silver or cash already entered in Steps 1-2' },
          ].map(f => (
            <div key={f.name} className="bg-white rounded-lg shadow-sm border p-5">
              <label className={lbl}>{f.label} ({sym})</label>
              <input type="number" name={f.name} value={assets[f.name] || ''} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
              {errMsg(f.name)}
              <p className={hint}>{f.hint}</p>
            </div>
          ))}
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
📌 Formula (Excel rows 35-39): <strong>Net = Saleable Stock + Damaged Stock + Credit Receivables − Payables − Bad Debts</strong> <br/>⚠️ Do not re-enter gold or silver already entered in Step 1          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>✅ Saleable Stock ({sym})</label>
            <input type="number" name="businessStock" value={assets.businessStock} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('businessStock')}
            <p className={hint}>Inventory that can be sold — NOT fixed assets like machinery (Excel row 35)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>✅ Damaged / Dead Stock ({sym})</label>
            <input type="number" name="damagedStock" value={assets.damagedStock} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('damagedStock')}
            <p className={hint}>Damaged or unsellable stock at current value (Excel row 36)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>✅ Credit Sales Receivable ({sym})</label>
            <input type="number" name="creditSalesReceivable" value={assets.creditSalesReceivable} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('creditSalesReceivable')}
            <p className={hint}>Money owed from credit sales (Excel row 37)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>🔴 LESS: Payables to Suppliers ({sym})</label>
            <input type="number" name="businessPayables" value={assets.businessPayables} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inpRed} />
            {errMsg('businessPayables')}
            <p className={hint}>Credit taken from suppliers — DEDUCTED (Excel row 38)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>🔴 LESS: Bad Debts ({sym})</label>
            <input type="number" name="badDebts" value={assets.badDebts} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inpRed} />
            {errMsg('badDebts')}
            <p className={hint}>Doubtful/uncollectable receivables — DEDUCTED (Excel row 39)</p>
          </div>
          <div className="bg-green-50 border border-green-300 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800">📊 Business Net Value:</p>
            <p className="text-xl font-bold text-green-700 mt-1">
              {sym}{dispVal(Math.max(0,
                (parseFloat(assets.businessStock) || 0) +
                (parseFloat(assets.damagedStock) || 0) +
                (parseFloat(assets.creditSalesReceivable) || 0) -
                (parseFloat(assets.businessPayables) || 0) -
                (parseFloat(assets.badDebts) || 0)
              ))}
            </p>
          </div>
        </div>
      );

      case 5: return (
        <div className="space-y-5">
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <h4 className="font-semibold text-gray-800 mb-3">🏠 Investment Property</h4>
            <label className={lbl}>Current Market Value ({sym})</label>
            <input type="number" name="investmentProperty" value={assets.investmentProperty} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('investmentProperty')}
            <p className={hint}>ONLY investment/business property — NOT your home, car, or personal items (Excel row 33)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <h4 className="font-semibold text-gray-800 mb-3">🤝 Partnership Firm Assets</h4>
            <div className="bg-blue-50 rounded p-2 text-xs text-blue-700 mb-3">
              📌 Net = Capital + Loans to Firm + Profit − Withdrawals (Excel rows 42-45)
            </div>
            {[
              { name: 'partnershipCapital',     label: '✅ Capital Balance',        hint: 'As per last balance sheet (Excel row 42)', red: false },
              { name: 'partnershipLoans',       label: '✅ Loans Advanced to Firm', hint: 'Loans you gave to the firm (Excel row 43)', red: false },
              { name: 'partnershipProfit',      label: '✅ Accumulated Profit',     hint: 'Estimated profit to date (Excel row 45)', red: false },
              { name: 'partnershipWithdrawals', label: '🔴 LESS: Withdrawals',      hint: 'Withdrawals during current year — deducted (Excel row 44)', red: true },
            ].map(f => (
              <div key={f.name} className="mb-3">
                <label className={lbl}>{f.label} ({sym})</label>
                <input type="number" name={f.name} value={assets[f.name]} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" min="0" className={f.red ? inpRed : inp} />
                {errMsg(f.name)}
                <p className={hint}>{f.hint}</p>
              </div>
            ))}
            <div className="bg-green-50 border border-green-300 rounded-lg p-3">
              <p className="text-sm font-semibold text-green-800">Partnership Net Value:</p>
              <p className="text-lg font-bold text-green-700">
                {sym}{dispVal(Math.max(0,
                  (parseFloat(assets.partnershipCapital) || 0) +
                  (parseFloat(assets.partnershipLoans) || 0) +
                  (parseFloat(assets.partnershipProfit) || 0) -
                  (parseFloat(assets.partnershipWithdrawals) || 0)
                ))}
              </p>
            </div>
          </div>
        </div>
      );

      case 6: return (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-xs text-yellow-800">
            📌 Agricultural Zakat is calculated SEPARATELY — different rates per irrigation type (Excel rows 49-51)
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>🌧️ Rain-fed Produce Value ({sym})</label>
            <input type="number" name="agriRainFed" value={assets.agriRainFed} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('agriRainFed')}
            <p className={hint}>Crops from rain water only → Zakat = <strong>{formulaRates.agri_rain_rate}%</strong> (Excel row 49)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>🚿 Irrigated Produce Value ({sym})</label>
            <input type="number" name="agriIrrigated" value={assets.agriIrrigated} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('agriIrrigated')}
            <p className={hint}>Canal, tank, borewell irrigation → Zakat = <strong>{formulaRates.agri_irrigated_rate}%</strong> (Excel row 50)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>🌦️ Mixed Produce Value ({sym})</label>
            <input type="number" name="agriMixed" value={assets.agriMixed} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('agriMixed')}
            <p className={hint}>Partially rain + partially irrigated → Zakat = <strong>{formulaRates.agri_mixed_rate}%</strong> (Excel row 51)</p>
          </div>
          {(parseFloat(assets.agriRainFed) > 0 || parseFloat(assets.agriIrrigated) > 0 || parseFloat(assets.agriMixed) > 0) && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-800">🌾 Agricultural Zakat Preview:</p>
              <p className="text-xl font-bold text-green-700 mt-1">
                {sym}{dispVal((parseFloat(assets.agriRainFed)||0)*(formulaRates.agri_rain_rate/100) + (parseFloat(assets.agriIrrigated)||0)*(formulaRates.agri_irrigated_rate/100) + (parseFloat(assets.agriMixed)||0)*(formulaRates.agri_mixed_rate/100))}
              </p>
              <div className="text-xs text-gray-600 mt-1 space-y-1">
                {parseFloat(assets.agriRainFed) > 0 && <p>Rain-fed: {sym}{dispVal((parseFloat(assets.agriRainFed)||0)*(formulaRates.agri_rain_rate/100))} ({formulaRates.agri_rain_rate}%)</p>}
                {parseFloat(assets.agriIrrigated) > 0 && <p>Irrigated: {sym}{dispVal((parseFloat(assets.agriIrrigated)||0)*(formulaRates.agri_irrigated_rate/100))} ({formulaRates.agri_irrigated_rate}%)</p>}
                {parseFloat(assets.agriMixed) > 0 && <p>Mixed: {sym}{dispVal((parseFloat(assets.agriMixed)||0)*(formulaRates.agri_mixed_rate/100))} ({formulaRates.agri_mixed_rate}%)</p>}
              </div>
            </div>
          )}
        </div>
      );

      case 7: return (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-xs text-yellow-800">
            📌 Only animals/birds over 6 months old. Zakat = 1 animal per {formulaRates.animal_per} in kind or value (Excel row 54)
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>Total Number of Animals</label>
            <input type="number" name="animalsCount" value={assets.animalsCount} onChange={handleA} onKeyDown={blockInvalidInt} placeholder="0" step="1" className={inp} />
            {errMsg('animalsCount')}
            <p className={hint}>Count of animals/birds/fish over 6 months old</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <label className={lbl}>Total Value of Animals ({sym})</label>
            <input type="number" name="animalsValue" value={assets.animalsValue} onChange={handleA} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inp} />
            {errMsg('animalsValue')}
            <p className={hint}>Combined market value of all animals</p>
          </div>
          {parseFloat(assets.animalsCount) >= (formulaRates.animal_per || 40) && parseFloat(assets.animalsValue) > 0 && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-800">🐄 Animal Zakat Preview:</p>
              <p className="text-xl font-bold text-green-700 mt-1">
                {sym}{dispVal(Math.floor((parseFloat(assets.animalsCount)||0)/(formulaRates.animal_per||40)) * ((parseFloat(assets.animalsValue)||0)/(parseFloat(assets.animalsCount)||1)))}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {Math.floor((parseFloat(assets.animalsCount)||0)/(formulaRates.animal_per||40))} group(s) of {formulaRates.animal_per} × {sym}{dispVal((parseFloat(assets.animalsValue)||0)/(parseFloat(assets.animalsCount)||1))} /animal
              </p>
            </div>
          )}
          {parseFloat(assets.animalsCount) > 0 && parseFloat(assets.animalsCount) < (formulaRates.animal_per || 40) && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-xs text-yellow-800">
              ⚠️ Less than 40 animals — no animal Zakat due on this category
            </div>
          )}
        </div>
      );

      case 8: return (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
            📌 Deduct only immediate debts due on Zakat date. Long-term loans: deduct 1-year portion only
          </div>
          {[
            { name: 'loansFriends',   label: 'Loans from Friends / Relatives', hint: 'Excel row 55' },
            { name: 'loansBanks',     label: 'Loans from Banks / Institutions', hint: 'Excel row 56' },
            { name: 'incomeTax',      label: 'Income Tax / Wealth Tax Payable', hint: 'Tax due on Zakat date (Excel row 57)' },
            { name: 'credit_card',    label: 'Credit Card Debt',               hint: 'Outstanding credit card balance' },
            { name: 'utilityArrears', label: 'Utility Arrears',                hint: 'Overdue electricity, gas, water bills (BCR requirement)' },
            { name: 'rentArrears',    label: 'Rent Arrears',                   hint: 'Overdue rent payments (BCR requirement)' },
            { name: 'other_debt',     label: 'Other Debts',                    hint: 'Any other immediate payables' },
          ].map(f => (
            <div key={f.name} className="bg-white rounded-lg shadow-sm border p-5">
              <label className={lbl}>{f.label} ({sym})</label>
              <input type="number" name={f.name} value={liabilities[f.name] || ''} onChange={handleL} onKeyDown={blockInvalid} placeholder="0.00" step="0.01" className={inpRed} />
              {errMsg(f.name)}
              <p className={hint}>{f.hint}</p>
            </div>
          ))}
        </div>
      );

      case 9: return (
        <div className="space-y-4">
          {!result && !loading && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-5xl mb-3">🕌</p>
              <p>Go back to Step 8 and click Calculate Zakat</p>
            </div>
          )}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin text-5xl mb-3">⏳</div>
              <p className="text-gray-600">Calculating your Zakat...</p>
            </div>
          )}
          {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded"><p className="text-red-700">❌ {error}</p></div>}
          {result && (
            <div className="space-y-4">
              {/* Main result */}
              <div className={`rounded-xl p-6 text-center border-2 ${result.zakat_due ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-400'}`}>
                {result.zakat_due ? (
                  <>
                    <p className="text-lg font-bold text-green-800 mb-1">✅ Zakat is DUE</p>
                    <p className="text-4xl font-bold text-green-700">{sym}{conv(result.zakat_amount)}</p>
                    <p className="text-sm text-gray-600 mt-2">Total Zakat Payable</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-yellow-800">⚠️ Zakat is NOT Obligatory</p>
                    <p className="text-sm text-gray-700 mt-2">Your net worth ({sym}{conv(result.net_worth)}) is below Nisab ({sym}{conv(result.nisab_threshold)})</p>
                    <p className="text-xs text-gray-500 mt-1">You are not required to pay Zakat this year. May Allah increase your wealth. Ameen.</p>
                  </>
                )}
              </div>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Assets',      value: result.total_assets,      color: 'green' },
                  { label: 'Total Liabilities', value: result.total_liabilities, color: 'red' },
                  { label: 'Net Worth',         value: result.net_worth,         color: 'blue' },
                  { label: 'Nisab Threshold',   value: result.nisab_threshold,   color: 'purple' },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-lg shadow-sm border p-4">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className={`text-xl font-bold text-${item.color}-700`}>{sym}{conv(item.value)}</p>
                  </div>
                ))}
              </div>
              {/* Breakdown */}
              {result.zakat_due && (
                <div className="bg-white rounded-lg shadow-sm border p-5">
                  <h4 className="font-semibold text-gray-800 mb-3">📊 Zakat Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                       <span className="text-gray-600">💰 Standard Zakat ({result.zakat_rate_used}%)</span>                      <span className="font-semibold">{sym}{conv(result.standard_zakat)}</span>
                    </div>
                    {result.agricultural_zakat > 0 && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">🌾 Agricultural Zakat</span>
                        <span className="font-semibold">{sym}{conv(result.agricultural_zakat)}</span>
                      </div>
                    )}
                    {result.animal_zakat > 0 && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">🐄 Animal Zakat</span>
                        <span className="font-semibold">{sym}{conv(result.animal_zakat)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 font-bold text-green-700 text-base">
                      <span>Total Zakat Payable</span>
                      <span>{sym}{conv(result.zakat_amount)}</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Shariah note */}
              <div className="bg-gray-50 border rounded-lg p-4 text-xs text-gray-600">
                <p className="font-semibold mb-1">📖 Shariah Note:</p>
                <p>Zakat is {result.zakat_rate_used}% on net zakatable wealth held for one full lunar year (Hawl). Agricultural and animal Zakat have separate rates per Shariah. Please verify with a qualified Mufti for your specific situation.</p>
              </div>
              <p className="text-xs text-center text-gray-400">Calculated on {new Date(result.timestamp).toLocaleString()}</p>
              <button onClick={printZakat} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition">Download PDF / Print Summary</button>
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  const isLastStep   = currentStep === 8;
  const isResultStep = currentStep === 9;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h2 className="text-3xl font-bold text-green-700 mb-6 text-center">🕌 Calculate Your Zakat</h2>

      {/* Progress bar */}
      {!isResultStep && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            {STEPS.slice(0, 8).map((step) => (
              <button key={step.id} onClick={() => setCurrentStep(step.id)}
                className={`flex flex-col items-center transition-all ${currentStep === step.id ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  ${currentStep === step.id ? 'bg-green-600 text-white ring-2 ring-green-300' :
                    currentStep > step.id ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-500'}`}>
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                <span className="text-xs mt-1 truncate w-20 text-center">{step.title}</span>
              </button>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep - 1) / 7) * 100}%` }} />
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Step {currentStep} of 8 — <strong>{STEPS[currentStep - 1]?.title}</strong>
          </p>
        </div>
      )}

      {/* Content */}
      <div className="mb-6">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentStep > 1 && (
          <button onClick={() => setCurrentStep(s => s - 1)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition">
            ← Back
          </button>
        )}
        <button onClick={resetForm}
          className="bg-red-100 hover:bg-red-200 text-red-600 font-semibold py-3 px-4 rounded-lg transition">
          🗑️
        </button>
        {!isResultStep && (
          isLastStep ? (
            <button onClick={calculateZakat} disabled={loading || hasErrors}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:bg-gray-400">
              {loading ? '⏳ Calculating...' : '🕌 Calculate Zakat'}
            </button>
          ) : (
            <button onClick={() => setCurrentStep(s => s + 1)} disabled={hasErrors}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:bg-gray-400">
              Next →
            </button>
          )
        )}
        {isResultStep && (
          <button onClick={() => { setCurrentStep(1); setResult(null); }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition">
            🔄 New Calculation
          </button>
        )}
      </div>
    </div>
  );
}

export default Calculator;
