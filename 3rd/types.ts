export type TestData = {
  question: string;
  answer: number;
  test?: { q: string; a: string };
};

export type FileInstance = {
  "test-data": TestData[];
};

export type ReportPayload = {
  task: string;
  apikey: string;
  answer: {
    apikey: string;
    description: string;
    copyright: string;
    "test-data": TestData[];
  };
};
