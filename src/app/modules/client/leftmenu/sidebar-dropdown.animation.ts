import { animate, state, style, transition, trigger } from '@angular/animations';

/** Premium open/close — open slightly slower so it feels deliberate; close stays smooth. */
export const sidebarDropdownAnimation = trigger('sidebarDropdown', [
  state(
    'closed',
    style({
      height: '0px',
      opacity: 0,
      overflow: 'hidden',
      visibility: 'hidden',
      pointerEvents: 'none',
    })
  ),
  state(
    'open',
    style({
      height: '*',
      opacity: 1,
      overflow: 'hidden',
      visibility: 'visible',
      pointerEvents: 'auto',
    })
  ),
  transition('closed => open', [
    animate('400ms cubic-bezier(0.22, 1, 0.36, 1)'),
  ]),
  transition('open => closed', [
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'),
  ]),
]);
