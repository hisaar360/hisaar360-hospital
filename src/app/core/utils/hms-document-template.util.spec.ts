import {
  buildHmsStandardDocumentHtml,
  escHtml,
  formatHmsMoney,
  patientDisplayName,
} from './hms-document-template.util';

describe('hms document template util', () => {
  it('escapes unsafe html', () => {
    expect(escHtml('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  });

  it('formats money with PKR prefix', () => {
    expect(formatHmsMoney(1200)).toContain('PKR');
  });

  it('builds a single shared document shell', () => {
    const html = buildHmsStandardDocumentHtml({
      title: 'Patient Ledger',
      bodyHtml: '<section><p>Ledger body</p></section>',
      generatedBy: 'QA Accountant',
    });
    expect(html).toContain('Patient Ledger');
    expect(html).toContain('Hisaar360 Hospital Management System');
    expect(html).toContain('Ledger body');
  });

  it('formats patient names without mongo ids', () => {
    expect(patientDisplayName({ firstName: 'Ali', lastName: 'Khan', patientNo: 'PAT-001' })).toBe('Ali Khan');
  });
});
