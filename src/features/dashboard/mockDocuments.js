const MOCK_DOCUMENTS = [
  {
    id: "cust-1",
    title: "Storm Damage Claim Packet",
    sizeGb: 1.1,
    pageCount: 329
  },
  {
    id: "cust-2",
    title: "Auto Collision Evidence Bundle",
    sizeGb: 0.9,
    pageCount: 210
  },
  {
    id: "cust-3",
    title: "Medical Bills & Treatment Records",
    sizeGb: 1.4,
    pageCount: 412
  },
  {
    id: "cust-4",
    title: "Theft Incident Documentation",
    sizeGb: 0.8,
    pageCount: 185
  },
  {
    id: "cust-5",
    title: "Commercial Property Inspection",
    sizeGb: 1.6,
    pageCount: 486
  },
  {
    id: "cust-6",
    title: "Flood Loss Assessment",
    sizeGb: 1.3,
    pageCount: 372
  },
  {
    id: "cust-7",
    title: "Liability Claim Evidence",
    sizeGb: 0.7,
    pageCount: 164
  },
  {
    id: "cust-8",
    title: "Fire Investigation Report",
    sizeGb: 1.8,
    pageCount: 520
  },
  {
    id: "cust-9",
    title: "Workers Compensation Case File",
    sizeGb: 1.0,
    pageCount: 275
  },
  {
    id: "cust-10",
    title: "Policy & Endorsement Bundle",
    sizeGb: 0.6,
    pageCount: 148
  },
  {
    id: "cust-11",
    title: "Subrogation Recovery File",
    sizeGb: 1.2,
    pageCount: 338
  },
  {
    id: "cust-12",
    title: "Fraud Review Dossier",
    sizeGb: 1.7,
    pageCount: 467
  }
];

export function getDocumentForRow(row) {
  const directMatch = MOCK_DOCUMENTS.find((doc) => doc.id === row.id);
  if (directMatch) {
    return {
      ...directMatch,
      title: `${row.name} - ${directMatch.title}`
    };
  }

  const numericId = Number(row.id.replace("cust-", "")) || 0;
  const sizeGb = 0.8 + (numericId % 8) * 0.1;
  const pageCount = 180 + (numericId % 220);

  return {
    id: `doc-${row.id}`,
    title: `${row.name} Claim Packet`,
    sizeGb: Number(sizeGb.toFixed(1)),
    pageCount
  };
}
