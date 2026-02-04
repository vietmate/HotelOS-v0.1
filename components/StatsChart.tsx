import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Room, RoomStatus } from '../types';
import { translations, Language } from '../translations';

interface StatsChartProps {
  rooms: Room[];
  lang: Language;
}

export const StatsChart: React.FC<StatsChartProps> = ({ rooms, lang }) => {
  const t = translations[lang];

  const data = [
    { name: t.status[RoomStatus.AVAILABLE], value: rooms.filter(r => r.status === RoomStatus.AVAILABLE).length, color: '#10b981' },
    { name: t.status[RoomStatus.OCCUPIED], value: rooms.filter(r => r.status === RoomStatus.OCCUPIED).length, color: '#3b82f6' },
    { name: t.status[RoomStatus.DIRTY], value: rooms.filter(r => r.status === RoomStatus.DIRTY).length, color: '#f59e0b' },
    { name: t.status[RoomStatus.MAINTENANCE], value: rooms.filter(r => r.status === RoomStatus.MAINTENANCE).length, color: '#ef4444' },
  ];

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 35, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} interval={0} />
          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList dataKey="value" position="right" style={{ fill: '#64748b', fontSize: '11px', fontWeight: '600' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};