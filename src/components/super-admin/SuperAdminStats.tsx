"use client";
import { motion } from 'framer-motion';
import { Building2, Users, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = {
  totalOrgs: number;
  totalUsers: number;
  activeMembers: number;
};

export default function SuperAdminStats({ totalOrgs, totalUsers, activeMembers }: Props) {
  const router = useRouter();

  const stats = [
    {
      name: 'Organizations',
      value: totalOrgs,
      icon: Building2,
      href: '/super-admin/organizations' as any,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900'
    },
    {
      name: 'Total Users',
      value: totalUsers,
      icon: Users,
      href: '/super-admin/users' as any,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900'
    },
    {
      name: 'Active Members',
      value: activeMembers,
      icon: UserCheck,
      href: '/super-admin/organizations' as any,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            onClick={() => router.push(stat.href as any)}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${stat.bgGradient} p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border border-white/20 dark:border-gray-800/20`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-white/5 dark:bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-200" />
          </motion.div>
        );
      })}
    </div>
  );
}