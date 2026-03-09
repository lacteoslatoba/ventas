import React from 'react';
import { useStore } from '../store';
import { Package, Users as UsersIcon, Store, ShoppingCart, TrendingUp, Activity, ShoppingBag } from 'lucide-react';

export default function Dashboard() {
    const { products, users, clients, sales } = useStore();

    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);

    const stats = [
        { label: 'Ventas Totales', value: `$${totalSales.toFixed(2)}`, icon: TrendingUp, color: 'text-[#1152d4] bg-[#1152d4]/10', trend: '+15%' },
        { label: 'Productos en Stock', value: totalStock, icon: Package, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
        { label: 'Repartidores', value: users.length, icon: UsersIcon, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
        { label: 'Clientes', value: clients.length, icon: Store, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
        { label: 'Tickets Emitidos', value: sales.length, icon: ShoppingCart, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    ];

    return (
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in duration-500 font-sans">
            <div className="flex flex-col gap-6">
                {/* Title Section */}
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Panel de Control</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Resumen general de tu negocio hoy.</p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {stats.map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 transition-transform hover:scale-[1.02]">
                                <div className="flex items-center justify-between">
                                    <span className={`p-2 rounded-lg ${stat.color}`}>
                                        <Icon size={24} />
                                    </span>
                                    {stat.trend && (
                                        <span className="text-green-600 dark:text-green-400 text-sm font-semibold flex items-center gap-1">
                                            <TrendingUp size={16} />
                                            {stat.trend}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stat.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Secondary Section */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Latest Sales Table */}
                    <div className="lg:col-span-2">
                        <h3 className="text-lg font-bold mb-4 text-slate-900">Últimas Ventas</h3>
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden h-full min-h-[300px]">
                            {sales.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 flex-1">
                                    <ShoppingBag size={48} className="text-slate-300 mb-4" />
                                    <p>No hay ventas registradas aún.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto p-4 md:p-6">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                                <th className="py-3 px-4 text-slate-500 font-medium text-sm">Fecha</th>
                                                <th className="py-3 px-4 text-slate-500 font-medium text-sm">Repartidor</th>
                                                <th className="py-3 px-4 text-slate-500 font-medium text-sm text-center">Artículos</th>
                                                <th className="py-3 px-4 text-slate-500 font-medium text-sm text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sales.slice(-5).reverse().map((sale) => {
                                                const user = users.find(u => u.id === sale.userId);
                                                return (
                                                    <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{new Date(sale.date).toLocaleDateString()}</td>
                                                        <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{sale.userId === 'admin' ? 'Administrador' : (user?.name || 'Desconocido')}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 text-center">
                                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full text-xs font-semibold">
                                                                {sale.items.reduce((s, i) => s + Number(i.quantity), 0)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm font-bold text-right text-slate-900 dark:text-white">${sale.total.toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Insights Block */}
                    <div className="lg:col-span-1">
                        <h3 className="text-lg font-bold mb-4 text-slate-900">Métricas de Hoy</h3>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center shadow-sm h-full min-h-[300px]">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Activity className="text-slate-400" size={32} />
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">Preparando reporte detallado de métricas diarias...</p>
                            <div className="mt-6 w-full max-w-xs h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-[#1152d4] w-2/3 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
