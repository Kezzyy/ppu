
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// import { Card } from '../ui/card'; // Unused

interface HealthData {
    timestamp: string;
    ram_used: string; // BigInt serialized as string
    ram_total: string; // BigInt serialized as string
    status: string;
}

interface ServerHealthChartProps {
    data: HealthData[];
}

const ServerHealthChart: React.FC<ServerHealthChartProps> = ({ data }) => {
    // Process data for charts
    const chartData = data.map(d => ({
        time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ramMB: Math.round(Number(d.ram_used) / 1024 / 1024),
        totalMB: Math.round(Number(d.ram_total) / 1024 / 1024),
        status: d.status
    })).reverse(); // API returns desc, we want asc for chart

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-900/50 rounded-lg">
                No health data available yet...
            </div>
        );
    }

    return (
        <div className="h-64 w-full bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-4">RAM Usage (24h)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 0,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis
                        dataKey="time"
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value} MB`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }}
                        itemStyle={{ color: '#60a5fa' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="ramMB"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorRam)"
                        animationDuration={1000}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ServerHealthChart;
