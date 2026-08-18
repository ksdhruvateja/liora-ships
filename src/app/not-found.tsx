export default function NotFound() {
  return (
    <div className="surface mx-auto max-w-lg p-10 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight">Page not found</h1>
      <p className="mt-3 text-muted">That shipment or page doesn’t exist.</p>
      <a href="/" className="btn-primary mt-6">
        Back to rates
        <span className="btn-arrow">→</span>
      </a>
    </div>
  );
}
