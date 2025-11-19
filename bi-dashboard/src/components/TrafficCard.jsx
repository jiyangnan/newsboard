import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';
import { useTrafficData } from '../services/mockData';

const TrafficCard = ({ title, onClick }) => {
    const { visits, history, dailyHistory } = useTrafficData();

    return (
        <div
            onClick={() => onClick && onClick({ title, data: dailyHistory })}
            className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-3xl font-bold text-white">
                            {visits.toLocaleString()}
                        </span>
                        <span className="text-gray-500 text-sm">visits / 5min</span>
                    </div>
                </div>
                <div className="bg-blue-900/20 p-2 rounded-lg">
                    <Users className="text-blue-400" size={20} />
                </div>
            </div>

            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                        <defs>
                            <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                            itemStyle={{ color: '#60a5fa' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorVisits)"
                            isAnimationActive={false}
                        />
                        <YAxis hide domain={['auto', 'auto']} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-blue-400 bg-blue-900/10 p-3 rounded-lg border border-blue-900/30">
                <TrendingUp size={16} />
                <span>Projected to exceed yesterday's traffic by 12%</span>
            </div>
        </div>
    );
};

export default TrafficCard;
