import { useWindowDimensions } from 'react-native';

/** Content never gets wider than this, so forms stay readable on tablets and landscape. */
export const MAX_CONTENT_WIDTH = 720;

export type Responsive = {
  width: number;
  /** Phone (<600), tablet (600-1023), large tablet / landscape (>=1024). */
  size: 'phone' | 'tablet' | 'large';
  /** How many cards fit side by side in a list. */
  columns: 1 | 2 | 3;
  /** Width of the centred content column. */
  contentWidth: number;
  /** Horizontal page padding that grows a little on bigger screens. */
  gutter: number;
};

export function layoutFor(width: number): Responsive {
  const size = width >= 1024 ? 'large' : width >= 600 ? 'tablet' : 'phone';
  const columns = size === 'large' ? 3 : size === 'tablet' ? 2 : 1;
  const gutter = size === 'phone' ? 16 : 24;
  return { width, size, columns, contentWidth: Math.min(width, MAX_CONTENT_WIDTH), gutter };
}

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();
  return layoutFor(width);
}
