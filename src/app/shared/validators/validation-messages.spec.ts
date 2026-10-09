import { validationMessage } from './validation-messages';

describe('validationMessage', () => {
  it('returns null when there are no errors', () => {
    expect(validationMessage(null)).toBeNull();
    expect(validationMessage({})).toBeNull();
  });

  it('shows the most fundamental error first', () => {
    expect(validationMessage({ iban: true, required: true })).toBe('This field is required');
  });

  it('explains an unreadable typed date rather than calling it empty', () => {
    expect(validationMessage({ required: true, matDatepickerParse: { text: 'abc' } })).toBe(
      'Enter a valid date',
    );
  });

  it('includes details from the error', () => {
    expect(validationMessage({ maxTotal: { max: 100, actual: 120 } })).toBe(
      'Total cannot exceed 100% (currently 120%)',
    );
    expect(validationMessage({ maxlength: { requiredLength: 50, actualLength: 60 } })).toBe(
      'Use at most 50 characters',
    );
  });

  it('shows server-side messages as given', () => {
    expect(validationMessage({ server: 'Must be a valid IBAN' })).toBe('Must be a valid IBAN');
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(validationMessage({ somethingCustom: true })).toBe('This value is not valid');
  });
});
