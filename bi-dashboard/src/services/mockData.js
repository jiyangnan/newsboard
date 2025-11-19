import { useState, useEffect } from 'react';

// Helper to generate random fluctuation
const fluctuate = (value, volatility = 0.002) => {
    const change = value * volatility * (Math.random() - 0.5);
    return value + change;
};

// Helper to generate initial chart data
const generateHistory = (basePrice, points = 60) => {
    let current = basePrice;
    return Array.from({ length: points }, (_, i) => {
        current = fluctuate(current);
        return {
            time: i,
            value: current,
        };
    });
};

// Helper to generate daily history for drill-down
const generateDailyHistory = (baseValue, days = 30) => {
    const today = new Date();
    let current = baseValue;
    const history = [];

    for (let i = days; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const prev = current;
        current = fluctuate(current, 0.02); // Higher volatility for daily
        const change = current - prev;
        const changePercent = (change / prev) * 100;

        history.push({
            date: date.toISOString().split('T')[0],
            value: current,
            change: changePercent
        });
    }
    return history.reverse(); // Newest first
};

export const useStockData = (symbol, initialPrice) => {
    const [data, setData] = useState({
        price: initialPrice,
        prevClose: initialPrice * 0.98, // Simulate yesterday's close
        status: 'Trading', // Trading, Closed
        history: generateHistory(initialPrice),
        dailyHistory: generateDailyHistory(initialPrice),
        lastUpdate: Date.now(),
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => {
                const newPrice = fluctuate(prev.price);
                const newPoint = {
                    time: prev.history.length,
                    value: newPrice,
                };

                // Keep last 60 points
                const newHistory = [...prev.history.slice(1), newPoint];

                return {
                    ...prev,
                    price: newPrice,
                    history: newHistory,
                    lastUpdate: Date.now(),
                };
            });
        }, 3000); // Update every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return data;
};

export const useTrafficData = () => {
    const [data, setData] = useState({
        visits: 1250,
        history: generateHistory(1200, 30),
        dailyHistory: generateDailyHistory(1200).map(d => ({ ...d, value: Math.floor(d.value) })),
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => {
                const newVisits = Math.floor(fluctuate(prev.visits, 0.05));
                const newPoint = {
                    time: prev.history.length,
                    value: newVisits,
                };

                return {
                    ...prev,
                    visits: newVisits,
                    history: [...prev.history.slice(1), newPoint],
                };
            });
        }, 5000); // Update every 5 seconds

        return () => clearInterval(interval);
    }, []);

    return data;
};
