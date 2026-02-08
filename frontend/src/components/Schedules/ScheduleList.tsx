import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Calendar, Clock, RotateCw } from 'lucide-react';
import { scheduleService } from '../../services/api';
import type { Schedule } from '../../types/entities';
import { toast } from 'sonner';

const ScheduleList: React.FC = () => {
    const { serverId } = useParams<{ serverId: string }>();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New schedule state
    const [newName, setNewName] = useState('');
    const [newCron, setNewCron] = useState('0 0 * * *');
    const [taskType, setTaskType] = useState<'UPDATE_ALL' | 'BACKUP_ALL' | 'RESTART_SERVER'>('UPDATE_ALL');

    const fetchSchedules = async () => {
        if (!serverId) return;
        try {
            setLoading(true);
            const data = await scheduleService.getAll(serverId);
            setSchedules(data);
        } catch (error) {
            toast.error('Failed to load schedules');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, [serverId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serverId) return;

        try {
            await scheduleService.create(serverId, {
                name: newName,
                cron_expression: newCron,
                task_type: taskType
            });
            toast.success('Schedule created');
            setIsCreating(false);
            setNewName('');
            fetchSchedules();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create schedule');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this schedule?')) return;
        try {
            await scheduleService.delete(id);
            toast.success('Schedule deleted');
            setSchedules(schedules.filter(s => s.id !== id));
        } catch (error) {
            toast.error('Failed to delete schedule');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> Scheduled Tasks
                </h2>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition-colors"
                >
                    <Plus className="w-4 h-4" /> New Schedule
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Daily Update"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Cron Expression</label>
                            <input
                                type="text"
                                required
                                value={newCron}
                                onChange={(e) => setNewCron(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                                placeholder="0 0 * * *"
                            />
                            <p className="text-xs text-gray-500 mt-1">Example: 0 3 * * * (Every day at 3 AM)</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Task Type</label>
                            <select
                                value={taskType}
                                onChange={(e) => setTaskType(e.target.value as any)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="UPDATE_ALL">Update All Plugins</option>
                                <option value="RESTART_SERVER">Restart Server</option>
                                <option value="BACKUP_ALL" disabled>Backup All (Coming Soon)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-3 py-1.5 text-gray-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white"
                        >
                            Create Schedule
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading schedules...</div>
            ) : schedules.length === 0 ? (
                <div className="text-center py-8 bg-gray-800/50 rounded-lg border border-dashed border-gray-700 text-gray-400">
                    No scheduled tasks found.
                </div>
            ) : (
                <div className="grid gap-4">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center group">
                            <div>
                                <h3 className="font-medium text-white flex items-center gap-2">
                                    {schedule.name}
                                    {!schedule.is_active && <span className="text-xs bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded">Disabled</span>}
                                </h3>
                                <div className="text-sm text-gray-400 flex items-center gap-4 mt-1">
                                    <span className="flex items-center gap-1 font-mono bg-gray-900 px-1.5 rounded text-xs">
                                        <Clock className="w-3 h-3" /> {schedule.cron_expression}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <RotateCw className="w-3 h-3" /> {schedule.task_type}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Last run: {schedule.last_run ? new Date(schedule.last_run).toLocaleString() : 'Never'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDelete(schedule.id)}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                                    title="Delete Schedule"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScheduleList;
