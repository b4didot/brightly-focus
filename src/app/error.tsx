"use client"

export default function AppError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <div className="page-shell">
      <h1>Application Error</h1>
      <p>{error.message}</p>
    </div>
  )
}
