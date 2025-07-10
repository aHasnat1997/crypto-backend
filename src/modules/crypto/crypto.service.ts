import { Rocket } from '../../app';
import axios from 'axios';
import cron, { ScheduledTask } from 'node-cron';
import {
  TPortfolioData,
  TCoinMarketCapResponse,
  TApiNinjasResponse,
  TUpdateCryptoData,
  TAllocationData,
  TAssetPerformance
} from '../../types/crypto.type';

export class CryptoService {
  private app: Rocket;
  private readonly INITIAL_NAV = 482216.56;
  private readonly ALLOCATIONS_CONFIG = {
    A: { name: 'Bitcoin Allocation', weight: 0.49 },
    B: { name: 'Ethereum Allocation', weight: 0.267 },
    C: { name: 'Stablecoin Allocation', weight: 0.243 }
  };
  private isRunning = false;
  private cronJob: ScheduledTask | null = null;
  private isUpdating = false;
  private marketTrend = 0; // Added missing property

  constructor(app: Rocket) {
    this.app = app;
    this.startAutomatedDataCollection();
  }

  private getMinuteKey(date: Date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
  };

  private async fetchCoinMarketCapPrices(): Promise<TUpdateCryptoData | null> {
    try {
      const response = await axios.get<TCoinMarketCapResponse>(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
        {
          params: {
            symbol: 'BTC,ETH,USDC',
            convert: 'USD'
          },
          headers: {
            'X-CMC_PRO_API_KEY': this.app.config.API_KEY.COINMARKETCAP_API_KEY,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const data = response.data.data;
      this.marketTrend = data.BTC?.quote.USD.percent_change_24h || 0; // Update market trend
      return {
        btcPrice: data.BTC?.quote.USD.price || 0,
        ethPrice: data.ETH?.quote.USD.price || 0,
        usdcPrice: data.USDC?.quote.USD.price || 1,
        btcChange: data.BTC?.quote.USD.percent_change_24h || 0,
        ethChange: data.ETH?.quote.USD.percent_change_24h || 0,
        btcVolume: data.BTC?.quote.USD.volume_24h || 0,
        ethVolume: data.ETH?.quote.USD.volume_24h || 0
      };
    } catch (error) {
      console.error('CoinMarketCap API error:', error);
      return null;
    }
  }

  private async fetchApiNinjasPrices(): Promise<TUpdateCryptoData | null> {
    try {
      const [btcResponse, ethResponse] = await Promise.all([
        axios.get<TApiNinjasResponse>(
          'https://api.api-ninjas.com/v1/cryptoprice?symbol=BTCUSD',
          {
            headers: { 'X-Api-Key': this.app.config.API_KEY.API_NINJAS_KEY },
            timeout: 10000
          }
        ),
        axios.get<TApiNinjasResponse>(
          'https://api.api-ninjas.com/v1/cryptoprice?symbol=ETHUSD',
          {
            headers: { 'X-Api-Key': this.app.config.API_KEY.API_NINJAS_KEY },
            timeout: 10000
          }
        )
      ]);

      const btcPrice = parseFloat(btcResponse.data.price);
      const ethPrice = parseFloat(ethResponse.data.price);
      this.marketTrend = btcPrice > 50000 ? 1 : -1; // Simple trend detection

      return {
        btcPrice,
        ethPrice,
        usdcPrice: 1.0,
        btcChange: (Math.random() - 0.5) * 10,
        ethChange: (Math.random() - 0.5) * 8,
        btcVolume: 24300000000,
        ethVolume: 14500000000
      };
    } catch (error) {
      console.error('API Ninjas error:', error);
      return null;
    }
  }

  private async fetchCryptoPrices(): Promise<TUpdateCryptoData> {
    let prices = await this.fetchCoinMarketCapPrices();

    if (!prices) {
      prices = await this.fetchApiNinjasPrices();
    }

    if (!prices) {
      // Fallback to simulated data
      const simulatedTrend = Math.random() > 0.5 ? 1 : -1;
      this.marketTrend = simulatedTrend * (2 + Math.random() * 3); // Random trend between 2-5%

      prices = {
        btcPrice: 104870 + (Math.random() - 0.5) * 2000,
        ethPrice: 2530 + (Math.random() - 0.5) * 100,
        usdcPrice: 1.0,
        btcChange: simulatedTrend * (2 + Math.random() * 3),
        ethChange: simulatedTrend * (1.5 + Math.random() * 2.5),
        btcVolume: 24300000000,
        ethVolume: 14500000000
      };
    }

    return prices;
  }

  private calculateNAV(prices: TUpdateCryptoData, previousNav: number): number {
    const btcWeight = this.ALLOCATIONS_CONFIG.A.weight;
    const ethWeight = this.ALLOCATIONS_CONFIG.B.weight;
    const stableWeight = this.ALLOCATIONS_CONFIG.C.weight;

    const btcChange = (prices.btcChange || 0) / 100 / 1440;
    const ethChange = (prices.ethChange || 0) / 100 / 1440;
    const stableChange = 0.014 / 100 / 1440;

    const portfolioChange = (btcWeight * btcChange) +
      (ethWeight * ethChange) +
      (stableWeight * stableChange);

    return previousNav * (1 + portfolioChange);
  }

  private async generateChartData(currentNav: number, minutes: number = 60): Promise<Array<{ datetime: string; nav: number }>> {
    const chartData = [];
    const now = new Date();

    for (let i = minutes - 1; i >= 0; i--) {
      const datetime = new Date(now);
      datetime.setMinutes(datetime.getMinutes() - i);

      const variance = (Math.random() - 0.5) * 0.002;
      const nav = currentNav * (1 + variance * i * 0.001);

      chartData.push({
        datetime: datetime.toISOString(),
        nav: Number(nav.toFixed(2))
      });
    }

    return chartData;
  }

  private async generateAllocations(totalNav: number, growthPercent: number, date: string, minuteKey: string): Promise<Record<string, TAllocationData>> {
    const allocations: Record<string, TAllocationData> = {};
    const now = new Date();

    for (const [key, config] of Object.entries(this.ALLOCATIONS_CONFIG)) {
      const startingBalance = totalNav * config.weight;
      const minuteGain = startingBalance * (growthPercent / 100);
      const endingBalance = startingBalance + minuteGain;

      // First try to find existing allocation
      let allocation = await this.app.db.client.allocation.findUnique({
        where: {
          key_date: {
            key,
            date
          }
        },
        include: {
          AllocationHistory: true
        }
      });

      // If allocation doesn't exist, create it
      if (!allocation) {
        allocation = await this.app.db.client.allocation.create({
          data: {
            key,
            name: config.name,
            date,
            currentBalance: endingBalance,
            history: "[]",
            createdAt: now,
            updatedAt: now
          },
          include: {
            AllocationHistory: true
          }
        });
      }

      // Create the history entry
      const historyEntry = await this.app.db.client.allocationHistory.create({
        data: {
          allocationId: allocation.id,
          minuteKey,
          startingBalance,
          minuteGain,
          minuteGainPercent: growthPercent,
          endingBalance,
          notes: this.generateAllocationNotes(key),
          createdAt: now
        }
      });

      // Get all history entries for this allocation
      const historyEntries = await this.app.db.client.allocationHistory.findMany({
        where: { allocationId: allocation.id },
        orderBy: { createdAt: 'asc' }
      });

      // Update the allocation with current balance and serialized history
      allocation = await this.app.db.client.allocation.update({
        where: { id: allocation.id },
        data: {
          currentBalance: endingBalance,
          history: JSON.stringify(historyEntries),
          updatedAt: now
        },
        include: {
          AllocationHistory: true
        }
      });

      allocations[key] = {
        name: allocation.name,
        current_balance: allocation.currentBalance,
        history: historyEntries.map(h => ({
          minuteKey: h.minuteKey,
          starting_balance: h.startingBalance,
          minute_gain: h.minuteGain,
          minute_gain_percent: h.minuteGainPercent,
          ending_balance: h.endingBalance,
          notes: h.notes,
          createdAt: h.createdAt.toISOString()
        }))
      };
    }

    return allocations;
  }

  private generateAllocationNotes(allocation: string): string {
    const btcTrend = this.marketTrend > 0 ? 'bullish' : 'bearish';
    const ethTrend = this.marketTrend > 0 ? 'rising' : 'falling';

    const notes = {
      A: [
        `BTC showing ${btcTrend} momentum`,
        `Bitcoin ${btcTrend === 'bullish' ? 'breaking resistance' : 'testing support'}`,
        `${btcTrend === 'bullish' ? 'Increasing' : 'Decreasing'} institutional interest`,
        `Market sentiment ${btcTrend === 'bullish' ? 'positive' : 'negative'}`
      ],
      B: [
        `ETH ${ethTrend} with ${btcTrend} BTC trend`,
        `DeFi activity ${ethTrend === 'rising' ? 'increasing' : 'decreasing'}`,
        `Layer 2 solutions gaining traction`,
        `${ethTrend === 'rising' ? 'Strong' : 'Weak'} staking activity`
      ],
      C: [
        'Stablecoin yield optimization active',
        'Rebalancing stablecoin allocations',
        'Exploring high-yield protocols',
        'Risk management protocols engaged'
      ]
    };

    return notes[allocation as keyof typeof notes][
      Math.floor(Math.random() * notes[allocation as keyof typeof notes].length)
    ];
  }

  private generateAssetPerformance(prices: TUpdateCryptoData) {
    return {
      BTC: {
        symbol: 'BTC',
        open: Number(((prices.btcPrice || 0) * (1 - (prices.btcChange || 0) / 100 / 1440)).toFixed(0)),
        close: Number((prices.btcPrice || 0).toFixed(0)),
        change_percent: Number((prices.btcChange || 0).toFixed(2)),
        volume_usd: prices.btcVolume || 24300000000
      },
      ETH: {
        symbol: 'ETH',
        open: Number(((prices.ethPrice || 0) * (1 - (prices.ethChange || 0) / 100 / 1440)).toFixed(2)),
        close: Number((prices.ethPrice || 0).toFixed(2)),
        change_percent: Number((prices.ethChange || 0).toFixed(2)),
        volume_usd: prices.ethVolume || 14500000000
      },
      Stablecoin: {
        yield_daily_percent: 0.014 + (Math.random() - 0.5) * 0.004,
        platforms: [
          { name: 'Clearpool', asset: 'USDC' },
          { name: 'Maple Finance', asset: 'USDT' },
          { name: 'Frax Treasury', asset: 'DAI' }
        ]
      }
    };
  }

  private generateMinuteReport(growthPercent: number, btcChange: number, ethChange: number): string {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const performance = growthPercent > 0 ? 'gained' : 'declined';
    const btcDirection = btcChange > 0 ? 'up' : 'down';
    const ethDirection = ethChange > 0 ? 'up' : 'down';

    return `Minute update at ${timeString}: Portfolio ${performance} ${Math.abs(growthPercent).toFixed(6)}%. BTC ${btcDirection} ${Math.abs(btcChange / 1440).toFixed(4)}%, ETH ${ethDirection} ${Math.abs(ethChange / 1440).toFixed(4)}%.`;
  }

  private async getPreviousNAV(): Promise<number | null> {
    try {
      const latestData = await this.app.db.client.portfolioData.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      return latestData?.endingNav || null;
    } catch (error) {
      console.error('Error fetching previous NAV:', error);
      return null;
    }
  }

  private async saveToPrisma(data: TPortfolioData): Promise<void> {
    const MAX_RETRIES = 3;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        const now = new Date();
        const minuteKey = this.getMinuteKey(now);
        const date = new Date().toISOString().split('T')[0];

        await this.app.db.client.portfolioData.upsert({
          where: {
            date_minuteKey: {
              date: data.date,
              minuteKey: minuteKey
            }
          },
          update: {
            lastUpdated: data.last_updated,
            startingNav: data.nav.starting_nav,
            endingNav: data.nav.ending_nav,
            growthPercent: data.nav.growth_percent,
            dailyReportText: data.daily_report_text,
            systemStatus: JSON.stringify(data.system_status),
            visualFlags: JSON.stringify(data.visual_flags),
            teamNotes: JSON.stringify(data.team_notes),
            updatedAt: now
          },
          create: {
            date: data.date,
            minuteKey: minuteKey,
            lastUpdated: data.last_updated,
            startingNav: data.nav.starting_nav,
            endingNav: data.nav.ending_nav,
            growthPercent: data.nav.growth_percent,
            dailyReportText: data.daily_report_text,
            systemStatus: JSON.stringify(data.system_status),
            visualFlags: JSON.stringify(data.visual_flags),
            teamNotes: JSON.stringify(data.team_notes),
            createdAt: now,
            updatedAt: now
          }
        });

        data.allocations = await this.generateAllocations(
          data.nav.ending_nav,
          data.nav.growth_percent,
          data.date,
          minuteKey
        );

        await this.app.db.client.assetPerformance.deleteMany({
          where: {
            date: data.date,
            minuteKey: minuteKey
          }
        });

        for (const [symbol, performance] of Object.entries(data.asset_performance)) {
          if (symbol !== 'Stablecoin') {
            await this.app.db.client.assetPerformance.create({
              data: {
                symbol: symbol,
                open: performance.open,
                close: performance.close,
                changePercent: performance.change_percent,
                volumeUsd: performance.volume_usd,
                date: data.date,
                minuteKey: minuteKey,
                createdAt: now,
                updatedAt: now
              }
            });
          }
        }

        for (const point of data.nav.chart_data) {
          await this.app.db.client.chartData.upsert({
            where: {
              datetime: point.datetime
            },
            update: {
              nav: point.nav,
              date: point.datetime.split('T')[0],
              updatedAt: now
            },
            create: {
              datetime: point.datetime,
              nav: point.nav,
              date: point.datetime.split('T')[0],
              createdAt: now,
              updatedAt: now
            }
          });
        }

        await this.app.db.client.systemStatusLog.create({
          data: {
            date: date,
            minuteKey: minuteKey,
            routingActive: data.system_status.routing_active,
            hedgingEngaged: data.system_status.hedging_engaged,
            smartLayerUnlocked: data.system_status.smart_layer_unlocked,
            dashboardBetaMode: data.system_status.dashboard_beta_mode,
            lastSyncSuccess: data.system_status.last_sync_success,
            createdAt: now,
            updatedAt: now
          }
        });

        return;
      } catch (error: any) {
        if (error.code === 'P2034' && attempts < MAX_RETRIES - 1) {
          attempts++;
          const delay = Math.pow(2, attempts) * 100;
          console.warn(`⚠️ Retry attempt ${attempts} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        console.error('Error saving minute data:', error);
        throw error;
      }
    }
  }

  async processAndUpdateData(): Promise<TPortfolioData | null> {
    if (this.isRunning) {
      console.log('⏳ Update already in progress, skipping this minute');
      return this.getLatestData() || await this.createInitialData();
    }

    this.isRunning = true;

    try {
      console.log('⏱️ Starting minute crypto data update...');

      const prices = await this.fetchCryptoPrices();
      const previousNav = await this.getPreviousNAV() || this.INITIAL_NAV;
      const currentNav = this.calculateNAV(prices, previousNav);
      const growthPercent = ((currentNav - previousNav) / previousNav) * 100;
      const chartData = await this.generateChartData(currentNav, 60);

      const cryptoData: TPortfolioData = {
        date: new Date().toISOString().split('T')[0],
        last_updated: new Date().toISOString(),
        nav: {
          starting_nav: Number(previousNav.toFixed(2)),
          ending_nav: Number(currentNav.toFixed(2)),
          growth_percent: Number(growthPercent.toFixed(6)),
          chart_data: chartData
        },
        allocations: {},
        asset_performance: this.generateAssetPerformance(prices),
        system_status: {
          routing_active: true,
          hedging_engaged: Math.random() > 0.1,
          smart_layer_unlocked: true,
          dashboard_beta_mode: true,
          last_sync_success: true
        },
        visual_flags: {
          'Smart Routing': 'On',
          'Hedging Operational': Math.random() > 0.1 ? 'Active' : 'Standby',
          'Stablecoin Yield Layer': 'Running',
          'System Sync': 'Stable'
        },
        daily_report_text: this.generateMinuteReport(
          growthPercent,
          prices.btcChange || 0,
          prices.ethChange || 0
        ),
        team_notes: {
          dev_status: 'Active Dev - Minute Real-time Integration',
          developer: 'Automated System',
          expected_preview: 'Live Now',
          data_entry_mode: 'Minute API Integration'
        }
      };

      await this.saveToPrisma(cryptoData);

      console.log('✅ Minute data updated successfully');
      return cryptoData;

    } catch (error) {
      console.error('❌ Error processing crypto data:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async createInitialData(): Promise<TPortfolioData> {
    const prices = {
      btcPrice: 104870,
      ethPrice: 2530,
      usdcPrice: 1.0,
      btcChange: 0,
      ethChange: 0,
      btcVolume: 24300000000,
      ethVolume: 14500000000
    };

    const chartData = await this.generateChartData(this.INITIAL_NAV, 60);
    const now = new Date().toISOString();
    const date = now.split('T')[0];
    const minuteKey = this.getMinuteKey();

    const allocations = await this.generateAllocations(
      this.INITIAL_NAV,
      0,
      date,
      minuteKey
    );

    return {
      date: date,
      last_updated: now,
      nav: {
        starting_nav: this.INITIAL_NAV,
        ending_nav: this.INITIAL_NAV,
        growth_percent: 0,
        chart_data: chartData
      },
      allocations: allocations,
      asset_performance: this.generateAssetPerformance(prices),
      system_status: {
        routing_active: true,
        hedging_engaged: false,
        smart_layer_unlocked: true,
        dashboard_beta_mode: true,
        last_sync_success: true
      },
      visual_flags: {
        'Smart Routing': 'On',
        'Hedging Operational': 'Standby',
        'Stablecoin Yield Layer': 'Running',
        'System Sync': 'Stable'
      },
      daily_report_text: 'Initial portfolio data created',
      team_notes: {
        dev_status: 'Initial Setup',
        developer: 'System',
        expected_preview: 'Initial Data',
        data_entry_mode: 'Manual Initialization'
      }
    };
  }

  private startAutomatedDataCollection(): void {
    if (this.cronJob) {
      return;
    }

    console.log('🔄 Starting automated minute crypto data collection...');

    this.cronJob = cron.schedule('* * * * *', async () => {
      if (this.isUpdating) {
        console.log('⏳ Update already in progress, skipping this minute');
        return;
      }

      try {
        this.isUpdating = true;
        console.log(`⏱️ Running minute update at ${new Date().toISOString()}`);
        await this.processAndUpdateData();
      } catch (error) {
        console.error('❌ Scheduled minute update failed:', error);
      } finally {
        this.isUpdating = false;
      }
    });

    setTimeout(() => {
      this.processAndUpdateData().catch(error => {
        console.error('❌ Initial update failed:', error);
      });
    }, 2000);
  }

  async getLatestData(): Promise<TPortfolioData | null> {
    try {
      const latestPortfolio = await this.app.db.client.portfolioData.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (!latestPortfolio) {
        return null;
      }

      const [allocations, assetPerformance, chartData] = await Promise.all([
        this.app.db.client.allocation.findMany({
          where: { date: latestPortfolio.date },
          include: { AllocationHistory: true }
        }),
        this.app.db.client.assetPerformance.findMany({
          where: {
            date: latestPortfolio.date,
            minuteKey: latestPortfolio.minuteKey
          }
        }),
        this.app.db.client.chartData.findMany({
          orderBy: { datetime: 'desc' },
          take: 60
        })
      ]);

      const formattedAllocations: Record<string, TAllocationData> = {};
      allocations.forEach(alloc => {
        formattedAllocations[alloc.key] = {
          name: alloc.name,
          current_balance: alloc.currentBalance,
          history: alloc.AllocationHistory.map(h => ({
            minuteKey: h.minuteKey,
            starting_balance: h.startingBalance,
            minute_gain: h.minuteGain,
            minute_gain_percent: h.minuteGainPercent,
            ending_balance: h.endingBalance,
            notes: h.notes,
            createdAt: h.createdAt.toISOString()
          }))
        };
      });

      return {
        date: latestPortfolio.date,
        last_updated: latestPortfolio.lastUpdated,
        nav: {
          starting_nav: latestPortfolio.startingNav,
          ending_nav: latestPortfolio.endingNav,
          growth_percent: latestPortfolio.growthPercent,
          chart_data: chartData.map(point => ({
            datetime: point.datetime,
            nav: point.nav
          }))
        },
        allocations: formattedAllocations,
        asset_performance: assetPerformance.reduce((acc, asset) => {
          acc[asset.symbol] = {
            symbol: asset.symbol,
            open: asset.open,
            close: asset.close,
            change_percent: asset.changePercent,
            volume_usd: asset.volumeUsd
          };
          return acc;
        }, {} as Record<string, TAssetPerformance>),
        system_status: JSON.parse(latestPortfolio.systemStatus || '{}'),
        visual_flags: JSON.parse(latestPortfolio.visualFlags || '{}'),
        daily_report_text: latestPortfolio.dailyReportText,
        team_notes: JSON.parse(latestPortfolio.teamNotes || '{}')
      };
    } catch (error) {
      console.error('Error fetching latest data:', error);
      return null;
    }
  }

  async getNavHistory(minutes: number = 60): Promise<Array<{
    date: string;
    endingNav: number;
    growthPercent: number;
    lastUpdated: string;
    datetime: string;
    minuteKey: string;
  }>> {
    try {
      const portfolioData = await this.app.db.client.portfolioData.findMany({
        orderBy: { createdAt: 'desc' },
        take: minutes
      });

      return portfolioData.map(item => ({
        date: item.date,
        endingNav: item.endingNav,
        growthPercent: item.growthPercent,
        lastUpdated: item.lastUpdated,
        datetime: item.createdAt.toISOString(),
        minuteKey: item.minuteKey
      }));
    } catch (error) {
      console.error('Error fetching NAV history:', error);
      throw error;
    }
  }

  async getChartData(minutes: number = 60) {
    try {
      const chartData = await this.app.db.client.chartData.findMany({
        orderBy: { datetime: 'desc' },
        take: minutes
      });

      return chartData.reverse().map(point => ({
        datetime: point.datetime,
        nav: point.nav
      }));
    } catch (error) {
      console.error('Error fetching chart data:', error);
      throw error;
    }
  }

  async getAllocations(date?: string): Promise<Record<string, TAllocationData>> {
    try {
      const whereClause: any = {};
      if (date) whereClause.date = date;

      const allocations = await this.app.db.client.allocation.findMany({
        where: whereClause,
        include: { AllocationHistory: true }
      });

      const result: Record<string, TAllocationData> = {};
      allocations.forEach(alloc => {
        result[alloc.key] = {
          name: alloc.name,
          current_balance: alloc.currentBalance,
          history: alloc.AllocationHistory.map(h => ({
            minuteKey: h.minuteKey,
            starting_balance: h.startingBalance,
            minute_gain: h.minuteGain,
            minute_gain_percent: h.minuteGainPercent,
            ending_balance: h.endingBalance,
            notes: h.notes,
            createdAt: h.createdAt.toISOString()
          }))
        };
      });

      return result;
    } catch (error) {
      console.error('Error fetching allocations:', error);
      throw error;
    }
  }

  async createAllocation(data: {
    key: string;
    name: string;
    initialBalance: number;
    date?: string;
  }): Promise<TAllocationData> {
    const now = new Date();
    const date = data.date || new Date().toISOString().split('T')[0];
    const minuteKey = this.getMinuteKey(now);

    // First check if allocation exists
    const existingAllocation = await this.app.db.client.allocation.findUnique({
      where: {
        key_date: {
          key: data.key,
          date
        }
      },
      include: {
        AllocationHistory: true
      }
    });

    if (existingAllocation) {
      throw new Error(`Allocation with key ${data.key} already exists for date ${date}`);
    }

    // Create the allocation
    const allocation = await this.app.db.client.allocation.create({
      data: {
        key: data.key,
        name: data.name,
        date,
        currentBalance: data.initialBalance,
        history: JSON.stringify([]),
        createdAt: now,
        updatedAt: now
      }
    });

    // Create the history entry
    const historyEntry = await this.app.db.client.allocationHistory.create({
      data: {
        allocationId: allocation.id,
        minuteKey,
        startingBalance: data.initialBalance,
        minuteGain: 0,
        minuteGainPercent: 0,
        endingBalance: data.initialBalance,
        notes: 'Initial allocation created',
        createdAt: now
      }
    });

    // Update the allocation with the new history
    const updatedAllocation = await this.app.db.client.allocation.update({
      where: { id: allocation.id },
      data: {
        history: JSON.stringify([historyEntry])
      },
      include: {
        AllocationHistory: true
      }
    });

    return {
      name: updatedAllocation.name,
      current_balance: updatedAllocation.currentBalance,
      history: updatedAllocation.AllocationHistory.map(h => ({
        minuteKey: h.minuteKey,
        starting_balance: h.startingBalance,
        minute_gain: h.minuteGain,
        minute_gain_percent: h.minuteGainPercent,
        ending_balance: h.endingBalance,
        notes: h.notes,
        createdAt: h.createdAt.toISOString()
      }))
    };
  }

  async getAssetPerformance(symbol?: string, minutes: number = 60) {
    try {
      const whereClause: any = {};
      if (symbol) whereClause.symbol = symbol;

      const assetData = await this.app.db.client.assetPerformance.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: minutes
      });

      return assetData.map(item => ({
        symbol: item.symbol,
        open: item.open,
        close: item.close,
        change_percent: item.changePercent,
        volume_usd: item.volumeUsd,
        datetime: item.createdAt.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching asset performance:', error);
      throw error;
    }
  }

  async getSystemStatusHistory(minutes: number = 60) {
    try {
      const statusData = await this.app.db.client.systemStatusLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: minutes
      });

      return statusData.map(item => ({
        routing_active: item.routingActive,
        hedging_engaged: item.hedgingEngaged,
        smart_layer_unlocked: item.smartLayerUnlocked,
        dashboard_beta_mode: item.dashboardBetaMode,
        last_sync_success: item.lastSyncSuccess,
        datetime: item.createdAt.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching system status history:', error);
      throw error;
    }
  }

  async triggerManualUpdate(): Promise<TPortfolioData | null> {
    return await this.processAndUpdateData();
  }

  stopAutomatedUpdates(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🛑 Automated updates stopped');
  }
}
