export interface TCryptoPrice {
  symbol: string;
  price: number;
  change_24h?: number;
  volume_24h?: number;
  market_cap?: number;
}

export interface TNavData {
  date: string;
  nav: number;
  last_updated: string;
  growth_percent: number;
  chart_data: Array<{
    date: string;
    nav: number;
  }>;
}

export interface TAllocationData {
  name: string;
  starting_balance: number;
  daily_gain: number;
  daily_gain_percent: number;
  ending_balance: number;
  notes: string;
}

export interface TAssetPerformance {
  symbol: string;
  open: number;
  close: number;
  change_percent: number;
  volume_usd: number;
}

export interface TPortfolioData {
  date: string;
  last_updated: string;
  nav: {
    starting_nav: number;
    ending_nav: number;
    growth_percent: number;
    chart_data: Array<{
      date: string;
      nav: number;
    }>;
  };
  allocations: {
    [key: string]: TAllocationData;
  };
  asset_performance: {
    [key: string]: TAssetPerformance | any;
  };
  system_status: {
    routing_active: boolean;
    hedging_engaged: boolean;
    smart_layer_unlocked: boolean;
    dashboard_beta_mode: boolean;
    last_sync_success: boolean;
  };
  visual_flags: {
    [key: string]: string;
  };
  daily_report_text: string;
  team_notes: {
    dev_status: string;
    developer: string;
    expected_preview: string;
    data_entry_mode: string;
  };
}

export interface TCoinMarketCapResponse {
  data: {
    [key: string]: {
      id: number;
      name: string;
      symbol: string;
      slug: string;
      quote: {
        USD: {
          price: number;
          volume_24h: number;
          percent_change_24h: number;
          market_cap: number;
          last_updated: string;
        };
      };
    };
  };
}

export interface TApiNinjasResponse {
  symbol: string;
  price: string;
  timestamp: number;
}

export interface TUpdateCryptoData {
  btcPrice?: number;
  ethPrice?: number;
  usdcPrice?: number;
  btcChange?: number;
  ethChange?: number;
  btcVolume?: number;
  ethVolume?: number;
}
