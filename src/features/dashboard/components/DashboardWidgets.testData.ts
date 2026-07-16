export const mockAppStats = {
  total: 50,
  by_status: {
    to_apply: 10,
    applied: 20,
    screening_call: 5,
    phone_interview: 3,
    technical_interview: 2,
    onsite_interview: 1,
    offer_received: 2,
    offer_accepted: 1,
    offer_rejected: 0,
    rejected: 4,
    ghosted: 2,
    withdrawn: 0,
  },
  response_rate: 40,
  offer_rate: 10,
  weekly_applications: [
    { week: "Week 1", count: 10 },
    { week: "Week 2", count: 15 },
    { week: "Week 3", count: 12 },
  ],
};

export const mockJobsBySource = [
  { source: "jobswithgpt", count: 30 },
  { source: "indeed", count: 15 },
  { source: "greenhouse", count: 5 },
];

export const mockSalaryRanges = [
  { range: "$50k-75k", count: 5 },
  { range: "$75k-100k", count: 15 },
  { range: "$100k-125k", count: 20 },
  { range: "$125k-150k", count: 8 },
];
