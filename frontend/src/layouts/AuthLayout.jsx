export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-3xl">💰</span>
          <h1 className="text-2xl font-bold text-text-primary mt-2">Spendwise</h1>
        </div>
        {children}
      </div>
    </div>
  )
}