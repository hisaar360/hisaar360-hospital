export interface AccountsRuleTopic {
  id: string;
  title: string;
  summary: string;
  points: string[];
  example?: string;
}

/**
 * Plain-language Accounts help for hospital staff who are not accountants.
 * Keep wording short, everyday, and example-first.
 */
export const ACCOUNTS_RULE_TOPICS: AccountsRuleTopic[] = [
  {
    id: 'basics',
    title: 'Debit & Credit — simple meaning',
    summary:
      'Think of every money movement like a see-saw: one side goes up (Debit), the other side goes down or balances it (Credit). Both sides must be equal.',
    points: [
      'Debit / Credit are just labels for “left side” and “right side” of a record — not “profit” or “loss”.',
      'Hospital software always writes two sides so money does not appear from nowhere.',
      'If Debit total and Credit total are the same, the entry is complete. If not equal, something is missing.',
      'You do not need to memorize formulas — just remember: money in one place = money from/to another place.',
    ],
    example:
      'Patient pays Rs 1,000 cash → Cash increases (Debit 1,000) and “patient still owes us” decreases (Credit 1,000). Same 1,000 on both sides.',
  },
  {
    id: 'journal',
    title: 'Journal Vouchers (JV list)',
    summary:
      'A Journal Voucher is one full story of a transaction (one JV number). The table shows the whole story in one row — not each account separately.',
    points: [
      'One row = one voucher (e.g. JV-2026-000172), like one receipt book entry for the whole deal.',
      'Debit and Credit looking the same on that row means the voucher is balanced — this is normal and correct.',
      'It does NOT mean money was charged twice. It means “total left side = total right side”.',
      'To see which accounts were used, open General Ledger / Cash Book for more detail.',
      'When you “Post journal” manually, add at least two lines that balance (one side Debit, other side Credit).',
    ],
    example:
      'Bed charges Rs 4,000 → “Patient owes us” Debit 4,000 + “Bed income” Credit 4,000. List shows Debit 4,000 and Credit 4,000 together.',
  },
  {
    id: 'cash-book',
    title: 'Cash Book (cash in hand)',
    summary:
      'Cash Book is only about physical / counter cash. Receipt = cash came in. Payment = cash went out.',
    points: [
      'Receipt column: patient paid cash, pharmacy cash sale, advance/deposit collected in cash, lab cash collection.',
      'Payment column: cash refund, cash expense, paying someone in cash.',
      'If Receipt has amounts and Payment is 0, this period only received cash — nothing was paid out in cash. That is OK.',
      'Balance = how much cash should be in the drawer after that line (running total).',
      'Closing cash ≈ starting cash + all receipts − all payments.',
    ],
    example:
      'Start cash 8,440. Patient pays 1,200 → Receipt 1,200, Payment 0, Balance becomes 9,640.',
  },
  {
    id: 'bank-book',
    title: 'Bank Book (bank / card / online)',
    summary:
      'Same idea as Cash Book, but for bank money — card, online transfer, cheque, bank deposit.',
    points: [
      'Receipt / inflow: money landed in the hospital bank account.',
      'Payment / outflow: money left the bank account.',
      'Cash at the counter goes to Cash Book. Card/online usually goes to Bank Book.',
      'If a day has only card collections, Bank Book receipts rise and payments may stay 0.',
    ],
    example:
      'Patient pays by card Rs 2,000 → Bank Book Receipt 2,000 (not Cash Book).',
  },
  {
    id: 'general-ledger',
    title: 'General Ledger (one account diary)',
    summary:
      'Pick one account and see every movement for that account in the date range — like opening one page of a register.',
    points: [
      'Example accounts: Cash, Bank, Patient Receivable, Bed Revenue, Pharmacy Sales.',
      'Opening = balance before this period. Closing = balance after listed lines.',
      'Use this when Journal list shows a total and you want “where did it go?”',
      'Each line usually links back to a JV / bill / payment reference.',
    ],
    example:
      'Open account 1100 (Receivables) → see which patients were charged and which payments reduced the balance.',
  },
  {
    id: 'chart-of-accounts',
    title: 'Chart of Accounts (account list)',
    summary:
      'This is the hospital’s money “folder list” — every code has a name (Cash, Bank, Income, Expense…).',
    points: [
      'Every journal line must use a code from this list.',
      'Think of codes like labeled drawers: 1000 Cash, 1020 Bank, income accounts, expense accounts.',
      'Do not invent random codes — use the list so reports stay correct.',
    ],
    example:
      'Posting bed income uses the Bed Revenue account code, not the Cash code (unless cash was also received).',
  },
  {
    id: 'receivables',
    title: 'Patient Receivables (patients still owe)',
    summary:
      'This is the list of money patients have been billed for but have not fully paid yet.',
    points: [
      'When hospital adds charges → receivable goes up (patient owes more).',
      'When patient pays → receivable goes down.',
      'High receivable does not always mean high cash in hand — bill can exist before payment.',
      'Cash Book / Daily Collections show money actually received.',
    ],
    example:
      'Bill Rs 10,000, patient paid Rs 4,000 → still Rs 6,000 receivable outstanding.',
  },
  {
    id: 'payables',
    title: 'Supplier Payables (hospital still owes)',
    summary:
      'This is money the hospital owes to suppliers for purchases not fully paid yet.',
    points: [
      'Purchase bill arrives → payable goes up.',
      'Hospital pays supplier → payable goes down.',
      'Opposite of patient receivables: here hospital is the one who must pay.',
    ],
    example:
      'Medicine purchase Rs 50,000 unpaid → Payables show 50,000 until payment is posted.',
  },
  {
    id: 'trial-balance',
    title: 'Trial Balance (health check)',
    summary:
      'A snapshot of all accounts. Total of all Debit balances should equal total of all Credit balances.',
    points: [
      'If both sides match, books are in balance for that date.',
      'If they do not match, some voucher may be incomplete or wrong — investigate before trusting reports.',
      'This is a check screen, not a bill or receipt.',
    ],
    example:
      'All asset/expense debit totals = all liability/income credit totals → Trial Balance OK.',
  },
  {
    id: 'profit-loss',
    title: 'Profit & Loss (did we earn?)',
    summary:
      'Shows income earned minus expenses for the selected dates — profit or loss for that period.',
    points: [
      'Income includes services billed (bed, lab, pharmacy sales, etc.) as set up in accounts.',
      'Expenses are costs of running the hospital in that period.',
      'Profit here is not the same as cash in the drawer — some income may still be unpaid.',
      'Use Cash Book / Daily Collections to see actual cash collected.',
    ],
    example:
      'Income 5,00,000 − Expenses 3,50,000 = Profit 1,50,000 (even if some bills are unpaid).',
  },
  {
    id: 'daily-collections',
    title: 'Daily Collections (money collected)',
    summary:
      'Day-wise money actually collected — focus on receipts, not unpaid bills.',
    points: [
      'Answers: “How much money came in today / this week?”',
      'Includes cash/card/online collections as configured.',
      'Different from Receivables (which includes unpaid amounts).',
    ],
    example:
      'Today collections Rs 80,000 even if total billed was Rs 1,20,000 (rest still outstanding).',
  },
  {
    id: 'patient-profitability',
    title: 'Patient Profitability (rough view)',
    summary:
      'Management view: roughly how much came from a patient/visit versus related costs.',
    points: [
      'Useful for managers — not a formal tax or statutory report.',
      'Helps spot which services / cases look profitable.',
      'Always cross-check with P&L and Cash Book for decisions.',
    ],
    example:
      'Patient billed 20,000 with related costs 8,000 → rough contribution about 12,000.',
  },
  {
    id: 'reconciliation',
    title: 'Reconciliation (match the records)',
    summary:
      'Checks that patient charges and payments on the Encounter Ledger also have matching Accounts journals.',
    points: [
      'Open Accounts → Reconciliation, pick dates, click Apply.',
      'Error rows mean something is on the patient side but missing (or wrong) in Accounts.',
      'LEDGER_MISSING_JOURNAL = patient charge without journal. PAYMENT_MISSING_JOURNAL = payment without journal.',
      'Click a row to see sample items, then click “Post missing journals” to create the missing GL entries.',
      'Apply again — those counts should drop. Other codes (duplicates, stock) need separate review.',
    ],
    example:
      '6 charges + 1 payment missing journals → Post missing journals → re-check → counts go toward 0.',
  },
  {
    id: 'audit',
    title: 'Financial Audit (find gaps)',
    summary:
      'Review screen to spot missing or suspicious financial postings.',
    points: [
      'Helps find cases where activity happened but journal was not created.',
      'Use with Reconciliation for a clean month close.',
      'Not for day-to-day cashiering — use Payments / Cash Book for that.',
    ],
    example:
      'Sale exists in pharmacy but COGS/sale journals missing → audit flags it.',
  },
  {
    id: 'expenses',
    title: 'Hospital Expenses',
    summary:
      'Costs of running the hospital (utilities, supplies, salaries if posted here, etc.).',
    points: [
      'Expenses reduce profit on Profit & Loss.',
      'If paid in cash, Cash Book Payment also rises.',
      'If unpaid, it may sit in payables until paid.',
    ],
    example:
      'Pay electricity Rs 15,000 in cash → Expense up, Cash Book Payment 15,000.',
  },
];

export const accountsRuleTopicForView = (view: string): AccountsRuleTopic | undefined => {
  const map: Record<string, string> = {
    dashboard: 'basics',
    journal: 'journal',
    'cash-book': 'cash-book',
    'bank-book': 'bank-book',
    'general-ledger': 'general-ledger',
    'chart-of-accounts': 'chart-of-accounts',
    receivables: 'receivables',
    payables: 'payables',
    'trial-balance': 'trial-balance',
    'profit-loss': 'profit-loss',
    'daily-collections': 'daily-collections',
    'patient-profitability': 'patient-profitability',
    reconciliation: 'reconciliation',
    audit: 'audit',
    expenses: 'expenses',
  };
  const id = map[view] || 'basics';
  return ACCOUNTS_RULE_TOPICS.find((topic) => topic.id === id);
};
