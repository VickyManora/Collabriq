import { ApplicationWithRequirement } from '../../../core/services/creator.service';

describe('MyApplications - Logic', () => {
  const appWithReq: ApplicationWithRequirement = {
    id: 'a1',
    requirement_id: 'r1',
    creator_id: 'c1',
    status: 'applied',
    pitch: 'My pitch',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    requirement: { title: 'Food Review', status: 'open', category: 'Food' },
  };

  const appWithNullReq: ApplicationWithRequirement = {
    id: 'a2',
    requirement_id: 'r2',
    creator_id: 'c1',
    status: 'accepted',
    pitch: null,
    created_at: '2026-01-02',
    updated_at: '2026-01-02',
    requirement: null as any,
  };

  describe('null requirement safety', () => {
    it('should access title safely with optional chaining', () => {
      expect(appWithReq.requirement?.title).toBe('Food Review');
      expect(appWithNullReq.requirement?.title).toBeUndefined();
      expect(appWithNullReq.requirement?.title ?? 'Untitled').toBe('Untitled');
    });

    it('should access category safely with optional chaining', () => {
      expect(appWithReq.requirement?.category).toBe('Food');
      expect(appWithNullReq.requirement?.category).toBeUndefined();
    });

    it('should access status safely with optional chaining', () => {
      expect(appWithReq.requirement?.status).toBe('open');
      expect(appWithNullReq.requirement?.status).toBeUndefined();
    });
  });

  describe('statusLabel', () => {
    function statusLabel(status: string): string {
      const labels: Record<string, string> = {
        applied: 'Applied',
        accepted: 'Accepted',
        rejected: 'Rejected',
        withdrawn: 'Withdrawn',
      };
      return labels[status] ?? status;
    }

    it('should return correct labels', () => {
      expect(statusLabel('applied')).toBe('Applied');
      expect(statusLabel('accepted')).toBe('Accepted');
      expect(statusLabel('rejected')).toBe('Rejected');
      expect(statusLabel('withdrawn')).toBe('Withdrawn');
    });
  });

  describe('filtering with null requirements', () => {
    const apps = [appWithReq, appWithNullReq];

    it('should filter by status without crashing on null requirements', () => {
      const applied = apps.filter(a => a.status === 'applied');
      expect(applied).toHaveLength(1);
      expect(applied[0].id).toBe('a1');
    });

    it('should search by title safely with null requirements', () => {
      const search = (query: string) =>
        apps.filter(a => a.requirement?.title?.toLowerCase().includes(query) ?? false);

      expect(search('food')).toHaveLength(1);
      expect(search('nonexistent')).toHaveLength(0);
      // Should not crash on null requirement — empty string matches via includes('')
      expect(search('')).toHaveLength(1); // only appWithReq has a non-null title
    });
  });
});
