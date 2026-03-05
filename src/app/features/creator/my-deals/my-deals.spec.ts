import { DealWithDetails } from '../../../core/services/creator.service';
import { DealStatus } from '../../../core/models/deal.model';

describe('MyDeals - Logic', () => {
  // Helper functions mirroring the component
  function businessDisplayName(deal: DealWithDetails): string {
    return deal.business?.business_name || deal.business?.full_name || 'Unknown';
  }

  function statusLabel(status: DealStatus): string {
    const labels: Record<DealStatus, string> = {
      active: 'Active',
      creator_marked_done: 'Marked Done',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status];
  }

  function canMarkDone(deal: DealWithDetails): boolean {
    return deal.status === 'active' && !deal.creator_marked_done;
  }

  // Filter logic
  function filterDeals(deals: DealWithDetails[], filter: string, query: string): DealWithDetails[] {
    let d = deals;
    if (filter !== 'all') {
      if (filter === 'active') {
        d = d.filter((deal) => deal.status === 'active' || deal.status === 'creator_marked_done');
      } else {
        d = d.filter((deal) => deal.status === filter);
      }
    }
    if (query) {
      d = d.filter(
        (deal) =>
          (deal.business?.business_name?.toLowerCase().includes(query) ?? false) ||
          (deal.business?.full_name?.toLowerCase().includes(query) ?? false),
      );
    }
    return d;
  }

  const baseDeal = {
    application_id: 'app1',
    completed_at: null,
    updated_at: '2026-01-01',
  };

  const dealWithData: DealWithDetails = {
    ...baseDeal,
    id: '1',
    requirement_id: 'r1',
    creator_id: 'c1',
    business_id: 'b1',
    status: 'active',
    creator_marked_done: false,
    business_marked_done: false,
    created_at: '2026-01-01',
    requirement: { title: 'Test Requirement' },
    business: { business_name: 'Acme Corp', full_name: 'John Doe', email: 'john@test.com', phone: '123' },
  };

  const dealWithNulls: DealWithDetails = {
    ...baseDeal,
    id: '2',
    requirement_id: 'r2',
    creator_id: 'c1',
    business_id: 'b2',
    status: 'completed',
    creator_marked_done: true,
    business_marked_done: true,
    created_at: '2026-01-02',
    requirement: null,
    business: null,
  };

  const cancelledDeal: DealWithDetails = {
    ...baseDeal,
    id: '3',
    requirement_id: 'r3',
    creator_id: 'c1',
    business_id: 'b3',
    status: 'cancelled',
    creator_marked_done: false,
    business_marked_done: false,
    created_at: '2026-01-03',
    requirement: { title: 'Cancelled Req' },
    business: { business_name: null, full_name: 'Jane', email: 'jane@test.com', phone: null },
  };

  describe('businessDisplayName', () => {
    it('should return business_name when available', () => {
      expect(businessDisplayName(dealWithData)).toBe('Acme Corp');
    });

    it('should return full_name when business_name is null', () => {
      expect(businessDisplayName(cancelledDeal)).toBe('Jane');
    });

    it('should return Unknown when business is null', () => {
      expect(businessDisplayName(dealWithNulls)).toBe('Unknown');
    });
  });

  describe('null requirement safety', () => {
    it('should access title with optional chaining', () => {
      expect(dealWithData.requirement?.title).toBe('Test Requirement');
      expect(dealWithNulls.requirement?.title).toBeUndefined();
      expect(dealWithNulls.requirement?.title ?? 'Untitled').toBe('Untitled');
    });
  });

  describe('null business safety', () => {
    it('should access business fields with optional chaining', () => {
      expect(dealWithData.business?.email).toBe('john@test.com');
      expect(dealWithNulls.business?.email).toBeUndefined();
      expect(dealWithNulls.business?.phone).toBeUndefined();
    });
  });

  describe('statusLabel', () => {
    it('should return correct labels', () => {
      expect(statusLabel('active')).toBe('Active');
      expect(statusLabel('completed')).toBe('Completed');
      expect(statusLabel('cancelled')).toBe('Cancelled');
      expect(statusLabel('creator_marked_done')).toBe('Marked Done');
    });
  });

  describe('canMarkDone', () => {
    it('should return true for active deals not yet marked', () => {
      expect(canMarkDone(dealWithData)).toBe(true);
    });

    it('should return false for completed deals', () => {
      expect(canMarkDone(dealWithNulls)).toBe(false);
    });

    it('should return false for cancelled deals', () => {
      expect(canMarkDone(cancelledDeal)).toBe(false);
    });
  });

  describe('filterDeals', () => {
    const allDeals = [dealWithData, dealWithNulls, cancelledDeal];

    it('should return all deals for "all" filter', () => {
      expect(filterDeals(allDeals, 'all', '')).toHaveLength(3);
    });

    it('should filter by active status', () => {
      const result = filterDeals(allDeals, 'active', '');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by completed status', () => {
      const result = filterDeals(allDeals, 'completed', '');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should filter by cancelled status', () => {
      const result = filterDeals(allDeals, 'cancelled', '');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should filter by search query matching business_name', () => {
      const result = filterDeals(allDeals, 'all', 'acme');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by search query matching full_name', () => {
      const result = filterDeals(allDeals, 'all', 'jane');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should return empty for non-matching search', () => {
      expect(filterDeals(allDeals, 'all', 'nonexistent')).toHaveLength(0);
    });

    it('should handle null business in search gracefully', () => {
      // dealWithNulls has null business - should not crash
      const result = filterDeals(allDeals, 'all', 'test');
      expect(result).toBeDefined();
    });

    it('should combine filter and search', () => {
      const result = filterDeals(allDeals, 'active', 'acme');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');

      const empty = filterDeals(allDeals, 'cancelled', 'acme');
      expect(empty).toHaveLength(0);
    });
  });
});
