import React, { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { useStockData } from '../services/mockData';

const StockCard = ({ title, symbol, initialPrice, onClick }) => {
    const { price, prevClose, status, history, dailyHistory } = useStockData(symbol, initialPrice);
    const [flash, setFlash] = useState(null); // 'green', 'red', or null

    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;
    const isPositive = change >= 0;

    // Flash effect logic
    useEffect(() => {
        if (price > prevClose) {
            setFlash('green');
        } else {
            setFlash('red');
        }
        const timer = setTimeout(() => setFlash(null), 500);
        return () => clearTimeout(timer);
    }, [price, prevClose]);

    return (
        <div
            onClick={() => onClick && onClick({ title, data: dailyHistory })}
            className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-3xl font-bold transition-colors duration-300 ${flash === 'green' ? 'text-green-400' : flash === 'red' ? 'text-red-400' : 'text-white'
                            }`}>
                            {price.toFixed(2)}
                        </span>
                        <span className={`flex items-center text-sm font-medium px-2 py-0.5 rounded ${isPositive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                            }`}>
                            {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(changePercent).toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${status === 'Trading' ? 'bg-green-900/20 text-green-400 border border-green-900/50' : 'bg-gray-700 text-gray-400'
                    }`}>
                    <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${status === 'Trading' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        {status}
                    </div>
                </div>
            </div>

            <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={isPositive ? '#4ade80' : '#f87171'}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <YAxis domain={['auto', 'auto']} hide />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>Prev Close: {prevClose.toFixed(2)}</span>
                <span className="flex items-center gap-1">
                    <Activity size={12} />
                    Real-time
                </span>
            </div>
        </div>
    );
};

export default StockCard;
