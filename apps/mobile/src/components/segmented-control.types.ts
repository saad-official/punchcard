export type SegmentedControlProps = {
  values: readonly string[];
  selectedIndex: number;
  onChange: (index: number) => void;
};
