import { isUuid } from '../../common/utils/uuid.util';
describe('uuid.util', () => {
  it('accepts RFC-like UUID strings', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });
  it('rejects non-uuid', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
  });
});
