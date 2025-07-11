import { Rocket } from "../../app";
import { TAllocationCreate, TAllocationData } from "../../types/allocation.type";

export class AllocationService {
  private app: Rocket;
  private marketTrend = 0;

  constructor(app: Rocket) {
    this.app = app;
  }

  public getMinuteKey(date: Date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
  };

  private generateAllocationNotes(allocationKey: string): string {
    const btcTrend = this.marketTrend > 0 ? 'bullish' : 'bearish';
    const ethTrend = this.marketTrend > 0 ? 'rising' : 'falling';

    // Default notes that work for any allocation
    const defaultNotes = [
      `Allocation ${allocationKey} performing ${this.marketTrend > 0 ? 'well' : 'poorly'}`,
      `Monitoring allocation ${allocationKey}`,
      `Standard operations for allocation ${allocationKey}`,
      `Reviewing performance of allocation ${allocationKey}`
    ];

    // Specialized notes for known allocations
    const specializedNotes: Record<string, string[]> = {
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

    // Use specialized notes if available, otherwise use default notes
    const availableNotes = specializedNotes[allocationKey] || defaultNotes;
    return availableNotes[Math.floor(Math.random() * availableNotes.length)];
  }

  async generateAllocations(totalNav: number, growthPercent: number, date: string, minuteKey: string): Promise<Record<string, TAllocationData>> {
    const allocations: Record<string, TAllocationData> = {};
    const now = new Date();

    try {
      // 1. Fetch all allocations from DB
      const allocationsFromDB = await this.app.db.client.allocation.findMany({
        include: {
          AllocationHistory: true
        }
      });

      // Return empty if no allocations exist
      if (!allocationsFromDB || allocationsFromDB.length === 0) {
        return {};
      }

      // 2. Calculate equal weight for each allocation
      const allocationCount = allocationsFromDB.length;
      const equalWeight = 1 / allocationCount;

      // 3. Process each allocation
      for (const alloc of allocationsFromDB) {
        const key = alloc.key;

        const startingBalance = totalNav * equalWeight;
        const minuteGain = startingBalance * (growthPercent / 100);
        const endingBalance = startingBalance + minuteGain;

        // 4. Create new history entry
        const historyEntry = await this.app.db.client.allocationHistory.create({
          data: {
            allocationId: alloc.id,
            minuteKey,
            startingBalance,
            minuteGain,
            minuteGainPercent: growthPercent,
            endingBalance,
            notes: this.generateAllocationNotes(key),
            createdAt: now
          }
        });

        // 5. Get full history (including new entry)
        const historyEntries = await this.app.db.client.allocationHistory.findMany({
          where: { allocationId: alloc.id },
          orderBy: { createdAt: 'asc' }
        });

        // 6. Update allocation with new balance and history
        await this.app.db.client.allocation.update({
          where: { id: alloc.id },
          data: {
            currentBalance: endingBalance,
            history: JSON.stringify(historyEntries),
            updatedAt: now
          }
        });

        // 7. Format response
        allocations[key] = {
          name: alloc.name,
          current_balance: endingBalance,
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
    } catch (error) {
      console.error('Error in generateAllocations:', error);
      throw error;
    }

    return allocations;
  }

  async createAllocation(data: TAllocationCreate): Promise<TAllocationData> {
    const now = new Date();
    const date = data.date || new Date().toISOString().split('T')[0];
    const minuteKey = this.getMinuteKey(now);

    // First check if allocation exists
    const existingAllocation = await this.app.db.client.allocation.findUnique({
      where: {
        key: data.key
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

  async getAllocations(query?: { days?: number }) {  // Explicitly type the query
    const fields = ["id", "name", "key", "date", "currentBalance", "createdAt", "updatedAt"];

    // Build safe query object
    const safeQuery = {
      ...(query?.days && { days: query.days }),
      // Add other validated query params here if needed
    };

    const allocations = await this.app.db.findAll('allocation', safeQuery, {
      searchableFields: ["name", "key"],
      select: fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
    }).exec();

    return {
      data: allocations.data,
      meta: allocations.meta
    };
  }

  async getAllocationByKey(key: string) {
    const allocation = await this.app.db.client.allocation.findUnique({
      where: { key },
      include: {
        AllocationHistory: true
      }
    });
    if (!allocation) {
      throw new Error(`Allocation with key ${key} not found`);
    }
    return {
      name: allocation.name,
      current_balance: allocation.currentBalance,
      date: allocation.date,
      history: allocation.AllocationHistory.map(h => ({
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

  async updateAllocation(key: string, data: Partial<TAllocationCreate>): Promise<TAllocationData> {
    const now = new Date();
    const allocation = await this.app.db.client.allocation.findUnique({
      where: { key }
    });
    if (!allocation) {
      throw new Error(`Allocation with key ${key} not found`);
    }
    const updatedAllocation = await this.app.db.client.allocation.update({
      where: { key: allocation.key },
      data: {
        name: data.name || allocation.name,
        date: data.date || allocation.date,
        currentBalance: data.initialBalance !== undefined ? data.initialBalance : allocation.currentBalance,
        updatedAt: now
      },
      include: {
        AllocationHistory: true
      }
    });
    // Create a new history entry if initialBalance is provided
    if (data.initialBalance !== undefined) {
      const minuteKey = this.getMinuteKey(now);
      const historyEntry = await this.app.db.client.allocationHistory.create({
        data: {
          allocationId: updatedAllocation.id,
          minuteKey,
          startingBalance: allocation.currentBalance,
          minuteGain: 0,
          minuteGainPercent: 0,
          endingBalance: data.initialBalance,
          notes: this.generateAllocationNotes(key),
          createdAt: now
        }
      });
      // Update the allocation with the new history
      await this.app.db.client.allocation.update({
        where: { id: updatedAllocation.id },
        data: {
          history: JSON.stringify([...updatedAllocation.AllocationHistory, historyEntry]),
          updatedAt: now
        }
      });
    }
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

  async deleteAllocation(key: string): Promise<{ success: boolean }> {
    const now = new Date();

    // First find the allocation to ensure it exists
    const allocation = await this.app.db.client.allocation.findUnique({
      where: { key },
      include: { AllocationHistory: true }
    });

    if (!allocation) {
      throw new Error(`Allocation with key ${key} not found`);
    }

    await this.app.db.client.$transaction(async (tx) => {
      // Delete all related AllocationHistory records first
      await tx.allocationHistory.deleteMany({
        where: { allocationId: allocation.id }
      });

      // Then delete the allocation
      await tx.allocation.delete({
        where: { key }
      });
    })

    return { success: true };
  }

  // async getAllocations(query?: { days?: number }) {
  //   const fields = ["id", "name", "key", "date", "currentBalance", "createdAt", "updatedAt", "AllocationHistory"];

  //   // Build safe query object
  //   const safeQuery = {
  //     ...(query?.days && { days: query.days }),
  //     // Add other validated query params here if needed
  //   };

  //   const allocations = await this.app.db.findAll('allocation', safeQuery, {
  //     searchableFields: ["name", "key"],
  //     select: fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
  //   }).exec();

  //   return {
  //     data: allocations.data,
  //     meta: allocations.meta
  //   };
  // }
}
