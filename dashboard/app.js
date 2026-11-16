(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;

  var WL = new Set('armitage-by-wintermute,axis,b14g,bittensor-dtao,clearstar,curvance,doppler-finance,ember,firelight,galaxy-curation,gami-labs,gauntlet,hive-protocol,hyperithm,infinifi,k3-capital,keyrock,lagoon,lightning-network,lofty,mezo-earn,noble,nonce-capital,onre,opentrade,plume-vaults,r25,reti-pooling,rockawayx,saturn,steakhouse-financial,symbiotic,tori-finance,tulipa-capital,tydro,upshift,usdd,valos,veda,yuzu-money'.split(','));

  var state = {
    q: '',
    category: 'all',
    chain: 'all',
    watchlistOnly: false,
    tab: 'radar',
    sortCol: 'rank',
    sortAsc: true,
    selectedSlug: null,
    showMethodology: false
  };

  var timer = null;

  var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
  var allChains = [];
  DATA.rows.forEach(function (r) {
    if (r.chains) r.chains.forEach(function (c) { if (allChains.indexOf(c) === -1) allChains.push(c); });
  });
  allChains.sort();

  function fmtUsd(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return 'n/a';
    var abs = Math.abs(n);
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return '$' + Math.round(n / 1e3).toLocaleString() + 'K';
    return '$' + Math.round(n).toLocaleString();
  }

  function fmtPct(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return 'n/a';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function fmtAge(d) {
    if (d === null || d === undefined) return 'unknown';
    if (d >= 365) return (d / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(d)) + 'd';
  }

  function el(t, a, c) {
    var n = document.createElement(t);
    if (a) {
      for (var k in a) {
        if (k === 'class') n.className = a[k];
        else if (k === 'text') n.textContent = a[k];
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), a[k]);
        else if (a[k] != null) n.setAttribute(k, a[k]);
      }
    }
    if (c) {
      if (Array.isArray(c)) {
        for (var i = 0; i < c.length; i++) {
          if (c[i] != null) n.appendChild(typeof c[i] === 'string' ? document.createTextNode(c[i]) : c[i]);
        }
      } else {
        n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return n;
  }

  function capitalFor(tvl) {
    if (tvl >= 5e9) return 250;
    if (tvl >= 1e9) return 150;
    if (tvl >= 1e8) return 100;
    return 50;
  }

  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }

  function chainOf(p) {
    return p.chains && p.chains.length > 0 ? p.chains[0] : 'its primary network';
  }

  function categoryRisk(p) {
    var c = (p.category || '').toLowerCase();
    if (/lend|cdp|collat/.test(c)) return 'collateral liquidation and oracle latency';
    if (/dex|yield|farm|liquidit/.test(c)) return 'impermanent loss and pool slippage';
    if (/bridge/.test(c)) return 'cross-chain bridge relay and message finality';
    if (/stak/.test(c)) return 'validator slashing and unbonding delay';
    if (/deriv|perp|opt|basis/.test(c)) return 'margin liquidation and counterparty volatility';
    if (/predict/.test(c)) return 'oracle resolution disputes and market settlement';
    if (/curat|alloc/.test(c)) return 'vault rebalancing drawdown and manager';
    if (/stable/.test(c)) return 'collateral depeg and redemption spread';
    if (/rwa/.test(c)) return 'asset attestation and offchain issuer';
    if (/insur/.test(c)) return 'underwriting capital lockup and claim shortfall';
    return 'smart contract vulnerability and protocol integration';
  }

  function weeklyActionFor(p) {
    var c = (p.category || '').toLowerCase();
    if (/lend|cdp|collat/.test(c)) return 'rebalance collateral, accrue borrow interest or claim lending points';
    if (/dex|yield|farm|liquidit/.test(c)) return 'rebalance LP price bounds, compound fee revenue or harvest yield';
    if (/bridge/.test(c)) return 'route a test volume transfer or verify cross-chain message proofs';
    if (/stak/.test(c)) return 'claim staking yield, compound receipt tokens or re-delegate votes';
    if (/deriv|perp|opt|basis/.test(c)) return 'roll open hedge positions, adjust margin levels or record a small trade';
    if (/predict/.test(c)) return 'place a prediction trade, claim settled outcome shares or update market votes';
    if (/curat|alloc/.test(c)) return 'reinvest strategy yield, review vault allocations or cast curator votes';
    if (/stable/.test(c)) return 'mint or redeem stability pool tokens and record stability adjustments';
    if (/rwa/.test(c)) return 'rebalance tokenized pool units or claim onchain yield distributions';
    if (/insur/.test(c)) return 'inspect coverage pool reserves or renew policy risk tranches';
    return 'execute a qualifying protocol transaction, harvest rewards or submit a governance signal';
  }

  function exitActionFor(p) {
    var c = (p.category || '').toLowerCase();
    if (/lend|cdp|collat/.test(c)) return 'repay outstanding debt obligations and withdraw supplied collateral';
    if (/dex|yield|farm|liquidit/.test(c)) return 'remove pool liquidity, burn LP shares and claim all trading fee yields';
    if (/bridge/.test(c)) return 'verify cross-chain transaction completions, claim destination funds and bridge assets back';
    if (/stak/.test(c)) return 'unstake locked assets, observe unbonding cooldowns and redeem native tokens';
    if (/deriv|perp|opt|basis/.test(c)) return 'close open perpetual or hedging positions and withdraw account margin';
    if (/predict/.test(c)) return 'settle active predictions, redeem market payout balances and claim rewards';
    if (/curat|alloc/.test(c)) return 'exit vault strategies, redeem allocator shares and withdraw base deposits';
    if (/stable/.test(c)) return 'redeem stablecoins against issuer reserves and withdraw underlying collateral';
    if (/rwa/.test(c)) return 'liquidate tokenized pool positions and withdraw verified RWA proceeds';
    if (/insur/.test(c)) return 'withdraw risk underwriting capital and redeem policy shares';
    return 'redeem all deposited capital, settle outstanding protocol balances and claim rewards';
  }

  function actionFor(p, cap, ch) {
    var c = (p.category || '').toLowerCase(), n = p.name;
    if (/lend|cdp|collat/.test(c)) return 'Supply $' + cap + ' in USDC or primary collateral on ' + n + ' (' + ch + ') and keep the health factor comfortably above liquidation.';
    if (/dex|yield|farm|liquidit/.test(c)) return 'Deposit $' + cap + ' of liquidity into ' + n + "\x27s core pool on " + ch + ' and maintain active LP range.';
    if (/bridge/.test(c)) return 'Route $' + cap + ' in stablecoins across ' + ch + ' via ' + n + ' and interact with an ecosystem dapp.';
    if (/stak/.test(c)) return 'Stake $' + cap + ' of native assets through ' + n + ' on ' + ch + ' and hold the yield-bearing receipt token.';
    if (/deriv|perp|opt|basis/.test(c)) return 'Deposit $' + cap + ' of collateral into ' + n + ' on ' + ch + ' and maintain a low-leverage hedging position.';
    if (/predict/.test(c)) return 'Allocate $' + cap + ' into an active prediction market contract on ' + n + ' to register protocol participation.';
    if (/curat|alloc/.test(c)) return 'Allocate $' + cap + ' into a verified ' + n + ' vault strategy on ' + ch + ' and hold vault shares.';
    if (/stable/.test(c)) return 'Mint or provide $' + cap + ' of stablecoin liquidity through ' + n + ' on ' + ch + ' and retain custody.';
    if (/rwa/.test(c)) return 'Deposit $' + cap + ' into ' + n + "\x27s tokenized real-world asset pool on " + ch + ' and accrue onchain yield.';
    if (/insur/.test(c)) return 'Underwrite or purchase $' + cap + ' in protocol risk coverage via ' + n + ' on ' + ch + ' and retain policy proof.';
    return 'Deposit $' + cap + ' of assets into ' + n + "\x27s verified protocol smart contracts on " + ch + ' and hold position.';
  }

  function getFarmSteps(p) {
    var ch = chainOf(p), cap = capitalFor(p.tvl_usd), h = holdDaysFor(p.age_days), gas = cap >= 150 ? 8 : 4;
    return [
      { n: 1, text: 'Generate a dedicated, isolated airdrop wallet on ' + ch + ' funded with native gas to interact with ' + p.name + ', isolating ' + categoryRisk(p) + ' risk from primary holdings.', cost: 'approx $2-3 gas for initial funding', time: '5 minutes' },
      { n: 2, text: actionFor(p, cap, ch), cost: '$' + cap + ' capital plus approx $' + gas + ' gas', time: '15 minutes setup' },
      { n: 3, text: 'Execute weekly onchain interactions on ' + ch + ' (' + weeklyActionFor(p) + ') to establish consistent organic usage on ' + p.name + '.', cost: 'approx $1-2 in network gas weekly', time: '5-10 minutes weekly' },
      { n: 4, text: 'Maintain active capital deployed for at least ' + h + ' days across multiple snapshot cutoff dates.', cost: '$' + cap + ' capital stays locked', time: h + ' days duration' },
      { n: 5, text: "Monitor points and eligibility strictly through " + p.name + "'s verified official domain on " + ch + " and bookmark authentic portal links.", cost: 'zero additional cost', time: '5 minutes' },
      { n: 6, text: 'Log all transaction hashes, ' + exitActionFor(p) + ' from ' + p.name + ' on ' + ch + ', and revoke all smart contract allowances.', cost: 'standard network fee to withdraw and revoke', time: '10 minutes' }
    ];
  }

  function getFilteredRows() {
    var q = state.q.toLowerCase().trim();
    return DATA.rows.filter(function (r) {
      if (state.watchlistOnly && !WL.has(r.slug)) return false;
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (!r.chains || r.chains.indexOf(state.chain) === -1)) return false;
      if (q) {
        var m = r.name.toLowerCase().indexOf(q) >= 0 || r.slug.toLowerCase().indexOf(q) >= 0 || (r.category || '').toLowerCase().indexOf(q) >= 0 || (r.chains && r.chains.some(function (c) { return c.toLowerCase().indexOf(q) >= 0; }));
        if (!m) return false;
      }
      return true;
    });
  }

  function sortRows(list) {
    var dir = state.sortAsc ? 1 : -1, c = state.sortCol;
    return list.slice().sort(function (a, b) {
      if (c === 'name') return a.name.localeCompare(b.name) * dir;
      if (c === 'category') return (a.category || '').localeCompare(b.category || '') * dir;
      if (c === 'tvl') return (a.tvl_usd - b.tvl_usd) * dir;
      if (c === 'change') return ((a.change_7d === null ? -9999 : a.change_7d) - (b.change_7d === null ? -9999 : b.change_7d)) * dir;
      if (c === 'age') return ((a.age_days === null ? -1 : a.age_days) - (b.age_days === null ? -1 : b.age_days)) * dir;
      if (c === 'implied') return (a.implied_value_usd - b.implied_value_usd) * dir;
      return (a.rank - b.rank) * dir;
    });
  }

  function setSort(col) {
    if (state.sortCol === col) state.sortAsc = !state.sortAsc;
    else { state.sortCol = col; state.sortAsc = col === 'rank' || col === 'name'; }
    render();
  }

  function copyText(str, btn) {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(function () {
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy Step'; }, 1500);
      });
    }
  }

  function renderHeader() {
    var covered = DATA.rows.filter(function (r) { return WL.has(r.slug); }).length;
    var stats = [
      ['Watchlist Coverage', covered + ' / ' + DATA.watchlist_size, '100% coverage guaranteed'],
      ['Scored Rows', String(DATA.board_size), DATA.early_size + ' early pre-token'],
      ['Live Peers', String(DATA.live_size), 'Market multiple comps'],
      ['Valuation Engine', 'Model v2', 'Empirical comps']
    ];
    return el('header', {class: 'radar-header'}, [
      el('div', {class: 'header-top'}, [
        el('div', {class: 'brand-group'}, [
          el('div', {class: 'live-dot', 'aria-hidden': 'true'}),
          el('h1', {class: 'brand-title', text: 'Token Launch Radar'}),
          el('span', {class: 'badge-version', text: DATA.model_version.toUpperCase()})
        ]),
        el('div', {class: 'header-meta', text: 'As-Of: ' + DATA.as_of + ' · Floor: ' + fmtUsd(DATA.floor_usd)})
      ]),
      el('div', {class: 'stats-grid'}, stats.map(function (s) {
        return el('div', {class: 'stat-card'}, [
          el('span', {class: 'stat-label', text: s[0]}),
          el('span', {class: 'stat-value', text: s[1]}),
          el('span', {class: 'stat-sub', text: s[2]})
        ]);
      }))
    ]);
  }

  function renderNav() {
    return el('div', {class: 'nav-row'}, [
      el('div', {class: 'tab-group', role: 'tablist'}, [
        el('button', {
          type: 'button',
          class: 'tab-btn' + (state.tab === 'radar' ? ' active' : ''),
          text: 'Pre-Token Radar (' + DATA.board_size + ')',
          onclick: function () { state.tab = 'radar'; render(); }
        }),
        el('button', {
          type: 'button',
          class: 'tab-btn' + (state.tab === 'live' ? ' active' : ''),
          text: 'Live Peers Comps (' + DATA.live_size + ')',
          onclick: function () { state.tab = 'live'; render(); }
        })
      ]),
      el('button', {
        type: 'button',
        class: 'drawer-toggle-btn',
        text: (state.showMethodology ? 'Hide' : 'View') + ' Methodology',
        onclick: function () { state.showMethodology = !state.showMethodology; render(); }
      })
    ]);
  }

  function renderMethodology() {
    var m = DATA.model;
    var params = [
      ['Sublinear Exponent', String(m.exponent || 0.85)],
      ['Bayesian Shrinkage k', String(m.shrinkage_k || 4)],
      ['Global Median Comps', String(m.global_median || 0.2138)],
      ['Category Clamps', '[' + m.clamp_lower + ', ' + m.clamp_upper + ']'],
      ['Growth Clamp', '[' + m.growth_floor + '%, ' + m.growth_cap + '%]'],
      ['Growth Weight', String(m.growth_weight)],
      ['Maturity Days', m.maturity_days + 'd'],
      ['Unknown Age', m.unknown_age_days + 'd'],
      ['Discount 7d', String(m.confidence_discount_growth)],
      ['Discount Listed', String(m.confidence_discount_listed)]
    ];
    return el('section', {class: 'methodology-panel', hidden: state.showMethodology ? null : ''}, [
      el('h3', {text: 'Model v2 Valuation Methodology'}),
      el('p', {text: 'Values pre-token protocols via Bayesian comps, sublinear TVL (0.85), clamped momentum, log maturity, and completeness discounts.'}),
      el('div', {class: 'formula-block', text: 'ImpliedValue = max(1, round( 1e6 * (TVL / 1e6)^0.85 * M_category * Mult_growth * Mult_maturity * Discount_confidence ))'}),
      el('div', {class: 'params-grid'}, params.map(function (p) {
        return el('div', {class: 'param-box'}, [el('span', {class: 'param-name', text: p[0]}), el('span', {class: 'param-val', text: p[1]})]);
      }))
    ]);
  }

  function sel(lbl, cur, list, fn) {
    return el('select', {class: 'filter-select', 'aria-label': lbl, onchange: fn},
      [el('option', {value: 'all', text: lbl})].concat(list.map(function (v) {
        return el('option', {value: v, text: v, selected: v === cur ? 'selected' : null});
      }))
    );
  }

  function renderFilterBar(matchCount) {
    var searchInput = el('input', {
      type: 'search',
      class: 'filter-input',
      placeholder: 'Search name, category, chain...',
      value: state.q,
      'aria-label': 'Search table',
      oninput: function (e) {
        var v = e.target.value;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () { state.q = v; render(); }, 120);
      }
    });

    return el('div', {class: 'filter-bar'}, [
      el('div', {class: 'filter-field'}, [el('label', {text: 'Search'}), searchInput]),
      el('div', {class: 'filter-field'}, [el('label', {text: 'Category'}), sel('All Categories', state.category, categories, function(e){ state.category = e.target.value; render(); })]),
      el('div', {class: 'filter-field'}, [el('label', {text: 'Primary Chain'}), sel('All Chains', state.chain, allChains, function(e){ state.chain = e.target.value; render(); })]),
      el('button', {
        type: 'button',
        class: 'filter-toggle-btn' + (state.watchlistOnly ? ' active' : ''),
        text: state.watchlistOnly ? '★ Watchlist Active' : '☆ Watchlist Only',
        onclick: function () { state.watchlistOnly = !state.watchlistOnly; render(); }
      }),
      el('button', {
        type: 'button',
        class: 'clear-btn',
        text: 'Clear Filters',
        onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watchlistOnly = false; render(); }
      }),
      el('span', {class: 'filter-count', text: matchCount + '/' + DATA.board_size + ' shown'})
    ]);
  }

  function sortHeader(col, label) {
    var active = state.sortCol === col;
    return el('th', {
      class: 'sort-th' + (active ? ' active' : ''),
      onclick: function () { setSort(col); }
    }, [label, el('span', {class: 'sort-indicator', text: active ? (state.sortAsc ? '▲' : '▼') : '⇅'})]);
  }

  function protoCell(name, slug, extra) {
    var head = [el('span', {text: name})];
    if (extra) head.push(extra);
    return el('td', null, [el('div', {class: 'proto-cell'}, [el('div', {class: 'proto-name'}, head), el('span', {class: 'proto-slug', text: slug})])]);
  }

  function renderRadarTable(rows) {
    if (!rows.length) {
      return el('div', {class: 'board-panel'}, [
        el('div', {class: 'empty-state'}, [
          el('h3', {text: 'No matching protocols found'}),
          el('p', {text: 'Try clearing your filters.'})
        ])
      ]);
    }

    var maxImplied = DATA.rows[0].implied_value_usd || 1;
    var tbody = el('tbody');

    rows.forEach(function (r) {
      var isWl = WL.has(r.slug);
      var gTxt = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var gCls = r.change_7d === null ? '' : (r.change_7d >= 0 ? 'pos-val' : 'neg-val');
      var barPct = Math.max(4, Math.round((r.implied_value_usd / maxImplied) * 100));
      var extra = isWl ? el('span', {class: 'tag-badge tag-watchlist', text: 'WATCHLIST'}) : null;

      tbody.appendChild(el('tr', {
        class: state.selectedSlug === r.slug ? 'selected' : '',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); }
      }, [
        el('td', {class: 'col-num', text: '#' + r.rank}),
        protoCell(r.name, r.slug, extra),
        el('td', null, [el('span', {class: 'tag-badge', text: r.category || 'Other'})]),
        el('td', null, [el('span', {class: 'tag-badge', text: r.chains && r.chains[0] ? r.chains[0] : 'n/a'})]),
        el('td', {class: 'col-num', text: fmtUsd(r.tvl_usd)}),
        el('td', {class: 'col-num ' + gCls, text: gTxt}),
        el('td', {class: 'col-num', text: fmtAge(r.age_days)}),
        el('td', null, [
          el('div', {class: 'val-bar-wrap'}, [
            el('span', {class: 'col-num', text: fmtUsd(r.implied_value_usd)}),
            el('div', {class: 'val-bar', 'aria-hidden': 'true'}, [el('div', {class: 'val-bar-fill', style: 'width:' + barPct + '%'})])
          ])
        ]),
        el('td', null, [
          el('button', {
            type: 'button',
            class: 'btn-action',
            text: 'Farm Plan →',
            onclick: function (e) { e.stopPropagation(); openDetail(r.slug); }
          })
        ])
      ]));
    });

    var cols = [['rank','Rank'],['name','Protocol'],['category','Category'],[null,'Chain'],['tvl','TVL'],['change','7d'],['age','Maturity'],['implied','Implied Value'],[null,'Action']];

    return el('div', {class: 'board-panel'}, [
      el('div', {class: 'table-wrap'}, [
        el('table', {class: 'radar-table'}, [
          el('thead', null, [
            el('tr', null, cols.map(function(c){ return c[0] ? sortHeader(c[0], c[1]) : el('th', {text: c[1]}); }))
          ]),
          tbody
        ])
      ])
    ]);
  }

  function renderLiveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r, idx) {
      var mult = (r.tvl_usd > 0 && r.mcap_usd) ? (r.mcap_usd / r.tvl_usd).toFixed(2) + 'x' : 'n/a';
      var gTxt = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var gCls = r.change_7d === null ? '' : (r.change_7d >= 0 ? 'pos-val' : 'neg-val');

      tbody.appendChild(el('tr', null, [
        el('td', {class: 'col-num', text: '#' + (idx + 1)}),
        protoCell(r.name, r.slug),
        el('td', null, [el('span', {class: 'tag-badge', text: r.category || 'Other'})]),
        el('td', null, [el('span', {class: 'tag-badge', text: r.chains && r.chains[0] ? r.chains[0] : 'n/a'})]),
        el('td', {class: 'col-num', text: fmtUsd(r.tvl_usd)}),
        el('td', {class: 'col-num ' + gCls, text: gTxt}),
        el('td', {class: 'col-num', text: fmtUsd(r.mcap_usd)}),
        el('td', {class: 'col-num', text: mult})
      ]));
    });

    var liveCols = ['Rank','Live Protocol','Category','Chains','TVL','7d','Market Cap','Mcap/TVL Comps'];

    return el('div', {class: 'board-panel'}, [
      el('div', {class: 'table-wrap'}, [
        el('table', {class: 'radar-table'}, [
          el('thead', null, [
            el('tr', null, liveCols.map(function(t){ return el('th', {text: t}); }))
          ]),
          tbody
        ])
      ])
    ]);
  }

  var detailDialog = el('dialog', {class: 'detail-drawer', id: 'detail-modal', 'aria-modal': 'true'});
  detailDialog.addEventListener('close', function () {
    state.selectedSlug = null;
    var rows = document.querySelectorAll('.radar-table tbody tr');
    for (var i = 0; i < rows.length; i++) rows[i].classList.remove('selected');
  });

  function openDetail(slug) {
    var row = DATA.rows.find(function (r) { return r.slug === slug; });
    if (!row) return;

    state.selectedSlug = slug;
    detailDialog.textContent = '';

    var m = DATA.model;
    var exp = m.exponent || 0.85;
    var tvlScaled = 1e6 * Math.pow(Math.max(0, row.tvl_usd) / 1e6, exp);
    var baseVal = tvlScaled * row.category_multiple;

    var isWl = WL.has(row.slug);
    var badges = [
      el('span', {class: 'tag-badge', text: row.category || 'Other'}),
      el('span', {class: 'tag-badge', text: row.chains && row.chains[0] ? row.chains[0] : 'Primary'})
    ];
    if (isWl) badges.push(el('span', {class: 'tag-badge tag-watchlist', text: 'OFFICIAL WATCHLIST'}));

    var waterfallItems = [
      ['Reported TVL', fmtUsd(row.tvl_usd)],
      ['Sublinear TVL Scale (exp ' + exp + ')', fmtUsd(tvlScaled)],
      ['Category Multiple', row.category_multiple.toFixed(4) + 'x'],
      ['Base Scaled Valuation', fmtUsd(baseVal)],
      ['7d Momentum Multiplier', row.growth_multiplier.toFixed(4) + 'x (' + fmtPct(row.change_7d) + ')'],
      ['Maturity Multiplier', row.maturity_multiplier.toFixed(4) + 'x (' + fmtAge(row.age_days) + ')'],
      ['Confidence Discount', row.confidence_discount.toFixed(4) + 'x'],
      ['Final Implied Valuation', fmtUsd(row.implied_value_usd)]
    ];

    var farmSteps = getFarmSteps(row);
    var farmStepCards = farmSteps.map(function (step) {
      var copyBtn = el('button', {
        type: 'button',
        class: 'btn-copy',
        text: 'Copy Step',
        onclick: function () { copyText(step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.', copyBtn); }
      });
      return el('div', {class: 'farm-step-card'}, [
        el('div', {class: 'step-header'}, [
          el('span', {class: 'step-num-badge', text: 'STEP ' + step.n}),
          copyBtn
        ]),
        el('div', {class: 'step-instruction', text: step.text}),
        el('div', {class: 'step-meta-pills'}, [
          el('span', {class: 'pill-cost', text: 'Cost: ' + step.cost}),
          el('span', {class: 'pill-time', text: 'Time: ' + step.time})
        ])
      ]);
    });

    var content = el('div', {class: 'drawer-content'}, [
      el('div', {class: 'drawer-header'}, [
        el('div', {class: 'drawer-title-group'}, [
          el('span', {class: 'badge-version', text: 'Rank #' + row.rank + ' · ' + (isWl ? 'Watchlist' : 'Pre-Token')}),
          el('h2', {text: row.name}),
          el('div', {style: 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;'}, badges)
        ]),
        el('button', {
          type: 'button',
          class: 'drawer-close-btn',
          text: '✕ Close',
          onclick: function () { detailDialog.close(); }
        })
      ]),
      el('div', {class: 'waterfall-card'}, [
        el('h3', {text: 'Model v2 Valuation Waterfall Breakdown'}),
        el('div', {class: 'waterfall-rows'}, waterfallItems.map(function (item, idx) {
          var isLast = idx === waterfallItems.length - 1;
          return el('div', {class: 'waterfall-item' + (isLast ? ' total' : '')}, [
            el('span', {class: 'waterfall-lbl', text: item[0]}),
            el('span', {class: 'waterfall-val', text: item[1]})
          ]);
        }))
      ]),
      el('div', {class: 'farm-section'}, [
        el('h3', {text: 'Recommended 6-Step Farming Execution Plan'}),
        el('div', null, farmStepCards)
      ])
    ]);

    detailDialog.appendChild(content);

    if (typeof detailDialog.showModal === 'function') {
      if (!detailDialog.open) detailDialog.showModal();
    } else {
      detailDialog.setAttribute('open', '');
    }

    var trs = document.querySelectorAll('.radar-table tbody tr');
    for (var j = 0; j < trs.length; j++) {
      if (trs[j].textContent.indexOf(row.name) >= 0) trs[j].classList.add('selected');
      else trs[j].classList.remove('selected');
    }
  }

  function render() {
    var app = document.getElementById('radar-app');
    if (!app) return;
    app.textContent = '';

    var shell = el('main', {class: 'radar-shell', id: 'main-content'});
    shell.appendChild(renderHeader());
    shell.appendChild(renderNav());

    if (state.showMethodology) shell.appendChild(renderMethodology());

    if (state.tab === 'radar') {
      var filtered = getFilteredRows();
      var sorted = sortRows(filtered);
      shell.appendChild(renderFilterBar(filtered.length));
      shell.appendChild(renderRadarTable(sorted));
    } else {
      shell.appendChild(renderLiveTable());
    }

    app.appendChild(shell);

    if (!detailDialog.isConnected) document.body.appendChild(detailDialog);
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && detailDialog.open) detailDialog.close();
  });

  render();
})();
