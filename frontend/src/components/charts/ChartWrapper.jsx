export default function ChartWrapper({ title, children, loading, empty }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h3>}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!loading && empty && (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
      )}
      {!loading && !empty && children}
    </div>
  )
}