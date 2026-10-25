/**
 * Departments a complaint can be filed with. Complaints store the name as-is, and officers see
 * complaints whose department equals theirs exactly, so every screen must use this one list.
 */
export const DEPARTMENTS = [
  'Police', 'Municipal Corporation', 'Electricity', 'Water Supply',
  'Road & Infrastructure', 'Cyber Crime', 'Consumer Court',
  'Women Safety', 'Other'
];

/** Complaint categories per department (the Category field depends on the Department). */
export const DEPARTMENT_CATEGORIES: Record<string, string[]> = {
  'Police': ['Theft', 'Assault', 'Missing Person', 'Public Nuisance', 'Traffic Violation', 'Other'],
  'Municipal Corporation': [
    'Waste Management', 'Streetlights', 'Drainage & Sewerage', 'Illegal Construction', 'Stray Animals',
    'Park Maintenance', 'Other',
  ],
  'Electricity': ['Power Cut', 'Faulty Meter', 'Voltage Fluctuating', 'New Connection Issue', 'Billing Issue', 'Other'],
  'Water Supply': ['No Water', 'Leaking Pipe', 'Contaminated Water', 'Billing Issue', 'Other'],
  'Road & Infrastructure': ['Potholes', 'Damaged Road', 'Footpath Encroachment', 'Waterlogging', 'Unsafe Bridge or Flyover', 'Other'],
  'Cyber Crime': ['Online Fraud', 'Social Media Harassment', 'Identity Theft', 'Phishing', 'Other'],
  'Consumer Court': ['Defective Product', 'Deficiency in Service', 'Overcharging', 'Refund Not Given', 'Misleading Advertisement', 'Other'],
  'Women Safety': ['Harassment', 'Stalking', 'Domestic Violence', 'Workplace Harassment', 'Unsafe Public Place', 'Other'],
  'Other': ['General Inquiry', 'Miscellaneous'],
};

export const categoriesFor = (department: string): string[] => DEPARTMENT_CATEGORIES[department] ?? [];
