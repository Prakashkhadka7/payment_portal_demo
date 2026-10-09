import { initialsOf } from './initials';

describe('initialsOf', () => {
  it.each([
    ['Asha K.', 'AK'],
    ['Bikash (Sales)', 'B'],
    ['Maya (Sales + Reviewer)', 'M'],
    ['rita mohan sharma', 'RM'],
    ['Élodie Ørsted', 'ÉØ'],
    ['', ''],
    ['(Admin)', ''],
  ])('turns "%s" into "%s"', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});
