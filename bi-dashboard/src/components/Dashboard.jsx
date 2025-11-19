import React, { useState } from 'react';
import { LayoutDashboard, Globe, BarChart3 } from 'lucide-react';
import StockCard from './StockCard';
import TrafficCard from './TrafficCard';
import DetailModal from './DetailModal';

const Dashboard = () => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        data: []
    });

    const handleCardClick = ({ title, data }) => {
        setModalState({
            isOpen: true,
            title,
            data
        });
    };

    const closeModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <LayoutDashboard className="text-blue-500" />
                        Global Macro & Traffic Monitor
                    </h1>
                    <p className="text-gray-400 mt-1 ml-9 text-sm">Real-time BI Dashboard • v1.1</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        System Online
                    </div>
                    <div className="text-xs bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                        Last Sync: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Module 1: Nasdaq */}
                <StockCard
                    title="Nasdaq Composite"
                    symbol="IXIC"
                    initialPrice={14285.30}
                    onClick={handleCardClick}
                />

                {/* Module 2: A-Share (CSI 300) */}
                <StockCard
                    title="CSI 300 (A-Share)"
                    symbol="000300"
                    initialPrice={3568.12}
                    onClick={handleCardClick}
                />

                {/* Module 3: Google Traffic */}
                <TrafficCard
                    title="Google Search Traffic"
                    onClick={handleCardClick}
                />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Globe size={16} />
                        Global Market Status
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-700/50 p-4 rounded-lg">
                            <div className="text-xs text-gray-400">US Market</div>
                            <div className="text-green-400 font-medium mt-1">Open (Pre-market)</div>
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-lg">
                            <div className="text-xs text-gray-400">CN Market</div>
                            <div className="text-gray-400 font-medium mt-1">Closed</div>
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-lg">
                            <div className="text-xs text-gray-400">EU Market</div>
                            <div className="text-green-400 font-medium mt-1">Open</div>
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-lg">
                            <div className="text-xs text-gray-400">Forex (USD/CNY)</div>
                            <div className="text-white font-medium mt-1">7.1425</div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BarChart3 size={16} />
                        System Alerts
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-900/50 rounded-lg">
                            <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-yellow-500" />
                            <div>
                                <div className="text-yellow-400 text-sm font-medium">High Volatility Detected</div>
                                <div className="text-yellow-400/70 text-xs mt-0.5">Nasdaq volatility index (VIX) rose by 5% in the last hour.</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg">
                            <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-500" />
                            <div>
                                <div className="text-blue-400 text-sm font-medium">Traffic Spike</div>
                                <div className="text-blue-400/70 text-xs mt-0.5">Unusual traffic volume from region: North America.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DetailModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                title={modalState.title}
                data={modalState.data}
            />
        </div>
    );
};

export default Dashboard;
