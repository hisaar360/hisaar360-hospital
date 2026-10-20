import { HmsSpotlightTutorialStep } from '../../../shared/components/hms-spotlight-tutorial/hms-spotlight-tutorial.models';

/** Ward Home A→Z — full IPD desk walkthrough */
export const WARD_HOME_TUTORIAL_STEPS: HmsSpotlightTutorialStep[] = [
  {
    target: 'ward-tutorial-btn',
    title: 'Ward tutorial',
    text: 'Replay this walkthrough anytime from the graduation-cap Tutorial button. Help Center → Ward A→Z also opens it.',
    place: 'below',
  },
  {
    target: 'manual-admit',
    title: '1. Manual Admit',
    text: 'Walk-in patient? Tap Manual Admit to allot room + bed (same allotment flow as Admissions). No doctor recommendation needed first.',
    place: 'below',
  },
  {
    target: 'admissions',
    title: '2. Admissions desk',
    text: 'Open Admissions for doctor “Recommend Admission” orders — Review & Admit, or Manual Admit again from that page.',
    place: 'below',
  },
  {
    target: 'patients',
    title: '3. Patient list',
    text: 'All admitted patients live here. Open any row to reach the full chart (Care, Medicines, Treatments, Bill, Discharge).',
    place: 'below',
  },
  {
    target: 'beds',
    title: '4. Bed management',
    text: 'Create wards, floors, rooms, and beds; see occupancy and free beds before you admit.',
    place: 'below',
  },
  {
    target: 'summary',
    title: '5. Snapshot KPIs',
    text: 'Quick counts for occupied beds, free beds, pending admissions, and care reminders — tap Open where available.',
    place: 'below',
  },
  {
    target: 'care-pending',
    title: '6. Care reminders',
    text: 'If Morning / Afternoon / Night vitals or notes are missing, they show here. Open the patient and enter from paper charge forms. Doctor or Ward Admin by permission.',
    place: 'below',
  },
  {
    target: 'filters',
    title: '7. Bed board filters',
    text: 'Filter My Ward, Occupied, Available, or Needs Attention so you only see beds that matter right now.',
    place: 'below',
  },
  {
    target: 'board',
    title: '8. Bed board → patient chart',
    text: 'Tap an occupied bed to open that patient’s profile. From the chart: Care → Medicines → Treatments / OT → Discharge & bill.',
    place: 'above',
  },
];

export const WARD_HOME_TUTORIAL_STORAGE = 'hms-ward-home-tutorial-seen';

/** Admissions module page */
export const WARD_ADMISSIONS_TUTORIAL_STEPS: HmsSpotlightTutorialStep[] = [
  {
    target: 'ward-tutorial-btn',
    title: 'Admissions tutorial',
    text: 'Replay this tour anytime from Tutorial. Ward Home has the full A→Z desk tour.',
    place: 'below',
  },
  {
    target: 'primary-action',
    title: 'Manual Admit',
    text: 'Primary path for walk-ins: opens room allotment so you assign ward, room, and bed in one go.',
    place: 'below',
  },
  {
    target: 'kpis',
    title: 'Admission KPIs',
    text: 'See active admissions, pending doctor orders, and today’s discharges at a glance.',
    place: 'below',
  },
  {
    target: 'tabs',
    title: 'Pending vs admitted',
    text: 'Pending Orders = doctor recommendations waiting for a bed. Admitted = already on the ward. Open a pending row to Review & Admit.',
    place: 'below',
  },
  {
    target: 'table',
    title: 'Orders table',
    text: 'Search by patient / MRN / doctor. Each pending order leads to allotment; active rows open the patient chart.',
    place: 'above',
  },
];

export const WARD_ADMISSIONS_TUTORIAL_STORAGE = 'hms-ward-admissions-tutorial-seen';

/** Bed management */
export const WARD_BEDS_TUTORIAL_STEPS: HmsSpotlightTutorialStep[] = [
  {
    target: 'ward-tutorial-btn',
    title: 'Beds tutorial',
    text: 'Replay anytime from Tutorial. Set up structure once, then admit from Ward Home / Admissions.',
    place: 'below',
  },
  {
    target: 'add-ward',
    title: 'Add Ward',
    text: 'Create a ward (e.g. Male Medical, ICU). Floors and rooms hang under wards.',
    place: 'below',
  },
  {
    target: 'add-floor',
    title: 'Add Floor',
    text: 'Optional floor grouping inside a ward when your building needs it.',
    place: 'below',
  },
  {
    target: 'add-room',
    title: 'Add Room',
    text: 'Rooms hold beds. Pick ward (and floor) then name the room (e.g. 201).',
    place: 'below',
  },
  {
    target: 'add-bed',
    title: 'Add Bed',
    text: 'Add beds to a room. Occupancy updates when you allot a patient from Admissions / Manual Admit.',
    place: 'below',
  },
  {
    target: 'bed-kpis',
    title: 'Occupancy KPIs',
    text: 'Total, available, occupied, and blocked beds — use this before promising a bed to a walk-in.',
    place: 'below',
  },
  {
    target: 'bed-board',
    title: 'Ward / room board',
    text: 'Browse rooms and beds. Transfer or free beds from the patient chart when someone moves or discharges.',
    place: 'above',
  },
];

export const WARD_BEDS_TUTORIAL_STORAGE = 'hms-ward-beds-tutorial-seen';

/** Patient list */
export const WARD_PATIENTS_TUTORIAL_STEPS: HmsSpotlightTutorialStep[] = [
  {
    target: 'ward-tutorial-btn',
    title: 'Patients tutorial',
    text: 'Replay anytime from Tutorial. This list is the directory into every admitted chart.',
    place: 'below',
  },
  {
    target: 'patient-kpis',
    title: 'Status counts',
    text: 'Stable / Watch / Critical / Discharge Planned — click a KPI or tab to filter the list.',
    place: 'below',
  },
  {
    target: 'patient-filters',
    title: 'Search & filters',
    text: 'Filter by ward, doctor, nurse, or search MRN / name. Narrow the list before rounds.',
    place: 'below',
  },
  {
    target: 'patient-tabs',
    title: 'Status tabs',
    text: 'Switch status quickly. Discharge Planned patients are ready for checklist + bill clearance.',
    place: 'below',
  },
  {
    target: 'patient-table',
    title: 'Open a chart',
    text: 'Click a patient to open Care, Medicines (MAR), Treatments / OT, and Discharge — one profile for the stay.',
    place: 'above',
  },
];

export const WARD_PATIENTS_TUTORIAL_STORAGE = 'hms-ward-patients-tutorial-seen';

/** Patient chart / detail */
export const WARD_CHART_TUTORIAL_STEPS: HmsSpotlightTutorialStep[] = [
  {
    target: 'ward-tutorial-btn',
    title: 'Patient chart tutorial',
    text: 'Replay anytime from Tutorial. Doctor may only sign; Ward Admin (by permission) enters care and can start/complete OT.',
    place: 'below',
  },
  {
    target: 'chart-tabs',
    title: 'Chart tabs',
    text: 'Overview → Care (vitals / notes / IV) → Medicines → Treatments (procedures + OT) → Discharge (bill & payments).',
    place: 'below',
  },
  {
    target: 'chart-overview',
    title: 'Overview',
    text: 'What needs doing now, latest vitals/notes, and Operation card — Start OT / Complete OT / Open calendar when you have permission.',
    place: 'below',
  },
  {
    target: 'chart-ot',
    title: 'Operation (OT)',
    text: 'From Overview or Treatments: schedule OT charges on the chart, or open the OT calendar. Ward Admin and Doctor share OT by Roles permissions.',
    place: 'above',
  },
];

export const WARD_CHART_TUTORIAL_STORAGE = 'hms-ward-chart-tutorial-seen';
