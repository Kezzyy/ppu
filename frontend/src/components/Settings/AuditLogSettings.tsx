import { useEffect, useState } from 'react';
import { Search, Filter, Shield, Clock, HardDrive } from 'lucide-react';
import { auditService } from '../../services/api';
import { toast } from 'sonner';

interface AuditLog {
    id: string;
    action: string;
    target: string;
    details: string | null;
    ipAddress: string | null;
    createdAt: string;
    user: {
        username: string;
        avatar_url: string | null;
    } | null;
}

export default function AuditLogSettings() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await auditService.getLogs(page, 20, search, filterAction);
            setLogs(response.data);
            setTotalPages(response.pagination.pages);
        } catch (error) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchLogs();
        }, 500); // Debounce search
        return () => clearTimeout(timeout);
    }, [page, search, filterAction]);

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'text-red-400 bg-red-500/10 border-red-500/20';
        if (action.includes('CREATE') || action.includes('INSTALL')) return 'text-green-400 bg-green-500/10 border-green-500/20';
        if (action.includes('UPDATE')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    const formatDetails = (details: string | null) => {
        if (!details) return null;
        try {
            const parsed = JSON.parse(details);
            return (
                <div className="mt-1 text-xs text-gray-500 font-mono bg-black/20 p-1.5 rounded border border-gray-800/50 max-w-[300px] overflow-hidden whitespace-nowrap text-ellipsis">
                    {JSON.stringify(parsed)}
                </div>
            );
        } catch (e) {
            return <div className="mt-1 text-xs text-gray-500">{details}</div>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-400" /> Audit Log
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        View system events and user actions.
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="bg-[#0B0E14] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 appearance-none"
                        >
                            <option value="">All Actions</option>
                            <option value="USER_LOGIN">Logins</option>
                            <option value="PLUGIN_INSTALL">Installs</option>
                            <option value="PLUGIN_UPDATE">Updates</option>
                            <option value="PLUGIN_DELETE">Deletes</option>
                            <option value="USER_CREATE">User Create</option>
                            <option value="SERVER_SYNC">Server Sync</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading logs...</div>
            ) : (
                <div className="bg-[#0B0E14] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900/50 border-b border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-gray-400">Action</th>
                                    <th className="px-6 py-4 font-medium text-gray-400">User</th>
                                    <th className="px-6 py-4 font-medium text-gray-400">Target</th>
                                    <th className="px-6 py-4 font-medium text-gray-400">Date/IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-900/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.user ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                                        {log.user.avatar_url ? (
                                                            <img src={log.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            log.user.username.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="text-gray-300">{log.user.username}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 italic">System</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-300 font-medium">{log.target}</div>
                                            {formatDetails(log.details)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-xs text-gray-500 gap-1">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </div>
                                                {log.ipAddress && (
                                                    <div className="flex items-center gap-1 font-mono">
                                                        <HardDrive className="w-3 h-3" />
                                                        {log.ipAddress}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            No audit logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="border-t border-gray-800 px-6 py-4 flex justify-between items-center">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
