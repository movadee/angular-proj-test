export interface TableRow {
  id: number;
  name: string;
  email: string;
  department: string;
  status: 'Active' | 'Inactive' | 'Pending';
  date: string;
}

// Static data arrays for generating realistic records
const FIRST_NAMES = [
  'John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'William', 'Sophia', 'James',
  'Emma', 'Alexander', 'Isabella', 'Michael', 'Ava', 'David', 'Charlotte', 'Joseph', 'Scarlett', 'Christopher',
  'Luna', 'Andrew', 'Chloe', 'Daniel', 'Zoe', 'Matthew', 'Layla', 'Nathan', 'Riley', 'Isaac',
  'Nora', 'Ryan', 'Hazel', 'Ethan', 'Violet', 'Benjamin', 'Aurora', 'Sebastian', 'Luna', 'Jackson'
];

const LAST_NAMES = [
  'Doe', 'Smith', 'Johnson', 'Brown', 'Wilson', 'Davis', 'Miller', 'Garcia', 'Rodriguez', 'Martinez',
  'Thompson', 'White', 'Lee', 'Anderson', 'Taylor', 'Thomas', 'Jackson', 'Harris', 'Clark', 'Lewis',
  'Robinson', 'Walker', 'Perez', 'Hall', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres',
  'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
  'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz'
];

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design', 'Product', 'Support', 'Legal'];
const STATUSES: ('Active' | 'Inactive' | 'Pending')[] = ['Active', 'Inactive', 'Pending'];

// Generate 5000 records with realistic patterns
const generateRecords = (): TableRow[] => {
  const records: TableRow[] = [];
  let currentDate = new Date('2025-12-31');

  // Month names for date formatting
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  for (let i = 1; i <= 5000; i++) {
    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i - 1) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const department = DEPARTMENTS[(i - 1) % DEPARTMENTS.length];
    const status = STATUSES[(i - 1) % STATUSES.length];

    // Format date as "Dec 29, 2025" (English format)
    const month = monthNames[currentDate.getMonth()];
    const day = currentDate.getDate();
    const year = currentDate.getFullYear();
    const date = `${month} ${day}, ${year}`;

    records.push({
      id: i,
      name,
      email,
      department,
      status,
      date
    });

    // Move to previous day
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return records;
};

export const TABLE_DATA: TableRow[] = generateRecords();
