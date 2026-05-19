import InlineSpinner from './InlineSpinner';

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-10 font-display text-sm text-gold">
      <InlineSpinner label="讀取中..." />
    </div>
  );
}
