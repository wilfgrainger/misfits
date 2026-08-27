/**
 * One accessible failure surface for reads that did not arrive.
 *
 * `DESIGN.md` requires deliberate failure behaviour on every data-bearing
 * member and admin surface, and contextual retry actions that do not create
 * duplicate navigation. Mutation failures keep their own inline messages,
 * because re-running a read is not the recovery a failed submission needs.
 */
export function LoadFailure({ message, retryLabel, onRetry }: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return <div className="load-failure" role="alert">
    <strong>{message}</strong>
    <button className="secondary-button" type="button" onClick={onRetry}>{retryLabel}</button>
  </div>;
}
