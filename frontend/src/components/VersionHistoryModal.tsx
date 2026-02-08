import { useState, useEffect } from 'react';
import { serverService } from '../services/api';
import type { PluginVersion } from '../types/entities';
import { Button } from './ui/button';
import { Loader2, History, RotateCcw, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface VersionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    pluginId: string;
    pluginName: string;
    currentVersion: string;
    onRollbackSuccess: () => void;
}

const VersionHistoryModal = ({ isOpen, onClose, pluginId, pluginName, currentVersion, onRollbackSuccess }: VersionHistoryModalProps) => {
    const [versions, setVersions] = useState<PluginVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [rollingBackId, setRollingBackId] = useState<string | null>(null);

    // Fetch versions when modal opens
    useEffect(() => {
        if (isOpen && pluginId) {
            fetchVersions();
        }
    }, [isOpen, pluginId]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const fetchVersions = async () => {
        try {
            setLoading(true);
            const response = await serverService.getVersions(pluginId);
            setVersions(response.data);
        } catch (error) {
            console.error('Failed to fetch versions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRollback = async (version: PluginVersion) => {
        if (!confirm(`Are you sure you want to rollback to version ${version.version}? Current version will be overwritten.`)) {
            return;
        }

        try {
            setRollingBackId(version.id);
            await serverService.rollbackVersion(version.id);
            onRollbackSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to rollback', error);
            // Optionally show error toast
        } finally {
            setRollingBackId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-[#1a1b1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#25262b]">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-purple-400" />
                        Version History: <span className="text-gray-400 font-mono text-sm">{pluginName}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4 bg-[#141517] flex-1 min-h-[200px]">
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-200">
                            <p className="font-medium mb-1">About Rollbacks</p>
                            <p className="text-blue-200/80">
                                Rolling back will replace the current plugin file with the selected backup.
                                The server requires a restart for changes to take effect.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Loader2 className="h-8 w-8 animate-spin mb-3 text-purple-500" />
                            <p>Loading history...</p>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p>No backups found for this plugin.</p>
                            <p className="text-xs mt-1">Backups are created automatically before updates.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {versions.map((version) => {
                                const isCurrent = version.version === currentVersion;
                                return (
                                    <div key={version.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-medium text-white">{version.version}</span>
                                                {isCurrent && (
                                                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">
                                                        CURRENT
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(version.created_at), 'MMM d, yyyy HH:mm')}
                                                </span>
                                                <span>{(version.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                        </div>

                                        {!isCurrent && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-colors"
                                                onClick={() => handleRollback(version)}
                                                disabled={!!rollingBackId}
                                            >
                                                {rollingBackId === version.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <RotateCcw className="w-3 h-3 mr-2" />
                                                        Rollback
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VersionHistoryModal;
