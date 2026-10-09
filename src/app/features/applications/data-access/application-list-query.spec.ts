import {
  DEFAULT_LIST_QUERY,
  isSameQuery,
  parseListQuery,
  toQueryParams,
} from './application-list-query';

describe('application list query', () => {
  describe('parseListQuery', () => {
    it('applies defaults when the URL has no parameters', () => {
      expect(parseListQuery({})).toEqual(DEFAULT_LIST_QUERY);
    });

    it('reads valid parameters', () => {
      expect(
        parseListQuery({
          page: '3',
          pageSize: '25',
          status: 'IN_REVIEW',
          search: '  everest ',
          sortBy: 'legalName',
          sortDirection: 'asc',
        }),
      ).toEqual({
        page: 3,
        pageSize: 25,
        status: 'IN_REVIEW',
        search: 'everest',
        sortBy: 'legalName',
        sortDirection: 'asc',
      });
    });

    it('ignores tampered or out-of-range values instead of sending them to the API', () => {
      expect(
        parseListQuery({
          page: '-2',
          pageSize: '1000',
          status: 'HACKED',
          search: '   ',
          sortBy: 'password',
          sortDirection: 'sideways',
        }),
      ).toEqual(DEFAULT_LIST_QUERY);
    });

    it('caps very long search text', () => {
      expect(parseListQuery({ search: 'x'.repeat(500) }).search).toHaveLength(100);
    });
  });

  describe('toQueryParams', () => {
    it('writes only values that differ from the defaults, and removes the rest', () => {
      expect(toQueryParams({ ...DEFAULT_LIST_QUERY, page: 2, status: 'DRAFT' })).toEqual({
        page: 2,
        pageSize: null,
        status: 'DRAFT',
        search: null,
        sortBy: null,
        sortDirection: null,
      });
    });

    it('round-trips through the URL', () => {
      const query = {
        ...DEFAULT_LIST_QUERY,
        page: 4,
        search: 'koshi',
        sortDirection: 'asc' as const,
      };
      const params = Object.fromEntries(
        Object.entries(toQueryParams(query)).filter(([, value]) => value !== null),
      );

      expect(parseListQuery(params)).toEqual(query);
    });
  });

  it('compares queries by value', () => {
    expect(isSameQuery(DEFAULT_LIST_QUERY, { ...DEFAULT_LIST_QUERY })).toBe(true);
    expect(isSameQuery(DEFAULT_LIST_QUERY, { ...DEFAULT_LIST_QUERY, search: 'a' })).toBe(false);
  });
});
