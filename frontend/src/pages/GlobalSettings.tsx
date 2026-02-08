import { useState } from 'react';
import { Settings, Users, Shield, Webhook } from 'lucide-react';
import WebhookSettings from '../components/Settings/WebhookSettings';
import UserSettings from '../components/Settings/UserSettings'; // Assuming this component exists
import AuditLogSettings from '../components/Settings/AuditLogSettings';
import { useAuthStore } from '../store/auth.store';

const GlobalSettings = () => {
    // Updated state type to include 'audit'
    const [activeTab, setActiveTab] = useState<'webhooks' | 'users' | 'audit'>('webhooks');
    const user = useAuthStore(state => state.user);
    const isAdmin = (typeof user?.role === 'string' ? user.role : (user?.role as any)?.name)?.toUpperCase() === 'ADMIN';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white gap-2 flex items-center">
                    <Settings className="w-8 h-8 text-blue-500" />
                    Settings
                </h2>
                <p className="text-gray-400 mt-1">Manage global configurations for your Pterodactyl instance.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Settings Sidebar */}
                <div className="w-full md:w-64 space-y-2">
                    <button
                        onClick={() => setActiveTab('webhooks')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center gap-3 ${activeTab === 'webhooks'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                    >
                        <Webhook className="w-4 h-4" /> Webhooks
                    </button>
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center gap-3 ${activeTab === 'users'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    }`}
                            >
                                <Users className="w-4 h-4" /> Users
                            </button>
                            <button
                                onClick={() => setActiveTab('audit')}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center gap-3 ${activeTab === 'audit'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    }`}
                            >
                                <Shield className="w-4 h-4" /> Audit Logs
                            </button>
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="bg-[#0F1219] border border-gray-800 rounded-2xl p-6 shadow-sm">
                        {activeTab === 'webhooks' && <WebhookSettings />}
                        {activeTab === 'users' && <UserSettings />}
                        {activeTab === 'audit' && <AuditLogSettings />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSettings;
