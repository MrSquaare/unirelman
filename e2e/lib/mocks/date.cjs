const fakeDateEnv = process.env.UNIRELMAN_TEST_DATE;

if (fakeDateEnv) {
  const OriginalDate = globalThis.Date;
  const fakeTimestamp = new OriginalDate(fakeDateEnv).getTime();

  class MockDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fakeTimestamp);
      } else {
        super(...args);
      }
    }

    static now() {
      return fakeTimestamp;
    }
  }

  globalThis.Date = MockDate;
}
