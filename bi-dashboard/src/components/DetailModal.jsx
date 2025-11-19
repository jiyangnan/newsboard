import React from 'react';
import { X, ArrowUp, ArrowDown } from 'lucide-react';

const DetailModal = ({ isOpen, onClose, title, data }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{title} - Daily History</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-lg"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-sm border-b border-gray-700">
                                <th className="pb-3 font-medium">Date</th>
                                <th className="pb-3 font-medium text-right">Value</th>
                                <th className="pb-3 font-medium text-right">Daily Change</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {data.map((item, index) => {
                                const isPositive = item.change >= 0;
                                return (
                                    <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                        <td className="py-3 text-gray-300">{item.date}</td>
                                        <td className="py-3 text-right text-white font-medium">
                                            {item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`py-3 text-right font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                            <div className="flex items-center justify-end gap-1">
                                                {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                                {Math.abs(item.change).toFixed(2)}%
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DetailModal;
