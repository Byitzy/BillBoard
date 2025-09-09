'use client';

import SharedSelect from '@/components/ui/SharedSelect';

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  email: string | null;
  created_at: string;
}

interface MemberListProps {
  members: Member[];
  currentUserId: string;
  onStatusChange: (memberId: string, newStatus: string) => void;
  onRoleChange: (memberId: string, newRole: string) => void;
  onRemoveMember: (memberId: string) => void;
}

const ROLE_LABELS = {
  admin: 'Admin',
  approver: 'Approver',
  accountant: 'Accountant',
  data_entry: 'Data Entry',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

export default function MemberList({
  members,
  currentUserId,
  onStatusChange,
  onRoleChange,
  onRemoveMember,
}: MemberListProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No members found matching your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Member
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Joined
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {member.email?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {member.email || 'Unknown'}
                    </div>
                    {member.user_id === currentUserId && (
                      <div className="text-sm text-gray-500">(You)</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="min-w-[120px]">
                  <SharedSelect
                    simple
                    simpleValue={member.role}
                    onSimpleChange={(newRole: string) =>
                      onRoleChange(member.id, newRole)
                    }
                    simpleOptions={Object.entries(ROLE_LABELS).map(
                      ([value, label]) => ({ value, label })
                    )}
                    className="text-sm"
                    disabled={member.user_id === currentUserId}
                  />
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="min-w-[100px]">
                  <SharedSelect
                    simple
                    simpleValue={member.status}
                    onSimpleChange={(newStatus: string) =>
                      onStatusChange(member.id, newStatus)
                    }
                    simpleOptions={Object.entries(STATUS_LABELS).map(
                      ([value, label]) => ({ value, label })
                    )}
                    className="text-sm"
                    disabled={member.user_id === currentUserId}
                  />
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(member.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {member.user_id !== currentUserId && (
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
