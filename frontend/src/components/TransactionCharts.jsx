import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const TransactionCharts = ({
  charts = [],
  className = "",
  showStats = true,
  stats = [],
  containerClass = "max-w-7xl mx-auto px-4 py-6"
}) => {
  return (
    <div className={containerClass}>
      {/* Stats Cards */}
      {showStats && stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className={`${stat.bgColor || 'bg-white'} rounded-lg shadow p-4 text-center`}>
              <div className="text-2xl font-bold text-gray-900">
                {stat.prefix || ''}{stat.value}{stat.suffix || ''}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      {charts.length > 0 && (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 ${className}`}>
          {charts.map((chart, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {chart.title}
              </h3>
              <ResponsiveContainer width="100%" height={chart.height || 300}>
                {chart.type === 'pie' && (
                  <PieChart>
                    <Pie
                      data={chart.data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={chart.label || (({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`)}
                      outerRadius={chart.outerRadius || 80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chart.data.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}

                {chart.type === 'bar' && (
                  <BarChart data={chart.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey={chart.xDataKey || "name"}
                      tickFormatter={chart.xTickFormatter}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={chart.tooltipLabelFormatter}
                      formatter={chart.tooltipFormatter}
                    />
                    {chart.showLegend !== false && <Legend />}
                    {chart.bars.map((bar, barIndex) => (
                      <Bar
                        key={barIndex}
                        dataKey={bar.dataKey}
                        stackId={bar.stackId}
                        fill={bar.fill}
                        name={bar.name}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>

              {/* Additional content below chart */}
              {chart.footer && chart.footer}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionCharts;