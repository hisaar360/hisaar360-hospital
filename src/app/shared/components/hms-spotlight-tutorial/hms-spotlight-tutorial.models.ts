export interface HmsSpotlightTutorialStep {
  target: string;
  title: string;
  text: string;
  place?: 'auto' | 'above' | 'below';
}

export interface HmsSpotlightTutorialRect {
  top: number;
  left: number;
  width: number;
  height: number;
}
